"""Article processing using Claude API — translate + summarize + score in one call."""
from __future__ import annotations

import json
import logging

import anthropic

from workers.src.config import settings

logger = logging.getLogger(__name__)

PROCESS_SYSTEM_PROMPT = """Tu es un analyste tech spécialisé en IA, au service d'un développeur fullstack senior (React, Next.js, React Native, TypeScript, Python).

PROFIL CIBLE — scorer selon la pertinence pour CE profil :
- Développement IA : nouveaux SDKs, APIs, frameworks, outils dev, AI agents, MCP, RAG, fine-tuning
- Nouveaux modèles & tech : releases de LLMs, benchmarks, architectures, multimodal, reasoning
- Business IA : startups, funding, acquisitions, partenariats stratégiques, cas d'usage entreprise
- Bonnes pratiques : patterns d'architecture, scaling, performance, coût, sécurité IA
- Tendances : prédictions, analyses de marché, adoption enterprise, régulation

PEU PERTINENT pour ce profil (scorer bas) :
- Polémiques sociales/éthiques sans impact technique
- Art/musique/divertissement généré par IA (sauf nouveau modèle)
- Actualité gaming/jeux vidéo utilisant l'IA
- Contenu marketing/promotionnel sans substance technique
- Opinion pieces sans données ni insights concrets

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour) :
{
  "title_fr": "Titre traduit en français (concis, informatif)",
  "summary_fr": "Résumé en français, 3 à 5 phrases. Factuel, professionnel. Mettre en avant l'impact pour les développeurs et les implications techniques/business.",
  "score": 7.5
}

Critères de scoring (1.0 à 10.0) :
- 9-10 : Game changer pour les devs (nouveau modèle majeur, nouvel outil transformatif, API breakthrough)
- 7-8 : Très utile (SDK/framework release, best practice, benchmark important, grosse acquisition)
- 5-6 : Intéressant (analyse de tendance, tutoriel avancé, comparatif technique, funding notable)
- 3-4 : Mineur (news incrémentale, opinion, mise à jour mineure)
- 1-2 : Hors profil (divertissement, polémique sans impact tech, contenu recyclé)"""

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
