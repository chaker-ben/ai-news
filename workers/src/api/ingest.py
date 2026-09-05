"""Ingest endpoint — lets an external agent (Claude Cowork) push pre-processed articles.

Replaces the Claude API summarization step: articles arrive already translated,
summarized and scored. Deduplication reuses the RSS content_hash scheme.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Annotated, Literal, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.orm import Session

from workers.src.collectors.rss_collector import generate_content_hash
from workers.src.config import settings
from workers.src.models.article import Article, Source, get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/articles", tags=["ingest"])

SourceTypeLiteral = Literal["blog", "twitter", "youtube", "tiktok", "reddit", "linkedin", "arxiv"]


class IngestArticle(BaseModel):
    """One article, already translated/summarized/scored by the agent."""

    original_title: str = Field(min_length=3, max_length=500)
    url: HttpUrl
    source_name: str = Field(min_length=1, max_length=200)
    source_type: SourceTypeLiteral = "blog"
    published_at: datetime
    title_fr: str = Field(min_length=3, max_length=500)
    title_en: str = Field(min_length=3, max_length=500)
    title_ar: str = Field(min_length=3, max_length=500)
    summary_fr: str = Field(min_length=20, max_length=4000)
    summary_en: str = Field(min_length=20, max_length=4000)
    summary_ar: str = Field(min_length=20, max_length=4000)
    original_content: Optional[str] = Field(default=None, max_length=20000)
    thumbnail_url: Optional[HttpUrl] = None
    score: float = Field(ge=0, le=10)


class IngestRequest(BaseModel):
    articles: list[IngestArticle] = Field(min_length=1, max_length=100)


class IngestResult(BaseModel):
    inserted: list[str]
    skipped: list[str]
    inserted_count: int
    skipped_count: int


def require_ingest_token(x_ingest_token: Annotated[str, Header()] = "") -> None:
    """Constant-time check of the shared secret."""
    expected = settings.ingest_token
    if not expected:
        raise HTTPException(status_code=503, detail="INGEST_TOKEN not configured")
    if not secrets.compare_digest(x_ingest_token, expected):
        raise HTTPException(status_code=401, detail="Invalid ingest token")


def get_or_create_source(db: Session, name: str, source_type: str, article_url: str) -> Source:
    """Find a Source by name (case-insensitive) or create one keyed on the article's domain."""
    existing = db.query(Source).filter(Source.name.ilike(name)).first()
    if existing:
        return existing
    parsed = urlparse(article_url)
    source = Source(
        name=name,
        type=source_type,
        url=f"{parsed.scheme}://{parsed.netloc}",
        active=True,
    )
    db.add(source)
    db.flush()
    return source


def ingest_articles(db: Session, items: list[IngestArticle]) -> IngestResult:
    """Insert new articles, skipping any whose content_hash already exists."""
    inserted: list[str] = []
    skipped: list[str] = []
    seen_in_batch: set[str] = set()

    for item in items:
        url = str(item.url)
        content_hash = generate_content_hash(item.original_title, url)
        if content_hash in seen_in_batch:
            skipped.append(item.original_title)
            continue
        seen_in_batch.add(content_hash)

        exists = db.query(Article).filter(Article.content_hash == content_hash).first()
        if exists:
            skipped.append(item.original_title)
            continue

        source = get_or_create_source(db, item.source_name, item.source_type, url)
        published = item.published_at
        if published.tzinfo is not None:
            published = published.astimezone(timezone.utc).replace(tzinfo=None)

        db.add(
            Article(
                source_id=source.id,
                source_type=item.source_type,
                original_title=item.original_title,
                title_fr=item.title_fr,
                title_en=item.title_en,
                title_ar=item.title_ar,
                original_content=item.original_content,
                summary_fr=item.summary_fr,
                summary_en=item.summary_en,
                summary_ar=item.summary_ar,
                url=url,
                thumbnail_url=str(item.thumbnail_url) if item.thumbnail_url else None,
                published_at=published,
                score=item.score,
                notified=False,
                content_hash=content_hash,
            )
        )
        inserted.append(item.original_title)

    db.commit()
    logger.info("Ingest: %d inserted, %d skipped", len(inserted), len(skipped))
    return IngestResult(
        inserted=inserted,
        skipped=skipped,
        inserted_count=len(inserted),
        skipped_count=len(skipped),
    )


@router.post("/ingest", response_model=IngestResult, dependencies=[Depends(require_ingest_token)])
def ingest(payload: IngestRequest, db: Annotated[Session, Depends(get_db)]) -> IngestResult:
    """Ingest pre-processed articles (authenticated with X-Ingest-Token)."""
    try:
        return ingest_articles(db, payload.articles)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("Ingest failed")
        raise HTTPException(status_code=500, detail=f"Ingest failed: {exc}") from exc
