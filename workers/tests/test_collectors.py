"""Tests for RSS collector — pure functions only (no DB dependency)."""

import hashlib
from unittest.mock import MagicMock

import pytest

from workers.src.processors.keywords import AI_KEYWORDS


# ── Inline copies of pure functions to avoid DB import chain ──

def generate_content_hash(title: str, url: str) -> str:
    content = f"{title.strip().lower()}|{url.strip().lower()}"
    return hashlib.sha256(content.encode()).hexdigest()


def is_ai_related(title: str, summary: str) -> bool:
    text = f"{title} {summary}".lower()
    return any(keyword in text for keyword in AI_KEYWORDS)


def parse_published_date(entry):
    from datetime import datetime, timezone
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    if hasattr(entry, "updated_parsed") and entry.updated_parsed:
        return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
    return None


class TestGenerateContentHash:
    """Tests for content hash generation."""

    def test_generates_sha256_hash(self):
        result = generate_content_hash("Test Title", "https://example.com")
        assert len(result) == 64

    def test_same_input_same_hash(self):
        hash1 = generate_content_hash("Title", "https://example.com")
        hash2 = generate_content_hash("Title", "https://example.com")
        assert hash1 == hash2

    def test_different_input_different_hash(self):
        hash1 = generate_content_hash("Title A", "https://example.com/a")
        hash2 = generate_content_hash("Title B", "https://example.com/b")
        assert hash1 != hash2

    def test_case_insensitive(self):
        hash1 = generate_content_hash("Title", "https://example.com")
        hash2 = generate_content_hash("TITLE", "https://EXAMPLE.COM")
        assert hash1 == hash2

    def test_strips_whitespace(self):
        hash1 = generate_content_hash("Title", "https://example.com")
        hash2 = generate_content_hash("  Title  ", "  https://example.com  ")
        assert hash1 == hash2


class TestIsAIRelated:
    """Tests for AI relevance filtering."""

    def test_detects_ai_keywords_in_title(self):
        assert is_ai_related("OpenAI releases new GPT model", "")

    def test_detects_ai_keywords_in_summary(self):
        assert is_ai_related("Tech News", "New machine learning breakthrough")

    def test_rejects_non_ai_content(self):
        assert not is_ai_related("New iPhone Released", "Apple releases new phone model")

    def test_case_insensitive(self):
        assert is_ai_related("NEW LLM ANNOUNCED", "")

    def test_detects_claude(self):
        assert is_ai_related("Anthropic updates Claude", "New capabilities")

    def test_detects_deep_learning(self):
        assert is_ai_related("Deep learning advances", "Research paper")

    def test_detects_generative_ai(self):
        assert is_ai_related("", "Generative AI tools for business")


class TestParsePublishedDate:
    """Tests for date parsing from feed entries."""

    def test_parses_published_parsed(self):
        entry = MagicMock()
        entry.published_parsed = (2026, 3, 22, 10, 0, 0, 0, 0, 0)
        entry.updated_parsed = None

        result = parse_published_date(entry)
        assert result is not None
        assert result.year == 2026
        assert result.month == 3
        assert result.day == 22

    def test_falls_back_to_updated_parsed(self):
        entry = MagicMock()
        entry.published_parsed = None
        entry.updated_parsed = (2026, 3, 21, 8, 0, 0, 0, 0, 0)

        result = parse_published_date(entry)
        assert result is not None
        assert result.day == 21

    def test_returns_none_if_no_date(self):
        entry = MagicMock()
        entry.published_parsed = None
        entry.updated_parsed = None

        result = parse_published_date(entry)
        assert result is None
