"""RSS feed collector for AI news blogs."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

import feedparser
import httpx
from sqlalchemy.orm import Session

from workers.src.models.article import Article, Source
from workers.src.processors.keywords import AI_KEYWORDS

logger = logging.getLogger(__name__)

# Default RSS feeds for AI news
DEFAULT_FEEDS: list[dict[str, str]] = [
    {"name": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml"},
    {"name": "Google AI Blog", "url": "https://blog.google/technology/ai/rss/"},
    {"name": "Hugging Face Blog", "url": "https://huggingface.co/blog/feed.xml"},
    {"name": "Anthropic Blog", "url": "https://www.anthropic.com/research/rss.xml"},
    {"name": "Meta AI Blog", "url": "https://ai.meta.com/blog/rss/"},
    {"name": "DeepMind Blog", "url": "https://deepmind.google/blog/rss.xml"},
    {"name": "MIT Technology Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed"},
    {"name": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"},
    {"name": "Ars Technica AI", "url": "https://feeds.arstechnica.com/arstechnica/technology-lab"},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/"},
]


def generate_content_hash(title: str, url: str) -> str:
    """Generate a unique hash for deduplication."""
    content = f"{title.strip().lower()}|{url.strip().lower()}"
    return hashlib.sha256(content.encode()).hexdigest()


def is_ai_related(title: str, summary: str) -> bool:
    """Check if an article is AI-related based on keywords."""
    text = f"{title} {summary}".lower()
    return any(keyword in text for keyword in AI_KEYWORDS)


def parse_published_date(entry: feedparser.FeedParserDict) -> Optional[datetime]:
    """Extract and parse the publication date from a feed entry."""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    if hasattr(entry, "updated_parsed") and entry.updated_parsed:
        return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
    return None


def collect_from_feed(
    feed_url: str,
    source: Source,
    db: Session,
    max_age_hours: int = 24,
) -> list[Article]:
    """Collect articles from a single RSS feed.

    Args:
        feed_url: URL of the RSS feed.
        source: The Source model instance.
        db: Database session.
        max_age_hours: Maximum age of articles to collect (in hours).

    Returns:
        List of newly collected Article instances.
    """
    collected: list[Article] = []

    try:
        feed = feedparser.parse(feed_url)
    except Exception:
        logger.exception("Failed to parse feed: %s", feed_url)
        return collected

    if feed.bozo and not feed.entries:
        logger.warning("Feed parse error for %s: %s", feed_url, feed.bozo_exception)
        return collected

    now = datetime.now(timezone.utc)

    for entry in feed.entries:
        title = getattr(entry, "title", "")
        summary = getattr(entry, "summary", "")
        link = getattr(entry, "link", "")

        if not title or not link:
            continue

        # Filter by AI relevance
        if not is_ai_related(title, summary):
            continue

        # Parse publication date
        published_at = parse_published_date(entry)
        if not published_at:
            published_at = now

        # Filter by age
        age_hours = (now - published_at).total_seconds() / 3600
        if age_hours > max_age_hours:
            continue

        # Check for duplicates
        content_hash = generate_content_hash(title, link)
        existing = db.query(Article).filter(Article.content_hash == content_hash).first()
        if existing:
            continue

        article = Article(
            source_id=source.id,
            source_type=source.type,
            original_title=title,
            original_content=summary,
            url=link,
            published_at=published_at,
            content_hash=content_hash,
        )
        db.add(article)
        collected.append(article)
        logger.info("Collected: %s", title[:80])

    # Update source last_collected
    source.last_collected = now
    db.commit()

    return collected


def collect_all_rss(db: Session, max_age_hours: int = 24) -> list[Article]:
    """Collect articles from all active RSS sources.

    Args:
        db: Database session.
        max_age_hours: Maximum age of articles to collect.

    Returns:
        List of all newly collected Article instances.
    """
    all_collected: list[Article] = []

    sources = db.query(Source).filter(
        Source.active == True,  # noqa: E712
        Source.type == "blog",
    ).all()

    if not sources:
        logger.warning("No active RSS sources found. Seeding defaults.")
        sources = seed_default_sources(db)

    for source in sources:
        try:
            articles = collect_from_feed(
                feed_url=source.url,
                source=source,
                db=db,
                max_age_hours=max_age_hours,
            )
            all_collected.extend(articles)
            logger.info("Collected %d articles from %s", len(articles), source.name)
        except Exception:
            logger.exception("Error collecting from %s", source.name)

    logger.info("Total collected: %d articles", len(all_collected))
    return all_collected


def seed_default_sources(db: Session) -> list[Source]:
    """Seed default RSS sources into the database."""
    sources: list[Source] = []
    for feed in DEFAULT_FEEDS:
        existing = db.query(Source).filter(Source.url == feed["url"]).first()
        if existing:
            sources.append(existing)
            continue

        source = Source(
            name=feed["name"],
            type="blog",
            url=feed["url"],
            active=True,
        )
        db.add(source)
        sources.append(source)

    db.commit()
    logger.info("Seeded %d default RSS sources", len(sources))
    return sources
