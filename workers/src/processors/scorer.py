"""Article relevance scoring — keyword-based fallback + LLM scoring."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from workers.src.processors.keywords import AI_KEYWORDS

logger = logging.getLogger(__name__)

# High-value keywords that boost the score
HIGH_VALUE_KEYWORDS: list[str] = [
    "gpt-5", "gpt5", "claude 4", "gemini 2", "llama 4",
    "agi", "breakthrough", "state-of-the-art", "sota",
    "open source", "release", "launch", "announce",
    "billion", "funding", "acquisition",
    "benchmark", "record", "surpass",
]

# Source quality weights
SOURCE_WEIGHTS: dict[str, float] = {
    "OpenAI Blog": 1.3,
    "Google AI Blog": 1.3,
    "Anthropic Blog": 1.3,
    "DeepMind Blog": 1.3,
    "Meta AI Blog": 1.2,
    "Hugging Face Blog": 1.1,
    "MIT Technology Review AI": 1.1,
    "Arxiv": 1.0,
    "The Verge AI": 0.9,
    "VentureBeat AI": 0.9,
    "Ars Technica AI": 0.9,
}


def compute_keyword_score(title: str, content: str) -> float:
    """Compute a keyword-based relevance score (0-10).

    This is a fast fallback when LLM scoring is unavailable.

    Args:
        title: Article title.
        content: Article content/summary.

    Returns:
        Score between 0.0 and 10.0.
    """
    text = f"{title} {content}".lower()
    score = 0.0

    # Base: count of AI keywords found
    keyword_count = sum(1 for kw in AI_KEYWORDS if kw in text)
    score += min(keyword_count * 0.8, 4.0)  # Max 4 points from keywords

    # Bonus: high-value keywords
    high_value_count = sum(1 for kw in HIGH_VALUE_KEYWORDS if kw in text)
    score += min(high_value_count * 1.5, 4.0)  # Max 4 points from high-value

    # Title weight: keywords in title count more
    title_lower = title.lower()
    title_keyword_count = sum(1 for kw in AI_KEYWORDS if kw in title_lower)
    score += min(title_keyword_count * 0.5, 2.0)  # Max 2 points from title

    return min(score, 10.0)


def apply_source_weight(score: float, source_name: str) -> float:
    """Apply source quality weight to a score.

    Args:
        score: Base score.
        source_name: Name of the source.

    Returns:
        Weighted score (capped at 10.0).
    """
    weight = SOURCE_WEIGHTS.get(source_name, 1.0)
    return min(score * weight, 10.0)


def apply_freshness_boost(score: float, published_at: datetime) -> float:
    """Boost score for very recent articles.

    Args:
        score: Base score.
        published_at: Publication date.

    Returns:
        Boosted score (capped at 10.0).
    """
    now = datetime.now(timezone.utc)
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)

    age_hours = (now - published_at).total_seconds() / 3600

    if age_hours < 2:
        return min(score + 1.0, 10.0)
    if age_hours < 6:
        return min(score + 0.5, 10.0)
    return score


def compute_final_score(
    title: str,
    content: str,
    source_name: str,
    published_at: datetime,
    llm_score: Optional[float] = None,
) -> float:
    """Compute the final relevance score combining all factors.

    Args:
        title: Article title.
        content: Article content.
        source_name: Source name.
        published_at: Publication date.
        llm_score: Optional LLM-generated score (1-10).

    Returns:
        Final score between 1.0 and 10.0.
    """
    if llm_score is not None:
        # Use LLM score as base, apply modifiers
        score = llm_score
    else:
        # Fallback to keyword scoring
        score = compute_keyword_score(title, content)

    score = apply_source_weight(score, source_name)
    score = apply_freshness_boost(score, published_at)

    return round(max(1.0, min(10.0, score)), 1)
