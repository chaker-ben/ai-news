"""YouTube collector using Data API v3."""

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

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# AI-focused YouTube channels
DEFAULT_YOUTUBE_CHANNELS: list[dict[str, str]] = [
    {"name": "Two Minute Papers", "channel_id": "UCbfYPyITQ-7l4upoX8nvctg"},
    {"name": "Yannic Kilcher", "channel_id": "UCZHmQk67mSJgfCCTn7xBfew"},
    {"name": "AI Explained", "channel_id": "UCNJ1Ymd5yFuUPtn21xtRbbw"},
    {"name": "Matt Wolfe", "channel_id": "UCJMQEbKEydGEmQn_GkMnQUQ"},
    {"name": "Fireship", "channel_id": "UCsBjURrPoezykLs9EqgamOA"},
]

# Search query
AI_SEARCH_QUERY = "AI artificial intelligence LLM GPT machine learning 2026"


def generate_video_hash(video_id: str) -> str:
    """Generate a unique hash for a YouTube video."""
    return hashlib.sha256(f"youtube|{video_id}".encode()).hexdigest()


async def search_youtube_videos(
    query: str = AI_SEARCH_QUERY,
    max_results: int = 10,
) -> list[dict]:
    """Search for recent AI-related YouTube videos.

    Args:
        query: Search query string.
        max_results: Maximum results (1-50).

    Returns:
        List of video data dictionaries.
    """
    if not settings.youtube_api_key:
        logger.warning("YouTube API key not configured. Skipping.")
        return []

    params = {
        "key": settings.youtube_api_key,
        "q": query,
        "part": "snippet",
        "type": "video",
        "order": "date",
        "maxResults": min(max_results, 50),
        "publishedAfter": None,  # Will be set below
    }

    # Only get videos from last 48h
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    params["publishedAfter"] = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(YOUTUBE_SEARCH_URL, params=params)
            response.raise_for_status()

            data = response.json()
            items = data.get("items", [])

            videos = []
            for item in items:
                snippet = item.get("snippet", {})
                video_id = item.get("id", {}).get("videoId", "")

                if not video_id:
                    continue

                # YouTube provides thumbnails at multiple resolutions
                thumbnails = snippet.get("thumbnails", {})
                thumbnail_url = (
                    thumbnails.get("high", {}).get("url")
                    or thumbnails.get("medium", {}).get("url")
                    or thumbnails.get("default", {}).get("url")
                    or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                )

                videos.append({
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", ""),
                    "channel_title": snippet.get("channelTitle", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "thumbnail_url": thumbnail_url,
                    "video_url": f"https://www.youtube.com/embed/{video_id}",
                })

            logger.info("Fetched %d videos from YouTube search", len(videos))
            return videos

    except httpx.HTTPStatusError as e:
        logger.error("YouTube API error: %s — %s", e.response.status_code, e.response.text)
        return []
    except Exception:
        logger.exception("YouTube search failed")
        return []


async def collect_youtube(db: Session, max_results: int = 10) -> list[Article]:
    """Collect AI-related YouTube videos and store as articles.

    Args:
        db: Database session.
        max_results: Maximum videos to fetch.

    Returns:
        List of newly collected Article instances.
    """
    videos = await search_youtube_videos(max_results=max_results)
    collected: list[Article] = []

    # Ensure YouTube source exists
    source = db.query(Source).filter(Source.type == "youtube", Source.active == True).first()
    if not source:
        source = Source(
            name="YouTube AI",
            type="youtube",
            url="https://youtube.com",
            active=True,
        )
        db.add(source)
        db.commit()

    for video in videos:
        video_id = video["video_id"]
        content_hash = generate_video_hash(video_id)

        existing = db.query(Article).filter(Article.content_hash == content_hash).first()
        if existing:
            continue

        # Parse date
        try:
            published_at = datetime.fromisoformat(
                video["published_at"].replace("Z", "+00:00")
            )
        except (ValueError, AttributeError):
            published_at = datetime.now(timezone.utc)

        title = video["title"]
        description = video.get("description", "")
        channel = video.get("channel_title", "Unknown")

        article = Article(
            source_id=source.id,
            source_type="youtube",
            original_title=f"[{channel}] {title}",
            original_content=description,
            url=video["url"],
            thumbnail_url=video.get("thumbnail_url"),
            video_url=video.get("video_url"),
            published_at=published_at,
            content_hash=content_hash,
        )
        db.add(article)
        collected.append(article)
        logger.info("Collected video: %s — %s", channel, title[:60])

    source.last_collected = datetime.now(timezone.utc)
    db.commit()

    logger.info("YouTube: collected %d new videos", len(collected))
    return collected
