"""Article summarization using Claude API."""

import logging

import anthropic

from workers.src.config import settings

logger = logging.getLogger(__name__)

SUMMARY_SYSTEM_PROMPT = """Tu es un journaliste tech spécialisé en intelligence artificielle.
Ta mission : résumer des articles d'actualité IA en français, de manière concise et factuelle.

Règles :
- Résumé en 3 à 5 phrases maximum
- Français correct et professionnel
- Mentionner les faits clés : qui, quoi, quand, pourquoi
- Pas de sensationnalisme ni d'opinion
- Utiliser des termes techniques appropriés sans jargon inutile
"""

SUMMARY_PROMPT_TEMPLATE = """Résume cet article en français (3-5 phrases) :

Titre : {title}

Contenu :
{content}

Résumé :"""

SCORE_SYSTEM_PROMPT = """Tu es un expert en veille technologique IA.
Évalue la pertinence et l'importance d'un article d'actualité IA sur une échelle de 1 à 10.

Critères de scoring :
- 9-10 : Annonce majeure (nouveau modèle, breakthrough, acquisition significative)
- 7-8 : Nouvelle importante (mise à jour majeure, benchmark, partenariat)
- 5-6 : Intéressant (tutoriel avancé, analyse de tendance, comparatif)
- 3-4 : Mineur (mise à jour incrémentale, opinion, blog post standard)
- 1-2 : Peu pertinent (marketing, contenu recyclé, tangentiel à l'IA)

Réponds UNIQUEMENT avec un nombre décimal entre 1.0 et 10.0, rien d'autre."""

SCORE_PROMPT_TEMPLATE = """Évalue cet article (score 1.0 à 10.0) :

Titre : {title}
Source : {source}
Contenu : {content}

Score :"""


async def summarize_article(title: str, content: str) -> str:
    """Generate a French summary of an article using Claude API.

    Args:
        title: Article title.
        content: Article content or description.

    Returns:
        French summary (3-5 sentences), or empty string on failure.
    """
    if not settings.anthropic_api_key:
        logger.warning("Anthropic API key not configured. Skipping summarization.")
        return ""

    if not content.strip():
        content = title

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            system=SUMMARY_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": SUMMARY_PROMPT_TEMPLATE.format(
                        title=title,
                        content=content[:3000],  # Limit content length
                    ),
                },
            ],
        )

        summary = message.content[0].text.strip()
        logger.info("Summarized: %s (%d chars)", title[:50], len(summary))
        return summary

    except anthropic.APIError as e:
        logger.error("Claude API error: %s", e)
        return ""
    except Exception:
        logger.exception("Summarization failed for: %s", title[:50])
        return ""


async def score_article(title: str, content: str, source_name: str) -> float:
    """Score an article's relevance using Claude API.

    Args:
        title: Article title.
        content: Article content.
        source_name: Name of the source.

    Returns:
        Relevance score (1.0-10.0), or 5.0 on failure.
    """
    if not settings.anthropic_api_key:
        logger.warning("Anthropic API key not configured. Using default score.")
        return 5.0

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            system=SCORE_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": SCORE_PROMPT_TEMPLATE.format(
                        title=title,
                        source=source_name,
                        content=content[:2000],
                    ),
                },
            ],
        )

        score_text = message.content[0].text.strip()
        score = float(score_text)
        return max(1.0, min(10.0, score))

    except (ValueError, TypeError):
        logger.warning("Could not parse score for: %s", title[:50])
        return 5.0
    except Exception:
        logger.exception("Scoring failed for: %s", title[:50])
        return 5.0
