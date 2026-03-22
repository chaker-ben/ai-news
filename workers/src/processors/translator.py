"""Translation module using DeepL API."""
from __future__ import annotations

import logging

import httpx

from workers.src.config import settings

logger = logging.getLogger(__name__)

DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"


async def translate_text(
    text: str,
    target_lang: str = "FR",
    source_lang: str = "EN",
) -> str:
    """Translate text using DeepL API.

    Args:
        text: Text to translate.
        target_lang: Target language code (default: FR).
        source_lang: Source language code (default: EN).

    Returns:
        Translated text, or original text if translation fails.
    """
    if not settings.deepl_api_key:
        logger.warning("DeepL API key not configured. Returning original text.")
        return text

    if not text.strip():
        return text

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                DEEPL_API_URL,
                data={
                    "auth_key": settings.deepl_api_key,
                    "text": text,
                    "target_lang": target_lang,
                    "source_lang": source_lang,
                },
            )
            response.raise_for_status()

            result = response.json()
            translated = result["translations"][0]["text"]
            logger.debug("Translated: %s -> %s", text[:50], translated[:50])
            return translated

    except httpx.HTTPStatusError as e:
        logger.error("DeepL API error: %s — %s", e.response.status_code, e.response.text)
        return text
    except Exception:
        logger.exception("Translation failed")
        return text


async def translate_title(title: str) -> str:
    """Translate an article title to French."""
    return await translate_text(title, target_lang="FR")


async def translate_batch(texts: list[str], target_lang: str = "FR") -> list[str]:
    """Translate a batch of texts.

    Args:
        texts: List of texts to translate.
        target_lang: Target language code.

    Returns:
        List of translated texts.
    """
    if not settings.deepl_api_key:
        logger.warning("DeepL API key not configured. Returning original texts.")
        return texts

    if not texts:
        return []

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                DEEPL_API_URL,
                data={
                    "auth_key": settings.deepl_api_key,
                    "text": texts,
                    "target_lang": target_lang,
                    "source_lang": "EN",
                },
            )
            response.raise_for_status()

            result = response.json()
            return [t["text"] for t in result["translations"]]

    except Exception:
        logger.exception("Batch translation failed")
        return texts
