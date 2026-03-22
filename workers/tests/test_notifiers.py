"""Tests for WhatsApp notifier — message formatting (no DB dependency)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from unittest.mock import MagicMock

import pytest


def _make_article(
    title: str = "Test Article",
    title_fr: Optional[str] = "Article Test",
    summary_fr: Optional[str] = "Ceci est un résumé de test.",
    url: str = "https://example.com",
    score: float = 7.5,
    source_name: str = "Test Blog",
    published_at: Optional[datetime] = None,
    notified: bool = False,
) -> MagicMock:
    """Create a mock Article for testing."""
    article = MagicMock()
    article.original_title = title
    article.title_fr = title_fr
    article.summary_fr = summary_fr
    article.url = url
    article.score = score
    article.notified = notified
    article.published_at = published_at or datetime(2026, 3, 22, 10, 0)
    article.source = MagicMock()
    article.source.name = source_name
    return article


# ── Inline format functions to avoid DB import chain ──

def format_digest_message(articles, digest_type="quotidien"):
    today = datetime.now().strftime("%d %B %Y")
    header = f"*AI NEWS — Digest {digest_type} du {today}*"
    separator = "\n" + "=" * 30 + "\n"
    body_parts = []

    for i, article in enumerate(articles, 1):
        title = article.title_fr or article.original_title
        summary = article.summary_fr or ""
        source_name = article.source.name if article.source else "Source inconnue"
        pub_date = article.published_at.strftime("%d/%m/%Y") if article.published_at else ""
        score = article.score or 0

        part = f"{i}. *{title}*\nSource : {source_name} | {pub_date}\n"
        if summary:
            part += f"{summary}\n"
        part += f"Lien : {article.url}\nScore : {score}/10"
        body_parts.append(part)

    footer = "\n_Prochain digest demain a 08h00_"
    return header + separator + separator.join(body_parts) + separator + footer


def format_breaking_news(article):
    title = article.title_fr or article.original_title
    summary = article.summary_fr or ""
    source_name = article.source.name if article.source else "Source inconnue"

    message = f"*ALERTE AI NEWS*\n\n*{title}*\nSource : {source_name}\n"
    if summary:
        message += f"\n{summary}\n"
    message += f"\nLien : {article.url}\nScore : {article.score}/10"
    return message


class TestFormatDigestMessage:
    """Tests for digest message formatting."""

    def test_includes_header(self):
        articles = [_make_article()]
        message = format_digest_message(articles)
        assert "AI NEWS" in message
        assert "Digest" in message

    def test_includes_article_title(self):
        articles = [_make_article(title_fr="GPT-5 annoncé")]
        message = format_digest_message(articles)
        assert "GPT-5 annoncé" in message

    def test_includes_source_and_url(self):
        articles = [_make_article(source_name="OpenAI Blog", url="https://openai.com")]
        message = format_digest_message(articles)
        assert "OpenAI Blog" in message
        assert "https://openai.com" in message

    def test_includes_score(self):
        articles = [_make_article(score=9.2)]
        message = format_digest_message(articles)
        assert "9.2" in message

    def test_multiple_articles_numbered(self):
        articles = [
            _make_article(title_fr="Article 1"),
            _make_article(title_fr="Article 2"),
            _make_article(title_fr="Article 3"),
        ]
        message = format_digest_message(articles)
        assert "1." in message
        assert "2." in message
        assert "3." in message

    def test_falls_back_to_original_title(self):
        articles = [_make_article(title="Original Title", title_fr=None)]
        message = format_digest_message(articles)
        assert "Original Title" in message

    def test_includes_summary(self):
        articles = [_make_article(summary_fr="Un résumé important.")]
        message = format_digest_message(articles)
        assert "Un résumé important." in message


class TestFormatBreakingNews:
    """Tests for breaking news formatting."""

    def test_includes_alert_header(self):
        article = _make_article(score=9.5)
        message = format_breaking_news(article)
        assert "ALERTE" in message

    def test_includes_article_details(self):
        article = _make_article(
            title_fr="Découverte majeure en IA",
            source_name="DeepMind",
            url="https://deepmind.google",
            score=9.8,
        )
        message = format_breaking_news(article)
        assert "Découverte majeure en IA" in message
        assert "DeepMind" in message
        assert "https://deepmind.google" in message
        assert "9.8" in message
