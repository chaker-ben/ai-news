"""FastAPI application — internal API for AI News workers."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, Query
from sqlalchemy.orm import Session

from workers.src.collectors.rss_collector import seed_default_sources
from workers.src.config import settings
from workers.src.models.article import (
    Article,
    NotificationLog,
    Source,
    get_session_factory,
    create_tables,
    get_db,
)
from workers.src.notifiers.whatsapp import send_digest
from workers.src.processors.pipeline import process_unprocessed_articles
from workers.src.scheduler.jobs import (
    run_collection_job,
    run_digest_job,
    run_weekly_digest_job,
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

    # Parse digest time
    digest_hour, digest_minute = settings.digest_time.split(":")

    # Schedule jobs
    scheduler.add_job(
        run_collection_job,
        "interval",
        hours=settings.collection_interval_hours,
        id="collection",
        name="Collect articles from all sources",
    )
    scheduler.add_job(
        run_digest_job,
        "cron",
        hour=int(digest_hour),
        minute=int(digest_minute),
        id="daily_digest",
        name="Send daily WhatsApp digest",
    )
    scheduler.add_job(
        run_weekly_digest_job,
        "cron",
        day_of_week="mon",
        hour=9,
        minute=0,
        id="weekly_digest",
        name="Send weekly WhatsApp digest",
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


@app.get("/articles")
def list_articles(
    db: DbSession,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    min_score: Annotated[float, Query(ge=0, le=10)] = 0.0,
    source_type: str | None = None,
):
    """List collected articles, ordered by score."""
    query = db.query(Article).filter(Article.score >= min_score)

    if source_type:
        query = query.filter(Article.source_type == source_type)

    articles = query.order_by(Article.score.desc()).offset(skip).limit(limit).all()
    total = query.count()

    return {
        "articles": [
            {
                "id": a.id,
                "title": a.title_fr or a.original_title,
                "original_title": a.original_title,
                "summary": a.summary_fr,
                "url": a.url,
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
        "original_content": article.original_content,
        "summary_fr": article.summary_fr,
        "url": article.url,
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


@app.post("/notify/digest")
async def trigger_digest(db: DbSession):
    """Trigger a manual digest send."""
    success = await send_digest(db, digest_type="quotidien")
    return {"status": "sent" if success else "no_articles_or_failed"}


# ── Stats ──


@app.get("/stats")
def get_stats(db: DbSession):
    """Get collection and notification statistics."""
    total_articles = db.query(Article).count()
    notified_articles = db.query(Article).filter(Article.notified == True).count()  # noqa: E712
    active_sources = db.query(Source).filter(Source.active == True).count()  # noqa: E712
    total_notifications = db.query(NotificationLog).count()
    successful_notifications = (
        db.query(NotificationLog).filter(NotificationLog.success == True).count()  # noqa: E712
    )

    return {
        "total_articles": total_articles,
        "notified_articles": notified_articles,
        "active_sources": active_sources,
        "total_notifications": total_notifications,
        "successful_notifications": successful_notifications,
    }
