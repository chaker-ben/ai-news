"""Tests for processor modules (scorer, translator, summarizer)."""

from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from workers.src.processors.scorer import (
    apply_freshness_boost,
    apply_source_weight,
    compute_final_score,
    compute_keyword_score,
)


class TestComputeKeywordScore:
    """Tests for keyword-based scoring."""

    def test_no_keywords_returns_zero(self):
        score = compute_keyword_score("iPhone review", "A new phone from Apple")
        assert score == 0.0

    def test_ai_keywords_increase_score(self):
        score = compute_keyword_score(
            "New GPT model released",
            "OpenAI announces a new LLM with machine learning capabilities",
        )
        assert score > 0.0

    def test_high_value_keywords_boost(self):
        score_normal = compute_keyword_score("AI update", "New AI feature")
        score_high = compute_keyword_score(
            "GPT-5 announced — breakthrough in AGI",
            "State-of-the-art benchmark results",
        )
        assert score_high > score_normal

    def test_score_capped_at_10(self):
        # Stuff with tons of keywords
        text = " ".join(["ai", "llm", "gpt", "machine learning", "deep learning",
                         "breakthrough", "agi", "state-of-the-art", "open source",
                         "release", "billion", "benchmark"])
        score = compute_keyword_score(text, text)
        assert score <= 10.0

    def test_title_keywords_weighted_more(self):
        # Same content, but AI keyword in title vs not
        score_in_title = compute_keyword_score("AI breakthrough", "Some content about technology")
        score_not_in_title = compute_keyword_score("Tech news", "Some content about AI")
        assert score_in_title >= score_not_in_title


class TestApplySourceWeight:
    """Tests for source quality weighting."""

    def test_openai_blog_weighted_higher(self):
        weighted = apply_source_weight(7.0, "OpenAI Blog")
        assert weighted > 7.0

    def test_unknown_source_no_change(self):
        weighted = apply_source_weight(7.0, "Unknown Blog")
        assert weighted == 7.0

    def test_capped_at_10(self):
        weighted = apply_source_weight(9.0, "OpenAI Blog")
        assert weighted <= 10.0


class TestApplyFreshnessBoost:
    """Tests for freshness-based score boosting."""

    def test_very_recent_gets_boost(self):
        now = datetime.now(timezone.utc)
        one_hour_ago = now - timedelta(hours=1)
        boosted = apply_freshness_boost(7.0, one_hour_ago)
        assert boosted > 7.0

    def test_moderately_recent_gets_smaller_boost(self):
        now = datetime.now(timezone.utc)
        four_hours_ago = now - timedelta(hours=4)
        boosted = apply_freshness_boost(7.0, four_hours_ago)
        assert boosted == 7.5

    def test_old_article_no_boost(self):
        now = datetime.now(timezone.utc)
        twelve_hours_ago = now - timedelta(hours=12)
        boosted = apply_freshness_boost(7.0, twelve_hours_ago)
        assert boosted == 7.0

    def test_handles_naive_datetime(self):
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        boosted = apply_freshness_boost(7.0, one_hour_ago)
        assert boosted > 7.0


class TestComputeFinalScore:
    """Tests for the final combined scoring."""

    def test_uses_llm_score_when_available(self):
        now = datetime.now(timezone.utc) - timedelta(hours=12)
        score = compute_final_score(
            title="AI News",
            content="Some content",
            source_name="Unknown",
            published_at=now,
            llm_score=8.5,
        )
        assert score >= 8.0

    def test_falls_back_to_keyword_scoring(self):
        now = datetime.now(timezone.utc) - timedelta(hours=12)
        score = compute_final_score(
            title="GPT-5 released by OpenAI",
            content="New LLM model",
            source_name="Unknown",
            published_at=now,
            llm_score=None,
        )
        assert score > 0.0

    def test_score_between_1_and_10(self):
        now = datetime.now(timezone.utc)
        score = compute_final_score(
            title="Test", content="", source_name="Unknown",
            published_at=now, llm_score=None,
        )
        assert 1.0 <= score <= 10.0
