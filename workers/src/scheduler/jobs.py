"""Scheduler jobs — cron-based task execution with multi-user support."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone as tz

import pytz
from sqlalchemy.orm import joinedload

from workers.src.collectors.rss_collector import collect_all_rss
from workers.src.collectors.twitter_collector import collect_twitter
from workers.src.collectors.youtube_collector import collect_youtube
from workers.src.collectors.reddit_collector import collect_reddit
from workers.src.collectors.arxiv_collector import collect_arxiv
from workers.src.config import settings
from workers.src.models.article import (
    Article,
    User,
    UserPreferences,
    get_session_factory,
)
from workers.src.notifiers.whatsapp import (
    send_breaking_news_alert,
    send_digest_to_user,
    send_digest,
)
from workers.src.processors.pipeline import process_unprocessed_articles

logger = logging.getLogger(__name__)

_DEFAULT_DIGEST_HOUR = 8
_DEFAULT_DIGEST_MINUTE = 0
_DEFAULT_TIMEZONE = "Europe/Paris"


def _parse_digest_time(digest_time: str | None) -> tuple[int, int]:
    """Parse a HH:MM digest time string into (hour, minute).

    Returns defaults (08:00) if parsing fails.
    """
    try:
        parts = (digest_time or "").split(":")
        return int(parts[0]), int(parts[1])
    except (ValueError, IndexError, AttributeError):
        return _DEFAULT_DIGEST_HOUR, _DEFAULT_DIGEST_MINUTE


def _get_user_timezone(timezone_str: str | None) -> pytz.BaseTzInfo:
    """Resolve a timezone string to a pytz timezone, falling back to default."""
    _fallback = pytz.timezone(_DEFAULT_TIMEZONE)
    try:
        return pytz.timezone(timezone_str or _DEFAULT_TIMEZONE)
    except pytz.exceptions.UnknownTimeZoneError:
        return _fallback


def _is_subscription_active(user: User) -> bool:
    """Check if a user's subscription allows receiving digests.

    Users without a subscription (free tier) are always eligible.
    """
    if not user.subscription:
        return True
    return user.subscription.status in ("active", "trialing")


def _is_user_eligible_for_digest(user: User, now_utc: datetime) -> bool:
    """Check if a user should receive a digest right now.

    Checks subscription status and whether the current UTC time falls
    within the user's preferred digest hour (30-minute window).
    """
    if not user.preferences:
        return False

    if not _is_subscription_active(user):
        return False

    digest_hour, _ = _parse_digest_time(user.preferences.digest_time)
    user_tz = _get_user_timezone(user.preferences.timezone)
    user_now = now_utc.astimezone(user_tz)

    return user_now.hour == digest_hour and user_now.minute < 30


def _query_digest_users(db: "Session") -> list[User]:
    """Query all users with digest enabled and a WhatsApp number configured."""
    return (
        db.query(User)
        .join(UserPreferences)
        .options(
            joinedload(User.preferences).joinedload(UserPreferences.categories),
            joinedload(User.preferences).joinedload(UserPreferences.sources),
            joinedload(User.subscription),
        )
        .filter(UserPreferences.digest_enabled == True)  # noqa: E712
        .filter(UserPreferences.whatsapp_number != None)  # noqa: E711
        .all()
    )


async def _collect_all_sources(db) -> list[Article]:
    """Run all collectors (RSS + async sources)."""
    all_articles: list[Article] = []

    # RSS (synchronous)
    rss_articles = collect_all_rss(db, max_age_hours=settings.max_article_age_hours)
    all_articles.extend(rss_articles)
    logger.info("RSS: %d articles", len(rss_articles))

    # Async collectors — run in parallel
    results = await asyncio.gather(
        collect_twitter(db),
        collect_youtube(db),
        collect_reddit(db),
        collect_arxiv(db),
        return_exceptions=True,
    )

    source_names = ["Twitter", "YouTube", "Reddit", "Arxiv"]
    for name, result in zip(source_names, results):
        if isinstance(result, Exception):
            logger.error("%s collector failed: %s", name, result)
        else:
            all_articles.extend(result)
            logger.info("%s: %d articles", name, len(result))

    return all_articles


def run_collection_job() -> None:
    """Collect articles from all active sources."""
    logger.info("=== Starting collection job at %s ===", datetime.now().isoformat())
    db = get_session_factory()()

    try:
        articles = asyncio.run(_collect_all_sources(db))
        logger.info("Collection complete: %d new articles from all sources", len(articles))

        # Process collected articles
        if articles:
            processed = asyncio.run(process_unprocessed_articles(db))
            logger.info("Processing complete: %d articles processed", len(processed))

            # Check for breaking news — multi-user aware
            for article in processed:
                if article.score >= 8.0:  # Lower threshold — per-user filtering handles the rest
                    asyncio.run(send_breaking_news_alert(article, db))

    except Exception:
        logger.exception("Collection job failed")
    finally:
        db.close()


def run_digest_dispatcher() -> None:
    """Dispatch daily digests to users whose preferred time matches the current hour.

    This runs every 30 minutes. For each user, it checks:
    1. Is digest_enabled?
    2. Does user's digest_time (in their timezone) match the current time?
    3. Has the user already received a digest today?

    If no users exist in DB, falls back to legacy single-recipient behavior.
    """
    logger.info("=== Digest dispatcher running at %s ===", datetime.now().isoformat())
    db = get_session_factory()()

    try:
        if db.query(User).count() == 0:
            asyncio.run(send_digest(db, digest_type="quotidien"))
            return

        users = _query_digest_users(db)
        now_utc = datetime.now(tz.utc)
        sent_count = 0

        for user in users:
            if not _is_user_eligible_for_digest(user, now_utc):
                continue

            success = asyncio.run(
                send_digest_to_user(db, user, user.preferences, digest_type="quotidien")
            )
            if success:
                sent_count += 1

        logger.info("Digest dispatcher: sent to %d/%d eligible users", sent_count, len(users))

    except Exception:
        logger.exception("Digest dispatcher failed")
    finally:
        db.close()


def _query_weekly_digest_users(db: "Session") -> list[User]:
    """Query all users with weekly digest enabled and a WhatsApp number configured."""
    return (
        db.query(User)
        .join(UserPreferences)
        .options(
            joinedload(User.preferences).joinedload(UserPreferences.categories),
            joinedload(User.preferences).joinedload(UserPreferences.sources),
            joinedload(User.subscription),
        )
        .filter(UserPreferences.weekly_digest_enabled == True)  # noqa: E712
        .filter(UserPreferences.whatsapp_number != None)  # noqa: E711
        .all()
    )


def run_weekly_digest_dispatcher() -> None:
    """Dispatch weekly digests to users with weekly_digest_enabled."""
    logger.info("=== Weekly digest dispatcher running at %s ===", datetime.now().isoformat())
    db = get_session_factory()()

    try:
        if db.query(User).count() == 0:
            asyncio.run(
                send_digest(
                    db,
                    max_articles=settings.max_articles_weekly,
                    digest_type="hebdomadaire",
                )
            )
            return

        users = _query_weekly_digest_users(db)
        sent_count = 0

        for user in users:
            if not user.preferences or not _is_subscription_active(user):
                continue

            success = asyncio.run(
                send_digest_to_user(
                    db, user, user.preferences,
                    max_articles=settings.max_articles_weekly,
                    digest_type="hebdomadaire",
                )
            )
            if success:
                sent_count += 1

        logger.info("Weekly digest: sent to %d/%d users", sent_count, len(users))

    except Exception:
        logger.exception("Weekly digest dispatcher failed")
    finally:
        db.close()


def run_process_job() -> None:
    """Process any unprocessed articles."""
    logger.info("=== Starting processing job at %s ===", datetime.now().isoformat())
    db = get_session_factory()()

    try:
        processed = asyncio.run(process_unprocessed_articles(db))
        logger.info("Processing complete: %d articles", len(processed))
    except Exception:
        logger.exception("Processing job failed")
    finally:
        db.close()
