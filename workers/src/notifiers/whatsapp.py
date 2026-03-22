"""WhatsApp notification via UltraMsg API."""
from __future__ import annotations

import logging
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from workers.src.config import settings
from workers.src.models.article import Article, NotificationLog

logger = logging.getLogger(__name__)


def format_digest_message(articles: list[Article], digest_type: str = "quotidien") -> str:
    """Format articles into a WhatsApp digest message.

    Args:
        articles: List of articles to include.
        digest_type: Type of digest ("quotidien", "hebdomadaire").

    Returns:
        Formatted WhatsApp message string.
    """
    today = datetime.now().strftime("%d %B %Y")
    header = f"*AI NEWS — Digest {digest_type} du {today}*"

    separator = "\n" + "=" * 30 + "\n"
    body_parts: list[str] = []

    for i, article in enumerate(articles, 1):
        title = article.title_fr or article.original_title
        summary = article.summary_fr or ""
        source_name = article.source.name if article.source else "Source inconnue"
        pub_date = article.published_at.strftime("%d/%m/%Y") if article.published_at else ""
        score = article.score or 0

        part = (
            f"{i}. *{title}*\n"
            f"Source : {source_name} | {pub_date}\n"
        )
        if summary:
            part += f"{summary}\n"
        part += f"Lien : {article.url}\n"
        part += f"Score : {score}/10"

        body_parts.append(part)

    footer = f"\n_Prochain digest demain a 08h00_"
    message = header + separator + separator.join(body_parts) + separator + footer

    return message


def format_breaking_news(article: Article) -> str:
    """Format a single breaking news article for WhatsApp.

    Args:
        article: The high-score article.

    Returns:
        Formatted WhatsApp message.
    """
    title = article.title_fr or article.original_title
    summary = article.summary_fr or ""
    source_name = article.source.name if article.source else "Source inconnue"

    message = (
        f"*ALERTE AI NEWS*\n\n"
        f"*{title}*\n"
        f"Source : {source_name}\n"
    )
    if summary:
        message += f"\n{summary}\n"
    message += f"\nLien : {article.url}\n"
    message += f"Score : {article.score}/10"

    return message


async def send_whatsapp_message(message: str, recipient: str | None = None) -> bool:
    """Send a message via UltraMsg WhatsApp API.

    Args:
        message: Message text to send.
        recipient: Phone number (default: from settings).

    Returns:
        True if sent successfully.
    """
    if not settings.ultramsg_instance_id or not settings.ultramsg_token:
        logger.error("UltraMsg credentials not configured.")
        return False

    to = recipient or settings.whatsapp_recipient
    if not to:
        logger.error("No WhatsApp recipient configured.")
        return False

    url = f"https://api.ultramsg.com/{settings.ultramsg_instance_id}/messages/chat"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data={
                    "token": settings.ultramsg_token,
                    "to": to,
                    "body": message,
                },
            )
            response.raise_for_status()

            result = response.json()
            if result.get("sent") == "true" or result.get("sent") is True:
                logger.info("WhatsApp message sent to %s", to)
                return True

            logger.warning("UltraMsg response: %s", result)
            return False

    except httpx.HTTPStatusError as e:
        logger.error("UltraMsg HTTP error: %s — %s", e.response.status_code, e.response.text)
        return False
    except Exception:
        logger.exception("Failed to send WhatsApp message")
        return False


async def send_digest(
    db: Session,
    max_articles: int | None = None,
    digest_type: str = "quotidien",
) -> bool:
    """Send a digest of top articles via WhatsApp.

    Args:
        db: Database session.
        max_articles: Number of articles (default: from settings).
        digest_type: Type of digest.

    Returns:
        True if digest was sent successfully.
    """
    limit = max_articles or settings.max_articles_digest

    articles = (
        db.query(Article)
        .filter(Article.notified == False)  # noqa: E712
        .order_by(Article.score.desc())
        .limit(limit)
        .all()
    )

    if not articles:
        logger.info("No unnotified articles for digest.")
        return False

    message = format_digest_message(articles, digest_type)
    success = await send_whatsapp_message(message)

    # Log notification
    log = NotificationLog(
        type="digest" if digest_type == "quotidien" else "weekly",
        recipient=settings.whatsapp_recipient,
        content=message[:5000],
        success=success,
    )
    db.add(log)

    if success:
        # Mark articles as notified
        for article in articles:
            article.notified = True
        db.commit()
        logger.info("Digest sent: %d articles", len(articles))
    else:
        log.error = "Failed to send via UltraMsg"
        db.commit()

    return success


async def send_breaking_news_alert(article: Article, db: Session) -> bool:
    """Send a breaking news alert for a high-score article.

    Args:
        article: The breaking news article.
        db: Database session.

    Returns:
        True if alert was sent successfully.
    """
    message = format_breaking_news(article)
    success = await send_whatsapp_message(message)

    log = NotificationLog(
        type="breaking",
        recipient=settings.whatsapp_recipient,
        content=message[:5000],
        success=success,
    )
    db.add(log)

    if success:
        article.notified = True
        db.commit()
        logger.info("Breaking news alert sent: %s", article.original_title[:50])
    else:
        log.error = "Failed to send via UltraMsg"
        db.commit()

    return success
