"""Processing pipeline — single Claude call for translate + summarize + score."""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy.orm import Session

from workers.src.config import settings
from workers.src.models.article import Article
from workers.src.processors.scorer import compute_final_score
from workers.src.processors.summarizer import process_article_with_claude

logger = logging.getLogger(__name__)


async def process_article(article: Article, db: Session) -> Article:
    """Process a single article: translate + summarize + score in ONE Claude call.

    Falls back to keyword scoring if Claude API is unavailable.

    Args:
        article: Article to process.
        db: Database session.

    Returns:
        Updated Article instance.
    """
    source_name = article.source.name if article.source else "Unknown"
    content = article.original_content or article.original_title

    # Single Claude call: title_fr + summary_fr + score
    llm_score = None
    result = await process_article_with_claude(
        title=article.original_title,
        content=content,
        source_name=source_name,
    )

    if result:
        article.title_fr = result.title_fr
        article.summary_fr = result.summary_fr
        article.title_en = result.title_en
        article.summary_en = result.summary_en
        article.title_ar = result.title_ar
        article.summary_ar = result.summary_ar
        llm_score = result.score

    # Final score: combine LLM score with source weight + freshness boost
    article.score = compute_final_score(
        title=article.original_title,
        content=content,
        source_name=source_name,
        published_at=article.published_at,
        llm_score=llm_score,
    )

    db.commit()
    logger.info(
        "Processed: %s (score=%.1f, claude=%s)",
        article.original_title[:50],
        article.score,
        "yes" if result else "no (keyword fallback)",
    )
    return article


async def process_unprocessed_articles(db: Session) -> list[Article]:
    """Find and process all unprocessed articles.

    Articles are processed in parallel batches for speed.

    Args:
        db: Database session.

    Returns:
        List of processed articles.
    """
    from sqlalchemy import or_
    articles = (
        db.query(Article)
        .filter(or_(Article.summary_fr == None, Article.summary_fr == ""))  # noqa: E711
        .order_by(Article.collected_at.desc())
        .all()
    )

    if not articles:
        logger.info("No unprocessed articles found.")
        return []

    logger.info("Processing %d articles...", len(articles))
    processed: list[Article] = []

    # Process in parallel batches of 5 to avoid rate limits
    batch_size = 5
    for i in range(0, len(articles), batch_size):
        batch = articles[i : i + batch_size]

        tasks = [process_article(article, db) for article in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for article, result in zip(batch, results):
            if isinstance(result, Exception):
                logger.exception(
                    "Failed to process: %s — %s",
                    article.original_title[:50],
                    result,
                )
            else:
                processed.append(result)

                if result.score >= settings.min_score_alert and not result.notified:
                    logger.info(
                        "Breaking news detected (score=%.1f): %s",
                        result.score,
                        result.original_title[:50],
                    )

    logger.info("Processed %d/%d articles", len(processed), len(articles))
    return processed
