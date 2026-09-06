"""FastAPI application — internal API for AI News workers."""
import logging
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated, Literal, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from workers.src.api.ingest import require_ingest_token
from workers.src.api.ingest import router as ingest_router
from workers.src.collectors.rss_collector import seed_default_sources
from workers.src.config import settings
from workers.src.models.article import (
    Article,
    NotificationLog,
    Source,
    User,
    UserPreferences,
    get_session_factory,
    create_tables,
    get_db,
)
from workers.src.notifiers.email import send_email
from workers.src.notifiers.veille import (
    Recipient,
    merge_recipients,
    platform_recipients,
    send_veille,
)
from workers.src.notifiers.whatsapp import send_digest, send_digest_to_user
from workers.src.processors.pipeline import process_unprocessed_articles
from workers.src.scheduler.jobs import (
    run_collection_job,
    run_digest_dispatcher,
    run_weekly_digest_dispatcher,
)

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

scheduler = BackgroundScheduler()

# Type alias for dependency injection
DbSession = Annotated[Session, Depends(get_db)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — setup and teardown."""
    # Startup
    create_tables()
    logger.info("Database tables created/verified")

    # Seed default sources
    db = get_session_factory()()
    try:
        seed_default_sources(db)
    finally:
        db.close()

    # Schedule jobs
    scheduler.add_job(
        run_collection_job,
        "interval",
        hours=settings.collection_interval_hours,
        id="collection",
        name="Collect articles from all sources",
    )
    # Digest dispatcher — runs every 30 min, sends to users whose time matches
    scheduler.add_job(
        run_digest_dispatcher,
        "interval",
        minutes=30,
        id="digest_dispatcher",
        name="Dispatch per-user daily digests",
    )
    scheduler.add_job(
        run_weekly_digest_dispatcher,
        "cron",
        day_of_week="mon",
        hour=6,  # Early UTC — dispatcher handles per-user timezones
        minute=0,
        id="weekly_digest",
        name="Dispatch per-user weekly digests",
    )
    scheduler.start()
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))

    yield

    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler shut down")


app = FastAPI(
    title="AI News Workers API",
    description="Internal API for AI news collection, processing, and notification",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(ingest_router)


# ── Health ──


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scheduler_running": scheduler.running,
        "jobs": len(scheduler.get_jobs()),
    }


# ── Articles ──


def published_window(
    date_from: Optional[date], date_to: Optional[date], tz_offset: int
) -> tuple[Optional[datetime], Optional[datetime]]:
    """Convert inclusive local calendar dates into a naive-UTC [start, end) window.

    ``tz_offset`` is the viewer's offset from UTC in minutes (e.g. 180 for Riyadh),
    so "today" means the viewer's day, not the server's.
    """
    offset = timedelta(minutes=tz_offset)
    start = datetime.combine(date_from, time.min) - offset if date_from else None
    end = datetime.combine(date_to + timedelta(days=1), time.min) - offset if date_to else None
    return start, end


@app.get("/articles")
def list_articles(
    db: DbSession,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    min_score: Annotated[float, Query(ge=0, le=10)] = 0.0,
    source_type: Optional[str] = None,
    date_from: Annotated[Optional[date], Query(description="Inclusive local date YYYY-MM-DD")] = None,
    date_to: Annotated[Optional[date], Query(description="Inclusive local date YYYY-MM-DD")] = None,
    tz_offset: Annotated[int, Query(ge=-840, le=840, description="Viewer UTC offset in minutes")] = 0,
    sort: Annotated[Literal["score", "date"], Query()] = "score",
):
    """List collected articles, ordered by score (default) or by publication date."""
    query = db.query(Article).filter(Article.score >= min_score)

    if source_type:
        query = query.filter(Article.source_type == source_type)

    start, end = published_window(date_from, date_to, tz_offset)
    if start is not None:
        query = query.filter(Article.published_at >= start)
    if end is not None:
        query = query.filter(Article.published_at < end)

    if sort == "date":
        ordering = (Article.published_at.desc(), Article.score.desc())
    else:
        ordering = (Article.score.desc(), Article.published_at.desc())

    articles = query.order_by(*ordering).offset(skip).limit(limit).all()
    total = query.count()

    return {
        "articles": [
            {
                "id": a.id,
                "title": a.title_fr or a.original_title,
                "original_title": a.original_title,
                "summary": a.summary_fr,
                "title_en": a.title_en,
                "summary_en": a.summary_en,
                "title_ar": a.title_ar,
                "summary_ar": a.summary_ar,
                "url": a.url,
                "thumbnail_url": a.thumbnail_url,
                "video_url": a.video_url,
                "source_type": a.source_type,
                "score": a.score,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "notified": a.notified,
            }
            for a in articles
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@app.get("/articles/{article_id}")
def get_article(article_id: str, db: DbSession):
    """Get a single article by ID."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        return {"error": "Article not found"}, 404

    return {
        "id": article.id,
        "original_title": article.original_title,
        "title_fr": article.title_fr,
        "title_en": article.title_en,
        "title_ar": article.title_ar,
        "original_content": article.original_content,
        "summary_fr": article.summary_fr,
        "summary_en": article.summary_en,
        "summary_ar": article.summary_ar,
        "url": article.url,
        "thumbnail_url": article.thumbnail_url,
        "video_url": article.video_url,
        "source_type": article.source_type,
        "score": article.score,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "collected_at": article.collected_at.isoformat() if article.collected_at else None,
        "notified": article.notified,
        "content_hash": article.content_hash,
    }


# ── Sources ──


@app.get("/sources")
def list_sources(db: DbSession):
    """List all configured sources."""
    sources = db.query(Source).all()
    return {
        "sources": [
            {
                "id": s.id,
                "name": s.name,
                "type": s.type,
                "url": s.url,
                "active": s.active,
                "last_collected": s.last_collected.isoformat() if s.last_collected else None,
            }
            for s in sources
        ],
    }


# ── Manual Triggers ──


@app.post("/collect/now")
def trigger_collection():
    """Trigger a manual collection."""
    scheduler.add_job(run_collection_job, id="manual_collection", replace_existing=True)
    return {"status": "Collection job triggered"}


@app.post("/process/now")
async def trigger_processing(db: DbSession):
    """Trigger manual processing of unprocessed articles."""
    processed = await process_unprocessed_articles(db)
    return {"status": "ok", "processed": len(processed)}


@app.post("/process/reprocess-all")
async def reprocess_all_articles(db: DbSession):
    """Reprocess articles missing EN/AR translations."""
    from sqlalchemy import or_
    articles = (
        db.query(Article)
        .filter(
            Article.summary_fr != None,  # noqa: E711
            Article.summary_fr != "",
            or_(Article.summary_en == None, Article.summary_ar == None),  # noqa: E711
        )
        .all()
    )
    if not articles:
        return {"status": "ok", "reprocessed": 0, "message": "All articles already have 3 languages"}

    # Reset summaries to trigger reprocessing
    for article in articles:
        article.summary_fr = ""
        article.title_fr = None
    db.commit()

    processed = await process_unprocessed_articles(db)
    return {"status": "ok", "reprocessed": len(processed)}


class EmailRequest(BaseModel):
    """Transactional email relayed through Resend (used by the daily veille agent)."""

    to: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=320)
    subject: str = Field(min_length=1, max_length=300)
    html: str = Field(min_length=1, max_length=500_000)


@app.post("/notify/email", dependencies=[Depends(require_ingest_token)])
async def send_transactional_email(payload: EmailRequest):
    """Send one HTML email via Resend (authenticated with X-Ingest-Token).

    Lets automation that has no mail connector (e.g. a Claude Routine in a cloud
    environment) deliver the daily recap. Returns 503 when Resend is not configured.
    """
    if not settings.resend_api_key:
        raise HTTPException(status_code=503, detail="RESEND_API_KEY not configured")
    sent = await send_email(payload.to, payload.subject, payload.html)
    if not sent:
        raise HTTPException(status_code=502, detail="Resend rejected the email (see server logs)")
    return {"status": "sent", "to": payload.to}


class VeilleRecipient(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=320)
    language: Literal["fr", "en", "ar"] = "fr"


class VeilleRequest(BaseModel):
    """Daily recap request sent by the veille agent after ingestion."""

    article_ids: list[str] = Field(min_length=1, max_length=200)
    inserted_count: int = Field(default=0, ge=0)
    skipped_count: int = Field(default=0, ge=0)
    day: Optional[date] = None
    extra_recipients: list[VeilleRecipient] = Field(default_factory=list)
    dry_run: bool = False


@app.post("/notify/veille", dependencies=[Depends(require_ingest_token)])
async def send_veille_recap(payload: VeilleRequest, db: DbSession):
    """Send the daily recap to every opted-in user in their own language (FR/EN/AR).

    Recipients are the platform users with email notifications enabled (language from
    their preferences), plus optional extra recipients. Each recipient gets one email
    rendered in their language with platform links. Use ``dry_run`` to preview the
    recipient breakdown without sending.
    """
    if not settings.resend_api_key and not payload.dry_run:
        raise HTTPException(status_code=503, detail="RESEND_API_KEY not configured")

    articles = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(Article.id.in_(payload.article_ids))
        .all()
    )
    if not articles:
        raise HTTPException(status_code=404, detail="None of the article_ids exist")

    recipients = merge_recipients(
        platform_recipients(db),
        [Recipient(email=r.email, language=r.language) for r in payload.extra_recipients],
    )
    if not recipients:
        return {"status": "no_recipients", "articles": len(articles), "recipients": 0}

    result = await send_veille(
        db,
        articles,
        recipients,
        payload.day or datetime.now(timezone.utc).date(),
        payload.inserted_count,
        payload.skipped_count,
        dry_run=payload.dry_run,
    )
    result["missing_article_ids"] = sorted(set(payload.article_ids) - {a.id for a in articles})
    return result


@app.post("/notify/digest")
async def trigger_digest(db: DbSession):
    """Trigger a manual digest send (legacy single-recipient)."""
    success = await send_digest(db, digest_type="quotidien")
    return {"status": "sent" if success else "no_articles_or_failed"}


@app.post("/notify/digest/{user_id}")
async def trigger_user_digest(user_id: str, db: DbSession):
    """Trigger a manual digest send for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}, 404

    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not prefs:
        return {"error": "User has no preferences configured"}, 400

    if not prefs.whatsapp_number:
        return {"error": "User has no WhatsApp number configured"}, 400

    success = await send_digest_to_user(db, user, prefs, digest_type="quotidien")
    return {"status": "sent" if success else "no_articles_or_failed", "user_id": user_id}


# ── Stats ──


@app.get("/stats")
def get_stats(db: DbSession):
    """Get collection and notification statistics with daily trends."""
    from datetime import timedelta

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    total_articles = db.query(Article).count()
    notified_articles = db.query(Article).filter(Article.notified == True).count()  # noqa: E712
    active_sources = db.query(Source).filter(Source.active == True).count()  # noqa: E712
    total_notifications = db.query(NotificationLog).count()
    successful_notifications = (
        db.query(NotificationLog).filter(NotificationLog.success == True).count()  # noqa: E712
    )

    # Trend: today vs yesterday counts
    articles_today = (
        db.query(Article).filter(Article.collected_at >= today_start).count()
    )
    articles_yesterday = (
        db.query(Article)
        .filter(Article.collected_at >= yesterday_start, Article.collected_at < today_start)
        .count()
    )

    notifs_today = (
        db.query(NotificationLog).filter(NotificationLog.sent_at >= today_start).count()
    )
    notifs_yesterday = (
        db.query(NotificationLog)
        .filter(NotificationLog.sent_at >= yesterday_start, NotificationLog.sent_at < today_start)
        .count()
    )

    successful_today = (
        db.query(NotificationLog)
        .filter(NotificationLog.sent_at >= today_start, NotificationLog.success == True)  # noqa: E712
        .count()
    )
    successful_yesterday = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.sent_at >= yesterday_start,
            NotificationLog.sent_at < today_start,
            NotificationLog.success == True,  # noqa: E712
        )
        .count()
    )

    def calc_trend(today_val: int, yesterday_val: int) -> float | None:
        if yesterday_val == 0:
            return None
        return round(((today_val - yesterday_val) / yesterday_val) * 100, 1)

    return {
        "total_articles": total_articles,
        "notified_articles": notified_articles,
        "active_sources": active_sources,
        "total_notifications": total_notifications,
        "successful_notifications": successful_notifications,
        "trends": {
            "articles": calc_trend(articles_today, articles_yesterday),
            "notifications": calc_trend(notifs_today, notifs_yesterday),
            "successful": calc_trend(successful_today, successful_yesterday),
        },
        "updated_at": now.isoformat(),
    }
