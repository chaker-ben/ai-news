"""Article processing using Claude API — translate + summarize + score in one call."""
from __future__ import annotations

import json
import logging

import anthropic

from workers.src.config import settings

logger = logging.getLogger(__name__)

PROCESS_SYSTEM_PROMPT = """Tu es un journaliste tech spécialisé en intelligence artificielle.
Ta mission : analyser un article d'actualité IA et produire 3 éléments en une seule réponse.

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour) :
{
  "title_fr": "Titre traduit en français (concis, informatif)",
  "summary_fr": "Résumé en français, 3 à 5 phrases. Factuel, professionnel, termes techniques appropriés. Mentionner qui, quoi, quand, pourquoi.",
  "score": 7.5
}

Critères de scoring (1.0 à 10.0) :
- 9-10 : Annonce majeure (nouveau modèle, breakthrough, acquisition significative)
- 7-8 : Nouvelle importante (mise à jour majeure, benchmark, partenariat)
- 5-6 : Intéressant (tutoriel avancé, analyse de tendance, comparatif)
- 3-4 : Mineur (mise à jour incrémentale, opinion, blog post standard)
- 1-2 : Peu pertinent (marketing, contenu recyclé, tangentiel à l'IA)"""

PROCESS_PROMPT_TEMPLATE = """Analyse cet article et retourne le JSON (titre FR + résumé FR + score) :

Titre original : {title}
Source : {source}

Contenu :
{content}"""


class ArticleProcessingResult:
    """Result of processing an article with Claude."""

    __slots__ = ("title_fr", "summary_fr", "score")

    def __init__(self, title_fr: str, summary_fr: str, score: float):
        self.title_fr = title_fr
        self.summary_fr = summary_fr
        self.score = score


async def process_article_with_claude(
    title: str,
    content: str,
    source_name: str,
) -> ArticleProcessingResult | None:
    """Process an article with Claude: translate title + summarize + score in ONE call.

    Args:
        title: Original article title.
        content: Article content or description.
        source_name: Name of the source.

    Returns:
        ArticleProcessingResult with title_fr, summary_fr, score.
        None if API key not configured or on failure.
    """
    if not settings.anthropic_api_key:
        logger.warning("Anthropic API key not configured. Skipping processing.")
        return None

    if not content.strip():
        content = title

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            system=PROCESS_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": PROCESS_PROMPT_TEMPLATE.format(
                        title=title,
                        source=source_name,
                        content=content[:3000],
                    ),
                },
            ],
        )

        raw = message.content[0].text.strip()

        # Parse JSON response
        result = json.loads(raw)
        title_fr = result.get("title_fr", title)
        summary_fr = result.get("summary_fr", "")
        score = float(result.get("score", 5.0))
        score = max(1.0, min(10.0, score))

        logger.info(
            "Processed: %s → score=%.1f (%d chars summary)",
            title[:50],
            score,
            len(summary_fr),
        )

        return ArticleProcessingResult(
            title_fr=title_fr,
            summary_fr=summary_fr,
            score=score,
        )

    except json.JSONDecodeError:
        logger.warning("Could not parse JSON from Claude for: %s", title[:50])
        return None
    except anthropic.APIError as e:
        logger.error("Claude API error: %s", e)
        return None
    except Exception:
        logger.exception("Processing failed for: %s", title[:50])
        return None


# ── Legacy functions kept for backward compatibility ──

async def summarize_article(title: str, content: str) -> str:
    """Legacy: summarize only. Prefer process_article_with_claude."""
    result = await process_article_with_claude(title, content, "Unknown")
    return result.summary_fr if result else ""


async def score_article(title: str, content: str, source_name: str) -> float:
    """Legacy: score only. Prefer process_article_with_claude."""
    result = await process_article_with_claude(title, content, source_name)
    return result.score if result else 5.0
