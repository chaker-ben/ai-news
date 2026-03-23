"""Article relevance scoring — keyword-based fallback + LLM scoring."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from workers.src.processors.keywords import AI_KEYWORDS, PROFILE_KEYWORDS

logger = logging.getLogger(__name__)

# Source quality weights
SOURCE_WEIGHTS: dict[str, float] = {
    "OpenAI Blog": 1.3,
    "Google AI Blog": 1.3,
    "Anthropic Blog": 1.3,
    "DeepMind Blog": 1.3,
    "Meta AI Blog": 1.2,
    "Hugging Face Blog": 1.2,
    "MIT Technology Review AI": 1.1,
    "Arxiv AI Papers": 1.1,
    "The Verge AI": 0.8,
    "VentureBeat AI": 0.9,
    "Ars Technica AI": 0.8,
    "Reddit AI": 1.0,
    "YouTube AI": 0.9,
    "Twitter/X AI": 1.0,
}


def compute_keyword_score(title: str, content: str) -> float:
    """Compute a keyword-based relevance score (0-10).

    Prioritizes dev/business/trends content matching user profile.

    Args:
        title: Article title.
        content: Article content/summary.

    Returns:
        Score between 0.0 and 10.0.
    """
    text = f"{title} {content}".lower()
    title_lower = title.lower()
    score = 0.0

    # Base: AI keywords found (broad relevance)
    keyword_count = sum(1 for kw in AI_KEYWORDS if kw in text)
    score += min(keyword_count * 0.5, 3.0)

    # Profile match: dev/business/trends keywords (main scoring factor)
    profile_count = sum(1 for kw in PROFILE_KEYWORDS if kw in text)
    score += min(profile_count * 1.0, 5.0)

    # Title bonus: profile keywords in title = very relevant
    title_profile_count = sum(1 for kw in PROFILE_KEYWORDS if kw in title_lower)
    score += min(title_profile_count * 0.8, 2.0)

    return min(score, 10.0)


def apply_source_weight(score: float, source_name: str) -> float:
    """Apply source quality weight to a score."""
    weight = SOURCE_WEIGHTS.get(source_name, 1.0)
    return min(score * weight, 10.0)


def apply_freshness_boost(score: float, published_at: datetime) -> float:
    """Boost score for very recent articles."""
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
        score = llm_score
    else:
        score = compute_keyword_score(title, content)

    score = apply_source_weight(score, source_name)
    score = apply_freshness_boost(score, published_at)

    return round(max(1.0, min(10.0, score)), 1)
