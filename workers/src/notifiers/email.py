"""Email notification via Resend API."""
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


def _format_article_html(article: Article, language: str = "fr") -> str:
    """Format a single article as HTML for email.

    Args:
        article: The article to format.
        language: Language code ("fr", "en", "ar").

    Returns:
        HTML table row string.
    """
    if language == "en":
        title = article.title_en or article.title_fr or article.original_title
        summary = article.summary_en or article.summary_fr or ""
    elif language == "ar":
        title = article.title_ar or article.title_fr or article.original_title
        summary = article.summary_ar or article.summary_fr or ""
    else:
        title = article.title_fr or article.original_title
        summary = article.summary_fr or ""

    source_name = article.source.name if article.source else "Unknown"
    score = article.score or 0

    return f"""
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #1e293b;">
        <div style="margin-bottom: 8px;">
          <span style="background: #1e3a5f; color: #60a5fa; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{source_name}</span>
          <span style="color: #60a5fa; font-size: 12px; font-weight: 600; margin-inline-start: 8px;">{score}/10</span>
        </div>
        <a href="{article.url}" style="color: #f1f5f9; text-decoration: none; font-size: 16px; font-weight: 600;">{title}</a>
        <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px; line-height: 1.5;">{summary}</p>
      </td>
    </tr>
    """


def format_digest_email(
    articles: list[Article],
    digest_type: str = "daily",
    language: str = "fr",
) -> tuple[str, str]:
    """Format articles into an HTML email digest.

    Args:
        articles: List of articles to include.
        digest_type: Type of digest ("daily", "weekly").
        language: Language code ("fr", "en", "ar").

    Returns:
        Tuple of (subject, html_body).
    """
    today = datetime.now().strftime("%B %d, %Y")

    subjects: dict[str, str] = {
        "fr": f"AI News \u2014 Digest {digest_type} du {today}",
        "en": f"AI News \u2014 {digest_type.capitalize()} Digest \u2014 {today}",
        "ar": f"AI News \u2014 \u0645\u0644\u062e\u0635 {today}",
    }
    subject = subjects.get(language, subjects["en"])

    articles_html = "".join(_format_article_html(a, language) for a in articles)

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="background: #0f172a; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #60a5fa; font-size: 24px; margin: 0;">AI News</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0;">{subject}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          {articles_html}
        </table>

        <div style="text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b;">
          <p style="color: #64748b; font-size: 12px;">
            You're receiving this because you subscribed to AI News digests.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    return subject, html


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend API.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        html: HTML body content.

    Returns:
        True if sent successfully.
    """
    if not settings.resend_api_key:
        logger.error("Resend API key not configured.")
        return False

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.email_from,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
            )
            response.raise_for_status()
            logger.info("Email sent to %s: %s", to, subject)
            return True
    except httpx.HTTPStatusError as e:
        logger.error(
            "Resend HTTP error: %s \u2014 %s",
            e.response.status_code,
            e.response.text,
        )
        return False
    except Exception:
        logger.exception("Failed to send email")
        return False


async def send_email_digest_to_user(
    db: Session,
    user: User,
    prefs: UserPreferences,
    articles: list[Article],
    digest_type: str = "daily",
) -> bool:
    """Send email digest to a user.

    Args:
        db: Database session.
        user: Target user (must have an email).
        prefs: User's preferences.
        articles: Articles to include in the digest.
        digest_type: Type of digest ("daily", "weekly").

    Returns:
        True if the email was sent successfully.
    """
    if not prefs.email_notifications or not user.email:
        return False

    subject, html = format_digest_email(articles, digest_type, language=prefs.language)
    success = await send_email(user.email, subject, html)

    log = NotificationLog(
        type=f"email_{digest_type}",
        recipient=user.email,
        content=subject,
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
                    UserNotificationStatus.channel == "email",
                )
                .first()
            )
            if not existing:
                db.add(
                    UserNotificationStatus(
                        user_id=user.id,
                        article_id=article.id,
                        channel="email",
                    )
                )
        db.commit()

    return success
