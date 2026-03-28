"""Telegram bot notification."""
from __future__ import annotations

import logging
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from workers.src.config import settings
from workers.src.models.article import (
    Article,
    NotificationLog,
    User,
    UserNotificationStatus,
    UserPreferences,
)

logger = logging.getLogger(__name__)


def format_telegram_digest(
    articles: list[Article],
    digest_type: str = "daily",
    language: str = "fr",
) -> str:
    """Format articles for Telegram using Markdown.

    Args:
        articles: List of articles to include.
        digest_type: Type of digest ("daily", "weekly").
        language: Language code ("fr", "en", "ar").

    Returns:
        Formatted Markdown message string.
    """
    today = datetime.now().strftime("%d/%m/%Y")

    headers: dict[str, str] = {
        "fr": f"*AI News \u2014 Digest {digest_type}*\n_{today}_",
        "en": f"*AI News \u2014 {digest_type.capitalize()} Digest*\n_{today}_",
        "ar": f"*AI News \u2014 \u0645\u0644\u062e\u0635*\n_{today}_",
    }
    header = headers.get(language, headers["en"])

    parts: list[str] = [header, ""]
    for i, article in enumerate(articles, 1):
        if language == "en":
            title = article.title_en or article.title_fr or article.original_title
        elif language == "ar":
            title = article.title_ar or article.title_fr or article.original_title
        else:
            title = article.title_fr or article.original_title

        source_name = article.source.name if article.source else "Unknown"
        score = article.score or 0

        parts.append(f"{i}. [{title}]({article.url})")
        parts.append(f"   _{source_name}_ | Score: {score}/10")
        parts.append("")

    return "\n".join(parts)


async def send_telegram_message(chat_id: str, message: str) -> bool:
    """Send a message via Telegram Bot API.

    Args:
        chat_id: Telegram chat ID to send to.
        message: Message text (Markdown formatted).

    Returns:
        True if sent successfully.
    """
    if not settings.telegram_bot_token:
        logger.error("Telegram bot token not configured.")
        return False

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": "Markdown",
                    "disable_web_page_preview": True,
                },
            )
            response.raise_for_status()
            result = response.json()
            if result.get("ok"):
                logger.info("Telegram message sent to %s", chat_id)
                return True
            logger.warning("Telegram response: %s", result)
            return False
    except httpx.HTTPStatusError as e:
        logger.error(
            "Telegram HTTP error: %s \u2014 %s",
            e.response.status_code,
            e.response.text,
        )
        return False
    except Exception:
        logger.exception("Failed to send Telegram message")
        return False


async def send_telegram_digest_to_user(
    db: Session,
    user: User,
    prefs: UserPreferences,
    articles: list[Article],
    digest_type: str = "daily",
) -> bool:
    """Send Telegram digest to a user.

    Args:
        db: Database session.
        user: Target user.
        prefs: User's preferences (must include telegram_chat_id).
        articles: Articles to include in the digest.
        digest_type: Type of digest ("daily", "weekly").

    Returns:
        True if the message was sent successfully.
    """
    if not prefs.telegram_chat_id:
        return False

    message = format_telegram_digest(articles, digest_type, language=prefs.language)
    success = await send_telegram_message(prefs.telegram_chat_id, message)

    log = NotificationLog(
        type=f"telegram_{digest_type}",
        recipient=prefs.telegram_chat_id,
        content=message[:5000],
        success=success,
        user_id=user.id,
    )
    db.add(log)

    if success:
        for article in articles:
            existing = (
                db.query(UserNotificationStatus)
                .filter(
                    UserNotificationStatus.user_id == user.id,
                    UserNotificationStatus.article_id == article.id,
                    UserNotificationStatus.channel == "telegram",
                )
                .first()
            )
            if not existing:
                db.add(
                    UserNotificationStatus(
                        user_id=user.id,
                        article_id=article.id,
                        channel="telegram",
                    )
                )
        db.commit()

    return success
