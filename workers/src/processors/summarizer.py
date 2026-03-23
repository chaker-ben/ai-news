"""Article processing using Claude API — trilingual translate + summarize + score in one call."""
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

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour).
Produis le titre et résumé en 3 langues (français, anglais, arabe) :
{
  "title_fr": "Titre en français",
  "summary_fr": "Résumé français, 2-3 phrases. Factuel, impact dev/business.",
  "title_en": "English title",
  "summary_en": "English summary, 2-3 sentences. Factual, dev/business impact.",
  "title_ar": "العنوان بالعربية",
  "summary_ar": "ملخص بالعربية، ٢-٣ جمل. واقعي، تأثير تقني/تجاري.",
  "score": 7.5
}

Critères de scoring (1.0 à 10.0) :
- 9-10 : Game changer pour les devs (nouveau modèle majeur, nouvel outil transformatif, API breakthrough)
- 7-8 : Très utile (SDK/framework release, best practice, benchmark important, grosse acquisition)
- 5-6 : Intéressant (analyse de tendance, tutoriel avancé, comparatif technique, funding notable)
- 3-4 : Mineur (news incrémentale, opinion, mise à jour mineure)
- 1-2 : Hors profil (divertissement, polémique sans impact tech, contenu recyclé)"""

PROCESS_PROMPT_TEMPLATE = """Analyse cet article et retourne le JSON trilingue (FR + EN + AR + score) :

Titre original : {title}
Source : {source}

Contenu :
{content}"""


class ArticleProcessingResult:
    """Result of processing an article with Claude — trilingual."""

    __slots__ = (
        "title_fr", "summary_fr",
        "title_en", "summary_en",
        "title_ar", "summary_ar",
        "score",
    )

    def __init__(
        self,
        title_fr: str, summary_fr: str,
        title_en: str, summary_en: str,
        title_ar: str, summary_ar: str,
        score: float,
    ):
        self.title_fr = title_fr
        self.summary_fr = summary_fr
        self.title_en = title_en
        self.summary_en = summary_en
        self.title_ar = title_ar
        self.summary_ar = summary_ar
        self.score = score


async def process_article_with_claude(
    title: str,
    content: str,
    source_name: str,
) -> ArticleProcessingResult | None:
    """Process an article with Claude: trilingual translate + summarize + score in ONE call.

    Returns:
        ArticleProcessingResult with all 3 languages + score, or None on failure.
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
            max_tokens=900,
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
        result = json.loads(raw)

        score = float(result.get("score", 5.0))
        score = max(1.0, min(10.0, score))

        processed = ArticleProcessingResult(
            title_fr=result.get("title_fr", title),
            summary_fr=result.get("summary_fr", ""),
            title_en=result.get("title_en", title),
            summary_en=result.get("summary_en", ""),
            title_ar=result.get("title_ar", ""),
            summary_ar=result.get("summary_ar", ""),
            score=score,
        )

        logger.info(
            "Processed (3 langs): %s → score=%.1f",
            title[:50],
            score,
        )
        return processed

    except json.JSONDecodeError:
        logger.warning("Could not parse JSON from Claude for: %s", title[:50])
        return None
    except anthropic.APIError as e:
        logger.error("Claude API error: %s", e)
        return None
    except Exception:
        logger.exception("Processing failed for: %s", title[:50])
        return None
