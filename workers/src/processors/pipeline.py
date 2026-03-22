"""Processing pipeline — orchestrates translation, summarization, and scoring."""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy.orm import Session

from workers.src.config import settings
from workers.src.models.article import Article
from workers.src.processors.scorer import compute_final_score
from workers.src.processors.summarizer import score_article, summarize_article
from workers.src.processors.translator import translate_title

logger = logging.getLogger(__name__)


async def process_article(article: Article, db: Session) -> Article:
    """Process a single article: translate, summarize, and score.

    Args:
        article: Article to process.
        db: Database session.

    Returns:
        Updated Article instance.
    """
    source_name = article.source.name if article.source else "Unknown"

    # Step 1: Translate title
    if not article.title_fr:
        article.title_fr = await translate_title(article.original_title)

    # Step 2: Summarize
    if not article.summary_fr:
        content = article.original_content or article.original_title
        article.summary_fr = await summarize_article(article.original_title, content)

    # Step 3: Score (LLM + keyword hybrid)
    llm_score = None
    if settings.anthropic_api_key:
        content = article.original_content or article.original_title
        llm_score = await score_article(article.original_title, content, source_name)

    article.score = compute_final_score(
        title=article.original_title,
        content=article.original_content or "",
        source_name=source_name,
        published_at=article.published_at,
        llm_score=llm_score,
    )

    db.commit()
    logger.info(
        "Processed: %s (score=%.1f)",
        article.original_title[:50],
        article.score,
    )
    return article


async def process_unprocessed_articles(db: Session) -> list[Article]:
    """Find and process all articles that haven't been processed yet.

    Args:
        db: Database session.

    Returns:
        List of processed articles.
    """
    articles = (
        db.query(Article)
        .filter(Article.summary_fr == None)  # noqa: E711
        .order_by(Article.collected_at.desc())
        .all()
    )

    if not articles:
        logger.info("No unprocessed articles found.")
        return []

    logger.info("Processing %d articles...", len(articles))
    processed: list[Article] = []

    for article in articles:
        try:
            result = await process_article(article, db)
            processed.append(result)

            # Check for breaking news
            if result.score >= settings.min_score_alert and not result.notified:
                logger.info(
                    "Breaking news detected (score=%.1f): %s",
                    result.score,
                    result.original_title[:50],
                )
                # Breaking news alert will be handled by the scheduler

        except Exception:
            logger.exception(
                "Failed to process article: %s",
                article.original_title[:50],
            )

    logger.info("Processed %d/%d articles", len(processed), len(articles))
    return processed
