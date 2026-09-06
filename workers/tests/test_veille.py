"""Tests for the per-language daily recap email (POST /notify/veille)."""
from __future__ import annotations

from datetime import date, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from workers.src.models.article import (
    Article,
    Base,
    NotificationLog,
    Source,
    Subscription,
    User,
    UserNotificationStatus,
    UserPreferences,
)
from workers.src.notifiers import veille
from workers.src.notifiers.veille import (
    Recipient,
    build_veille_email,
    merge_recipients,
    normalize_language,
    platform_recipients,
)

BASE = "https://ai-news-production-1ae0.up.railway.app"


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            Source.__table__,
            Article.__table__,
            User.__table__,
            UserPreferences.__table__,
            Subscription.__table__,
            NotificationLog.__table__,
            UserNotificationStatus.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _article(db, n: int, score: float) -> Article:
    source = db.query(Source).first()
    if source is None:
        source = Source(name="TechCrunch", type="blog", url="https://techcrunch.com")
        db.add(source)
        db.flush()
    a = Article(
        id=f"art-{n}",
        source_id=source.id,
        source_type="blog",
        original_title=f"Original {n}",
        title_fr=f"Titre FR {n}",
        title_en=f"Title EN {n}",
        title_ar=f"عنوان {n}",
        summary_fr=f"Résumé FR {n} <b>",
        summary_en=f"Summary EN {n}",
        summary_ar=f"ملخص {n}",
        url=f"https://techcrunch.com/{n}",
        published_at=datetime(2026, 9, 6, 8, 0),
        score=score,
        content_hash=f"h{n}",
    )
    db.add(a)
    db.commit()
    return a


def _user(db, uid: str, email: str, language: str, notif: bool = True, sub_status: str | None = None):
    db.add(User(id=uid, email=email))
    db.add(UserPreferences(user_id=uid, language=language, email_notifications=notif))
    if sub_status:
        db.add(Subscription(user_id=uid, billing_plan_id="p", plan="pro", status=sub_status))
    db.commit()


def test_normalize_language_defaults_to_french():
    assert normalize_language("en") == "en"
    assert normalize_language("AR") == "ar"
    assert normalize_language("de") == "fr"
    assert normalize_language(None) == "fr"


def test_build_email_renders_each_language_with_platform_links(db):
    low = _article(db, 1, 6.0)
    high = _article(db, 2, 9.5)
    day = date(2026, 9, 6)

    subject_fr, html_fr = build_veille_email([low, high], "fr", day, 2, 0, BASE)
    assert subject_fr == "Veille AI — 06/09/2026 — 2 articles (2 insérés, 0 doublons)"
    assert f"{BASE}/fr/articles/art-2" in html_fr
    assert html_fr.index("Titre FR 2") < html_fr.index("Titre FR 1")  # sorted by score
    assert "Résumé FR 1 &lt;b&gt;" in html_fr  # escaped
    assert 'dir="ltr"' in html_fr
    assert "from=2026-09-06&amp;to=2026-09-06" in html_fr

    subject_en, html_en = build_veille_email([low, high], "en", day, 1, 1, BASE)
    assert subject_en == "AI News Digest — 2026-09-06 — 2 articles (1 new, 1 duplicates)"
    assert "Title EN 2" in html_en and "Titre FR" not in html_en
    assert f"{BASE}/en/articles/art-1" in html_en
    assert "View on AI News" in html_en

    subject_ar, html_ar = build_veille_email([low, high], "ar", day, 2, 0, BASE)
    assert subject_ar.startswith("نشرة الذكاء الاصطناعي — 06/09/2026")
    assert 'dir="rtl"' in html_ar
    assert "عنوان 2" in html_ar
    assert f"{BASE}/ar/articles/art-2" in html_ar
    assert "https://techcrunch.com/2" in html_ar  # source link kept


def test_platform_recipients_follow_user_language_and_opt_in(db):
    _user(db, "u-fr", "fr@example.com", "fr")
    _user(db, "u-en", "en@example.com", "en", sub_status="active")
    _user(db, "u-ar", "AR@example.com", "ar", sub_status="trialing")
    _user(db, "u-off", "off@example.com", "en", notif=False)
    _user(db, "u-expired", "expired@example.com", "fr", sub_status="expired")

    recipients = platform_recipients(db)

    assert {(r.email, r.language) for r in recipients} == {
        ("fr@example.com", "fr"),
        ("en@example.com", "en"),
        ("AR@example.com", "ar"),
    }

    merged = merge_recipients(
        recipients,
        [Recipient("ar@example.com", "fr"), Recipient("boss@example.com", "en")],
    )
    assert [r.email for r in merged][-1] == "boss@example.com"
    assert len(merged) == 4  # ar@example.com already covered (case-insensitive)


@pytest.mark.asyncio
async def test_notify_veille_sends_one_email_per_recipient_in_their_language(db, monkeypatch):
    from workers.src.api import main as api_main
    from workers.src.config import settings

    a1 = _article(db, 1, 8.0)
    a2 = _article(db, 2, 7.0)
    _user(db, "u-en", "en@example.com", "en")
    _user(db, "u-ar", "ar@example.com", "ar")

    sent: list[tuple[str, str]] = []

    async def fake_send(to, subject, html):
        sent.append((to, subject))
        return to != "fail@example.com"

    monkeypatch.setattr(settings, "resend_api_key", "re_test")
    monkeypatch.setattr(veille, "send_email", fake_send)

    payload = api_main.VeilleRequest(
        article_ids=[a1.id, a2.id, "missing"],
        inserted_count=2,
        day=date(2026, 9, 6),
        extra_recipients=[
            api_main.VeilleRecipient(email="boss@example.com", language="fr"),
            api_main.VeilleRecipient(email="fail@example.com", language="fr"),
        ],
    )

    preview = await api_main.send_veille_recap(payload.model_copy(update={"dry_run": True}), db)
    assert preview["status"] == "dry_run"
    assert preview["by_language"] == {"en": 1, "ar": 1, "fr": 2}
    assert sent == []

    result = await api_main.send_veille_recap(payload, db)

    assert result["articles"] == 2
    assert result["missing_article_ids"] == ["missing"]
    assert sorted(result["sent"]) == ["ar@example.com", "boss@example.com", "en@example.com"]
    assert result["failed"] == ["fail@example.com"]
    subjects = dict(sent)
    assert subjects["en@example.com"].startswith("AI News Digest — 2026-09-06")
    assert subjects["ar@example.com"].startswith("نشرة")
    assert subjects["boss@example.com"].startswith("Veille AI — 06/09/2026")

    # Platform users get their notification status recorded; extra recipients do not.
    statuses = db.query(UserNotificationStatus).all()
    assert {(s.user_id, s.article_id) for s in statuses} == {
        ("u-en", "art-1"), ("u-en", "art-2"), ("u-ar", "art-1"), ("u-ar", "art-2"),
    }
    assert db.query(NotificationLog).filter(NotificationLog.type == "email_veille").count() == 4


@pytest.mark.asyncio
async def test_notify_veille_requires_resend_and_known_articles(db, monkeypatch):
    from fastapi import HTTPException

    from workers.src.api import main as api_main
    from workers.src.config import settings

    monkeypatch.setattr(settings, "resend_api_key", "")
    with pytest.raises(HTTPException) as exc:
        await api_main.send_veille_recap(api_main.VeilleRequest(article_ids=["x"]), db)
    assert exc.value.status_code == 503

    monkeypatch.setattr(settings, "resend_api_key", "re_test")
    with pytest.raises(HTTPException) as exc:
        await api_main.send_veille_recap(api_main.VeilleRequest(article_ids=["x"]), db)
    assert exc.value.status_code == 404
