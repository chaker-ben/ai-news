"""Twitter/X collector using API v2 (Bearer Token)."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from workers.src.config import settings
from workers.src.models.article import Article, Source
from workers.src.processors.keywords import AI_KEYWORDS

logger = logging.getLogger(__name__)

TWITTER_SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent"

# AI-focused Twitter accounts to monitor
DEFAULT_TWITTER_ACCOUNTS: list[dict[str, str]] = [
    {"name": "OpenAI (@OpenAI)", "url": "https://twitter.com/OpenAI"},
    {"name": "Anthropic (@AnthropicAI)", "url": "https://twitter.com/AnthropicAI"},
    {"name": "Google DeepMind (@GoogleDeepMind)", "url": "https://twitter.com/GoogleDeepMind"},
    {"name": "Yann LeCun (@ylecun)", "url": "https://twitter.com/ylecun"},
    {"name": "Jim Fan (@DrJimFan)", "url": "https://twitter.com/DrJimFan"},
    {"name": "Andrej Karpathy (@kaborthy)", "url": "https://twitter.com/karpathy"},
]

# Search query for AI-related tweets
AI_SEARCH_QUERY = (
    "(AI OR LLM OR GPT OR Claude OR Gemini OR AGI OR \"machine learning\" "
    "OR \"deep learning\" OR \"artificial intelligence\") "
    "lang:en -is:retweet -is:reply min_faves:100"
)


def generate_tweet_hash(tweet_id: str) -> str:
    """Generate a unique hash for a tweet."""
    return hashlib.sha256(f"twitter|{tweet_id}".encode()).hexdigest()


async def search_recent_tweets(
    query: str = AI_SEARCH_QUERY,
    max_results: int = 20,
) -> list[dict]:
    """Search for recent AI-related tweets using Twitter API v2.

    Args:
        query: Twitter search query.
        max_results: Maximum number of results (10-100).

    Returns:
        List of tweet data dictionaries.
    """
    if not settings.twitter_bearer_token:
        logger.warning("Twitter Bearer Token not configured. Skipping.")
        return []

    headers = {
        "Authorization": f"Bearer {settings.twitter_bearer_token}",
    }

    params = {
        "query": query,
        "max_results": min(max_results, 100),
        "tweet.fields": "created_at,public_metrics,author_id,text",
        "expansions": "author_id",
        "user.fields": "name,username",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                TWITTER_SEARCH_URL,
                headers=headers,
                params=params,
            )
            response.raise_for_status()

            data = response.json()
            tweets = data.get("data", [])

            # Build author lookup
            authors = {}
            for user in data.get("includes", {}).get("users", []):
                authors[user["id"]] = {
                    "name": user["name"],
                    "username": user["username"],
                }

            # Enrich tweets with author info
            for tweet in tweets:
                author = authors.get(tweet.get("author_id"), {})
                tweet["author_name"] = author.get("name", "Unknown")
                tweet["author_username"] = author.get("username", "unknown")

            logger.info("Fetched %d tweets from Twitter search", len(tweets))
            return tweets

    except httpx.HTTPStatusError as e:
        logger.error("Twitter API error: %s — %s", e.response.status_code, e.response.text)
        return []
    except Exception:
        logger.exception("Twitter search failed")
        return []


async def collect_twitter(db: Session, max_results: int = 20) -> list[Article]:
    """Collect AI-related tweets and store as articles.

    Args:
        db: Database session.
        max_results: Maximum tweets to fetch.

    Returns:
        List of newly collected Article instances.
    """
    tweets = await search_recent_tweets(max_results=max_results)
    collected: list[Article] = []

    # Ensure Twitter source exists
    source = db.query(Source).filter(Source.type == "twitter", Source.active == True).first()
    if not source:
        source = Source(
            name="Twitter/X AI",
            type="twitter",
            url="https://twitter.com",
            active=True,
        )
        db.add(source)
        db.commit()

    for tweet in tweets:
        tweet_id = tweet.get("id", "")
        text = tweet.get("text", "")
        author = tweet.get("author_username", "unknown")
        created_at_str = tweet.get("created_at", "")

        if not text:
            continue

        content_hash = generate_tweet_hash(tweet_id)
        existing = db.query(Article).filter(Article.content_hash == content_hash).first()
        if existing:
            continue

        # Parse date
        try:
            published_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            published_at = datetime.now(timezone.utc)

        # Build title from tweet
        title = f"@{author}: {text[:100]}{'...' if len(text) > 100 else ''}"
        tweet_url = f"https://twitter.com/{author}/status/{tweet_id}"

        article = Article(
            source_id=source.id,
            source_type="twitter",
            original_title=title,
            original_content=text,
            url=tweet_url,
            published_at=published_at,
            content_hash=content_hash,
        )
        db.add(article)
        collected.append(article)
        logger.info("Collected tweet: @%s — %s", author, text[:60])

    source.last_collected = datetime.now(timezone.utc)
    db.commit()

    logger.info("Twitter: collected %d new tweets", len(collected))
    return collected
