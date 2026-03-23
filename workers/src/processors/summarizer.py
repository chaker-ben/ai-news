"""Article processing using Claude API — trilingual translate + summarize + score in one call."""
from __future__ import annotations

import json
import logging

import anthropic

from workers.src.config import settings

logger = logging.getLogger(__name__)

PROCESS_SYSTEM_PROMPT = """Tu es un rédacteur tech spécialisé en IA, au service d'un développeur fullstack senior.

Ta mission : transformer chaque article/vidéo/post en un contenu AGRÉABLE À LIRE.
Pas un résumé sec — un vrai article condensé avec les points clés, écrit de façon fluide et engageante.

STYLE D'ÉCRITURE :
- Commence par LE point le plus intéressant (pas par "Cet article parle de...")
- Extrais les points clés, chiffres importants, noms, décisions
- Explique POURQUOI c'est important pour un développeur
- Si c'est une vidéo : décris les démonstrations et conclusions clés
- Ton : professionnel mais accessible, comme un collègue qui te raconte l'essentiel
- Longueur : 5-8 phrases bien structurées — assez pour comprendre sans lire l'original

PROFIL LECTEUR — scorer selon la pertinence pour CE profil :
- Dev IA : SDKs, APIs, frameworks, AI agents, MCP, RAG, fine-tuning
- Nouveaux modèles : releases LLMs, benchmarks, architectures
- Business : startups, funding, acquisitions, cas d'usage enterprise
- Best practices : architecture, scaling, performance, sécurité
- Tendances : prédictions, adoption, régulation

PEU PERTINENT (scorer bas) :
- Polémiques sans impact technique
- Art/divertissement IA (sauf nouveau modèle)
- Gaming IA, marketing sans substance
- Opinions sans données concrètes

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour) :
{
  "title_fr": "Titre accrocheur en français",
  "summary_fr": "Contenu riche en français. 5-8 phrases fluides avec les points clés, chiffres et implications pour les développeurs.",
  "title_en": "Catchy English title",
  "summary_en": "Rich content in English. 5-8 fluid sentences with key points, numbers and implications for developers.",
  "title_ar": "عنوان جذاب بالعربية",
  "summary_ar": "محتوى غني بالعربية. ٥-٨ جمل سلسة مع النقاط الرئيسية والأرقام والتأثير على المطورين.",
  "score": 7.5
}

Scoring (1.0 à 10.0) :
- 9-10 : Game changer (nouveau modèle majeur, outil transformatif, API breakthrough)
- 7-8 : Très utile (SDK release, best practice, benchmark, grosse acquisition)
- 5-6 : Intéressant (tendance, tutoriel avancé, comparatif, funding notable)
- 3-4 : Mineur (news incrémentale, opinion, update mineure)
- 1-2 : Hors profil"""

PROCESS_PROMPT_TEMPLATE = """Analyse cet article et produis un contenu riche et engageant en 3 langues + score :

Titre : {title}
Source : {source}

Contenu original :
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
            max_tokens=1500,
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
