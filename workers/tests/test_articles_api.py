"""Tests for GET /articles date filtering and sorting helpers."""
from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from workers.src.api.main import list_articles, published_window
from workers.src.models.article import Article, Base, Source


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine, tables=[Source.__table__, Article.__table__])
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _article(db, title: str, published_at: datetime, score: float = 5.0) -> Article:
    source = db.query(Source).first()
    if source is None:
        source = Source(name="Src", type="blog", url="https://src.example")
        db.add(source)
        db.flush()
    article = Article(
        source_id=source.id,
        source_type="blog",
        original_title=title,
        url=f"https://src.example/{title}",
        published_at=published_at,
        score=score,
        content_hash=title,
    )
    db.add(article)
    db.commit()
    return article


def test_published_window_shifts_local_day_to_utc():
    start, end = published_window(date(2026, 9, 6), date(2026, 9, 6), tz_offset=180)
    # Riyadh (UTC+3): local 2026-09-06 runs from 2026-09-05T21:00Z to 2026-09-06T21:00Z
    assert start == datetime(2026, 9, 5, 21, 0)
    assert end == datetime(2026, 9, 6, 21, 0)
    assert published_window(None, None, 0) == (None, None)


def test_list_articles_filters_by_local_day_and_sorts_by_date(db):
    _article(db, "late-yesterday-utc", datetime(2026, 9, 5, 22, 0), score=9.0)  # 01:00 Riyadh 06/09
    _article(db, "today-noon", datetime(2026, 9, 6, 9, 0), score=6.0)
    _article(db, "two-days-ago", datetime(2026, 9, 4, 9, 0), score=9.5)

    result = list_articles(
        db, date_from=date(2026, 9, 6), date_to=date(2026, 9, 6), tz_offset=180, sort="date"
    )

    assert [a["original_title"] for a in result["articles"]] == ["today-noon", "late-yesterday-utc"]
    assert result["total"] == 2

    by_score = list_articles(db, sort="score")
    assert [a["original_title"] for a in by_score["articles"]][0] == "two-days-ago"

    week = list_articles(db, date_from=date(2026, 9, 6) - timedelta(days=6), date_to=date(2026, 9, 6))
    assert week["total"] == 3
