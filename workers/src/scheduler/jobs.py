"""Scheduler jobs — cron-based task execution."""

import asyncio
import logging
from datetime import datetime

from workers.src.collectors.rss_collector import collect_all_rss
from workers.src.config import settings
from workers.src.models.article import Article, get_session_factory
from workers.src.notifiers.whatsapp import send_breaking_news_alert, send_digest
from workers.src.processors.pipeline import process_unprocessed_articles

logger = logging.getLogger(__name__)


def run_collection_job() -> None:
    """Collect articles from all active sources."""
    logger.info("=== Starting collection job at %s ===", datetime.now().isoformat())
    db = get_session_factory()()

    try:
        articles = collect_all_rss(db, max_age_hours=settings.max_article_age_hours)
        logger.info("Collection complete: %d new articles", len(articles))

        # Process collected articles
        if articles:
            processed = asyncio.run(process_unprocessed_articles(db))
            logger.info("Processing complete: %d articles processed", len(processed))

            # Check for breaking news
            for article in processed:
                if article.score >= settings.min_score_alert and not article.notified:
                    asyncio.run(send_breaking_news_alert(article, db))

    except Exception:
        logger.exception("Collection job failed")
    finally:
        db.close()


def run_digest_job() -> None:
    """Send the daily digest via WhatsApp."""
    logger.info("=== Starting daily digest job at %s ===", datetime.now().isoformat())
    db = get_session_factory()()

    try:
        success = asyncio.run(send_digest(db, digest_type="quotidien"))
        if success:
            logger.info("Daily digest sent successfully")
        else:
            logger.warning("No articles for daily digest or send failed")
    except Exception:
        logger.exception("Digest job failed")
    finally:
        db.close()


def run_weekly_digest_job() -> None:
    """Send the weekly digest via WhatsApp."""
    logger.info("=== Starting weekly digest job at %s ===", datetime.now().isoformat())
    db = get_session_factory()()

    try:
        success = asyncio.run(
            send_digest(
                db,
                max_articles=settings.max_articles_weekly,
                digest_type="hebdomadaire",
            )
        )
        if success:
            logger.info("Weekly digest sent successfully")
        else:
            logger.warning("No articles for weekly digest or send failed")
    except Exception:
        logger.exception("Weekly digest job failed")
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
