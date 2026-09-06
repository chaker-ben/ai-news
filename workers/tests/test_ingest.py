"""Tests for POST /articles/ingest — auth, insertion, deduplication."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from workers.src.api.ingest import IngestArticle, ingest_articles, require_ingest_token
from workers.src.config import settings
from workers.src.models.article import Article, Base, Source


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    # Only the tables this endpoint touches (categories.keywords is a Postgres ARRAY)
    Base.metadata.create_all(engine, tables=[Source.__table__, Article.__table__])
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _item(title: str = "OpenAI releases GPT-6", url: str = "https://openai.com/blog/gpt-6") -> IngestArticle:
    return IngestArticle(
        original_title=title,
        url=url,
        source_name="OpenAI Blog",
        published_at=datetime(2026, 9, 5, 8, 0, tzinfo=timezone.utc),
        title_fr="OpenAI publie GPT-6",
        title_en=title,
        title_ar="أوبن إيه آي تطلق GPT-6",
        summary_fr="Un résumé en français suffisamment long pour passer la validation.",
        summary_en="An English summary that is long enough to pass validation checks.",
        summary_ar="ملخص باللغة العربية طويل بما يكفي لاجتياز عملية التحقق من الصحة.",
        score=8.5,
    )


def test_ingest_inserts_article_and_creates_source(db):
    result = ingest_articles(db, [_item()])

    assert result.inserted_count == 1
    assert result.skipped_count == 0
    article = db.query(Article).one()
    assert article.title_fr == "OpenAI publie GPT-6"
    assert article.summary_ar.startswith("ملخص")
    assert article.score == 8.5
    assert article.notified is False
    assert article.published_at == datetime(2026, 9, 5, 8, 0)  # stored naive UTC
    source = db.query(Source).one()
    assert source.name == "OpenAI Blog"
    assert source.url == "https://openai.com"
    assert article.source_id == source.id


def test_ingest_skips_duplicates_across_calls_and_within_batch(db):
    ingest_articles(db, [_item()])
    result = ingest_articles(db, [_item(), _item(), _item(title="Other news", url="https://x.com/a")])

    assert result.inserted == ["Other news"]
    assert result.skipped_count == 2
    assert db.query(Article).count() == 2


def test_ingest_reuses_existing_source_case_insensitive(db):
    db.add(Source(name="openai blog", type="blog", url="https://openai.com/blog/rss.xml"))
    db.commit()

    ingest_articles(db, [_item()])

    assert db.query(Source).count() == 1


def test_require_ingest_token(monkeypatch):
    from fastapi import HTTPException

    monkeypatch.setattr(settings, "ingest_token", "")
    with pytest.raises(HTTPException) as exc:
        require_ingest_token("anything")
    assert exc.value.status_code == 503

    monkeypatch.setattr(settings, "ingest_token", "s3cret")
    with pytest.raises(HTTPException) as exc:
        require_ingest_token("wrong")
    assert exc.value.status_code == 401
    assert require_ingest_token("s3cret") is None


def test_ingest_article_validation_rejects_bad_score_and_url():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        IngestArticle(**{**_item().model_dump(), "score": 11})
    with pytest.raises(ValidationError):
        IngestArticle(**{**_item().model_dump(), "url": "not-a-url"})


def test_ingest_returns_ids_for_inserted_and_skipped(db):
    first = ingest_articles(db, [_item()])
    assert len(first.inserted_items) == 1
    ref = first.inserted_items[0]
    assert ref.url == "https://openai.com/blog/gpt-6"
    assert db.query(Article).one().id == ref.id

    second = ingest_articles(db, [_item()])
    assert second.inserted_items == []
    assert [r.id for r in second.skipped_items] == [ref.id]  # links to the existing article
