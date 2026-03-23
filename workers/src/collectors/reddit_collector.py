"""Reddit collector using Reddit API (via httpx, no PRAW dependency for async)."""

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

REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/access_token"
REDDIT_API_BASE = "https://oauth.reddit.com"

# AI-focused subreddits
AI_SUBREDDITS: list[str] = [
    "artificial",
    "MachineLearning",
    "LocalLLaMA",
    "ChatGPT",
    "singularity",
    "StableDiffusion",
]

# Minimum upvotes to filter noise
MIN_UPVOTES = 50


def generate_reddit_hash(post_id: str) -> str:
    """Generate a unique hash for a Reddit post."""
    return hashlib.sha256(f"reddit|{post_id}".encode()).hexdigest()


async def get_reddit_token() -> Optional[str]:
    """Authenticate with Reddit API and get an access token.

    Returns:
        Access token string, or None on failure.
    """
    if not settings.reddit_client_id or not settings.reddit_client_secret:
        logger.warning("Reddit credentials not configured. Skipping.")
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                REDDIT_AUTH_URL,
                auth=(settings.reddit_client_id, settings.reddit_client_secret),
                data={"grant_type": "client_credentials"},
                headers={"User-Agent": "AINews/1.0"},
            )
            response.raise_for_status()

            data = response.json()
            return data.get("access_token")

    except Exception:
        logger.exception("Reddit authentication failed")
        return None


async def fetch_subreddit_posts(
    subreddit: str,
    token: str,
    limit: int = 10,
    sort: str = "hot",
) -> list[dict]:
    """Fetch posts from a subreddit.

    Args:
        subreddit: Subreddit name (without r/).
        token: Reddit OAuth token.
        limit: Number of posts to fetch.
        sort: Sort method (hot, new, top).

    Returns:
        List of post data dictionaries.
    """
    url = f"{REDDIT_API_BASE}/r/{subreddit}/{sort}"

    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "AINews/1.0",
    }

    params = {"limit": limit, "t": "day"}  # Last 24h for "top"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()

            data = response.json()
            posts = []

            for child in data.get("data", {}).get("children", []):
                post = child.get("data", {})
                ups = post.get("ups", 0)

                if ups < MIN_UPVOTES:
                    continue

                # Reddit provides thumbnail URLs for link posts
                thumbnail = post.get("thumbnail", "")
                thumbnail_url = thumbnail if thumbnail.startswith("http") else None

                # Check for preview images (higher resolution)
                preview = post.get("preview", {})
                preview_images = preview.get("images", [])
                if preview_images and not thumbnail_url:
                    source_img = preview_images[0].get("source", {})
                    thumbnail_url = source_img.get("url", "").replace("&amp;", "&") or None

                posts.append({
                    "id": post.get("id", ""),
                    "title": post.get("title", ""),
                    "selftext": post.get("selftext", ""),
                    "url": post.get("url", ""),
                    "permalink": post.get("permalink", ""),
                    "subreddit": subreddit,
                    "author": post.get("author", "unknown"),
                    "ups": ups,
                    "created_utc": post.get("created_utc", 0),
                    "num_comments": post.get("num_comments", 0),
                    "thumbnail_url": thumbnail_url,
                })

            return posts

    except httpx.HTTPStatusError as e:
        logger.error("Reddit API error for r/%s: %s", subreddit, e.response.status_code)
        return []
    except Exception:
        logger.exception("Failed to fetch r/%s", subreddit)
        return []


async def collect_reddit(db: Session) -> list[Article]:
    """Collect AI-related Reddit posts from multiple subreddits.

    Args:
        db: Database session.

    Returns:
        List of newly collected Article instances.
    """
    token = await get_reddit_token()
    if not token:
        return []

    collected: list[Article] = []

    # Ensure Reddit source exists
    source = db.query(Source).filter(Source.type == "reddit", Source.active == True).first()
    if not source:
        source = Source(
            name="Reddit AI",
            type="reddit",
            url="https://reddit.com",
            active=True,
        )
        db.add(source)
        db.commit()

    for subreddit in AI_SUBREDDITS:
        posts = await fetch_subreddit_posts(subreddit, token, limit=10, sort="hot")

        for post in posts:
            post_id = post["id"]
            content_hash = generate_reddit_hash(post_id)

            existing = db.query(Article).filter(Article.content_hash == content_hash).first()
            if existing:
                continue

            # Parse timestamp
            created_utc = post.get("created_utc", 0)
            published_at = datetime.fromtimestamp(created_utc, tz=timezone.utc) if created_utc else datetime.now(timezone.utc)

            title = post["title"]
            content = post.get("selftext", "") or post.get("url", "")
            permalink = post.get("permalink", "")
            post_url = f"https://reddit.com{permalink}" if permalink else post.get("url", "")
            ups = post.get("ups", 0)

            article = Article(
                source_id=source.id,
                source_type="reddit",
                original_title=f"[r/{subreddit}] {title}",
                original_content=f"{content}\n\n({ups} upvotes, {post.get('num_comments', 0)} comments)",
                url=post_url,
                thumbnail_url=post.get("thumbnail_url"),
                published_at=published_at,
                content_hash=content_hash,
            )
            db.add(article)
            collected.append(article)
            logger.info("Collected r/%s: %s (%d ups)", subreddit, title[:60], ups)

    source.last_collected = datetime.now(timezone.utc)
    db.commit()

    logger.info("Reddit: collected %d new posts", len(collected))
    return collected
