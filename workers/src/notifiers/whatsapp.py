"""WhatsApp notification via UltraMsg API — Multi-user support."""
from __future__ import annotations

import logging
from datetime import datetime

import httpx
from sqlalchemy import and_, exists, func, or_
from sqlalchemy.orm import Session, joinedload

from workers.src.config import settings
from workers.src.models.article import (
    Article,
    Category,
    NotificationLog,
    User,
    UserNotificationStatus,
    UserPreferences,
)
from workers.src.notifiers.email import send_email_digest_to_user
from workers.src.notifiers.telegram import send_telegram_digest_to_user

logger = logging.getLogger(__name__)

_ULTRAMSG_SEND_ERROR = "Failed to send via UltraMsg"


def _get_localized_fields(article: Article, language: str) -> tuple[str, str]:
    """Extract title and summary from an article based on language preference.

    Args:
        article: The article to extract fields from.
        language: Language code ("fr", "en", "ar").

    Returns:
        Tuple of (title, summary).
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
    return title, summary


def _format_article_part(
    article: Article, index: int, language: str
) -> str:
    """Format a single article entry for a digest message.

    Args:
        article: The article to format.
        index: 1-based position in the digest.
        language: Language code for localized fields.

    Returns:
        Formatted article string.
    """
    title, summary = _get_localized_fields(article, language)
    source_name = article.source.name if article.source else "Unknown"
    pub_date = (
        article.published_at.strftime("%d/%m/%Y") if article.published_at else ""
    )
    score = article.score or 0

    part = f"{index}. *{title}*\nSource : {source_name} | {pub_date}\n"
    if summary:
        part += f"{summary}\n"
    part += f"Link : {article.url}\nScore : {score}/10"
    return part


def format_digest_message(
    articles: list[Article],
    digest_type: str = "quotidien",
    language: str = "fr",
) -> str:
    """Format articles into a WhatsApp digest message.

    Args:
        articles: List of articles to include.
        digest_type: Type of digest ("quotidien", "hebdomadaire").
        language: User language preference ("fr", "en", "ar").

    Returns:
        Formatted WhatsApp message string.
    """
    today = datetime.now().strftime("%d %B %Y")

    headers = {
        "fr": f"*AI NEWS — Digest {digest_type} du {today}*",
        "en": f"*AI NEWS — {digest_type.capitalize()} Digest — {today}*",
        "ar": f"*AI NEWS — ملخص {today}*",
    }
    header = headers.get(language, headers["fr"])

    separator = "\n" + "=" * 30 + "\n"
    body_parts = [
        _format_article_part(article, i, language)
        for i, article in enumerate(articles, 1)
    ]

    message = header + separator + separator.join(body_parts) + separator
    return message


def format_breaking_news(article: Article, language: str = "fr") -> str:
    """Format a single breaking news article for WhatsApp.

    Args:
        article: The high-score article.
        language: User language preference ("fr", "en", "ar").

    Returns:
        Formatted WhatsApp message.
    """
    title, summary = _get_localized_fields(article, language)
    source_name = article.source.name if article.source else "Unknown"

    message = f"*ALERT AI NEWS*\n\n*{title}*\nSource : {source_name}\n"
    if summary:
        message += f"\n{summary}\n"
    message += f"\nLink : {article.url}\nScore : {article.score}/10"
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
        logger.error(
            "UltraMsg HTTP error: %s — %s", e.response.status_code, e.response.text
        )
        return False
    except Exception:
        logger.exception("Failed to send WhatsApp message")
        return False


def _get_articles_for_user(
    db: Session,
    user: User,
    prefs: UserPreferences,
    max_articles: int | None = None,
) -> list[Article]:
    """Get articles filtered by user preferences, excluding already-sent ones.

    Filters applied:
    - Score >= user's min_score_alert
    - Not already sent to this user (via UserNotificationStatus)
    - Source in user's selected sources (if any configured)
    - Category keywords match article title/content (if any configured)

    Args:
        db: Database session.
        user: The target user.
        prefs: The user's preferences.
        max_articles: Override for max articles (default: from prefs).

    Returns:
        List of articles matching the user's preferences.
    """
    limit = max_articles or prefs.max_articles_digest

    query = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(Article.score >= prefs.min_score_alert)
        # Exclude articles already sent to this user
        .filter(
            ~exists().where(
                and_(
                    UserNotificationStatus.user_id == user.id,
                    UserNotificationStatus.article_id == Article.id,
                )
            )
        )
    )

    # Filter by user's selected sources (if any)
    user_source_ids = [us.source_id for us in prefs.sources]
    if user_source_ids:
        query = query.filter(Article.source_id.in_(user_source_ids))

    # Filter by user's selected categories via keyword matching
    user_category_ids = [uc.category_id for uc in prefs.categories]
    if user_category_ids:
        categories = (
            db.query(Category).filter(Category.id.in_(user_category_ids)).all()
        )
        all_keywords: list[str] = []
        for cat in categories:
            if cat.keywords:
                all_keywords.extend(cat.keywords)

        if all_keywords:
            keyword_filters = []
            for kw in all_keywords:
                kw_lower = kw.lower()
                keyword_filters.append(
                    func.lower(Article.original_title).contains(kw_lower)
                )
                keyword_filters.append(
                    func.lower(Article.original_content).contains(kw_lower)
                )
            query = query.filter(or_(*keyword_filters))

    articles: list[Article] = (
        query.order_by(Article.score.desc()).limit(limit).all()
    )
    return articles


async def send_digest_to_user(
    db: Session,
    user: User,
    prefs: UserPreferences,
    max_articles: int | None = None,
    digest_type: str = "quotidien",
) -> bool:
    """Send a digest to a single user based on their preferences.

    Args:
        db: Database session.
        user: Target user.
        prefs: User's preferences (must include whatsapp_number).
        max_articles: Override for max articles.
        digest_type: Type of digest.

    Returns:
        True if digest was sent successfully.
    """
    if not prefs.whatsapp_number:
        logger.debug("User %s has no WhatsApp number configured", user.id)
        return False

    articles = _get_articles_for_user(db, user, prefs, max_articles)

    if not articles:
        logger.debug("No articles for user %s digest", user.id)
        return False

    message = format_digest_message(articles, digest_type, language=prefs.language)
    success = await send_whatsapp_message(message, recipient=prefs.whatsapp_number)

    # Log notification
    log = NotificationLog(
        type="digest" if digest_type == "quotidien" else "weekly",
        recipient=prefs.whatsapp_number,
        content=message[:5000],
        success=success,
        user_id=user.id,
    )
    db.add(log)

    if success:
        # Track per-user notification status
        for article in articles:
            status = UserNotificationStatus(
                user_id=user.id,
                article_id=article.id,
                channel="whatsapp",
            )
            db.add(status)
        db.commit()
        logger.info("Digest sent to user %s: %d articles", user.id, len(articles))
    else:
        log.error = _ULTRAMSG_SEND_ERROR
        db.commit()

    return success


async def send_digest_all_users(
    db: Session,
    max_articles: int | None = None,
    digest_type: str = "quotidien",
) -> dict[str, bool]:
    """Send digest to ALL users with digest_enabled and a whatsapp_number.

    Skips users whose subscription status is not active or trialing.

    Args:
        db: Database session.
        max_articles: Override for max articles per user.
        digest_type: Type of digest.

    Returns:
        Dict mapping user_id to success boolean.
    """
    users_with_prefs = (
        db.query(User)
        .join(UserPreferences)
        .options(
            joinedload(User.preferences).joinedload(UserPreferences.categories),
            joinedload(User.preferences).joinedload(UserPreferences.sources),
            joinedload(User.subscription),
        )
        .filter(UserPreferences.digest_enabled == True)  # noqa: E712
        .filter(UserPreferences.whatsapp_number != None)  # noqa: E711
        .all()
    )

    results: dict[str, bool] = {}
    for user in users_with_prefs:
        if not user.preferences:
            continue

        # Check subscription is active (free tier users can still get digests)
        if user.subscription and user.subscription.status not in (
            "active",
            "trialing",
        ):
            logger.debug(
                "Skipping user %s — subscription %s",
                user.id,
                user.subscription.status,
            )
            continue

        success = await send_digest_to_user(
            db, user, user.preferences, max_articles, digest_type
        )
        results[user.id] = success

    sent_count = sum(1 for v in results.values() if v)
    logger.info(
        "Multi-user digest complete: %d/%d users received digest",
        sent_count,
        len(results),
    )
    return results


async def send_breaking_news_alert_all_users(article: Article, db: Session) -> int:
    """Send a breaking news alert to all users whose min_score_alert <= article.score.

    Args:
        article: The breaking news article.
        db: Database session.

    Returns:
        Number of users successfully notified.
    """
    users = (
        db.query(User)
        .join(UserPreferences)
        .options(joinedload(User.preferences))
        .filter(UserPreferences.whatsapp_number != None)  # noqa: E711
        .filter(UserPreferences.min_score_alert <= article.score)
        .all()
    )

    sent_count = 0
    for user in users:
        if not user.preferences or not user.preferences.whatsapp_number:
            continue

        # Check if already notified for this article
        already_notified = (
            db.query(UserNotificationStatus)
            .filter(
                UserNotificationStatus.user_id == user.id,
                UserNotificationStatus.article_id == article.id,
            )
            .first()
        )
        if already_notified:
            continue

        message = format_breaking_news(article, language=user.preferences.language)
        success = await send_whatsapp_message(
            message, recipient=user.preferences.whatsapp_number
        )

        log = NotificationLog(
            type="breaking",
            recipient=user.preferences.whatsapp_number,
            content=message[:5000],
            success=success,
            user_id=user.id,
        )
        db.add(log)

        if success:
            status = UserNotificationStatus(
                user_id=user.id,
                article_id=article.id,
                channel="whatsapp",
            )
            db.add(status)
            sent_count += 1

    db.commit()
    if sent_count:
        logger.info(
            "Breaking news sent to %d users: %s",
            sent_count,
            article.original_title[:50],
        )
    return sent_count


async def _send_whatsapp_digest(
    db: Session,
    user: User,
    prefs: UserPreferences,
    articles: list[Article],
    digest_type: str,
) -> bool:
    """Send WhatsApp digest and log the result.

    Args:
        db: Database session.
        user: Target user.
        prefs: User's preferences (must include whatsapp_number).
        articles: Articles to include.
        digest_type: Type of digest.

    Returns:
        True if the message was sent successfully.
    """
    message = format_digest_message(articles, digest_type, language=prefs.language)
    success = await send_whatsapp_message(message, recipient=prefs.whatsapp_number)

    log = NotificationLog(
        type="digest" if digest_type == "quotidien" else "weekly",
        recipient=prefs.whatsapp_number,
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
                    UserNotificationStatus.channel == "whatsapp",
                )
                .first()
            )
            if not existing:
                db.add(
                    UserNotificationStatus(
                        user_id=user.id,
                        article_id=article.id,
                        channel="whatsapp",
                    )
                )
        db.commit()
    else:
        log.error = _ULTRAMSG_SEND_ERROR
        db.commit()

    return success


def _normalize_digest_type(digest_type: str) -> str:
    """Convert French digest type to English for email/telegram channels.

    Args:
        digest_type: Digest type string (may be "quotidien" or "hebdomadaire").

    Returns:
        Normalized English digest type ("daily" or "weekly").
    """
    return "daily" if digest_type == "quotidien" else "weekly"


async def send_multichannel_digest_to_user(
    db: Session,
    user: User,
    prefs: UserPreferences,
    max_articles: int | None = None,
    digest_type: str = "quotidien",
) -> dict[str, bool]:
    """Send a digest to a user via all configured channels.

    Dispatches to WhatsApp, email, and Telegram based on the user's
    preferences. Each channel is independent -- a failure in one does
    not block the others.

    Args:
        db: Database session.
        user: Target user.
        prefs: User's preferences.
        max_articles: Override for max articles.
        digest_type: Type of digest.

    Returns:
        Dict mapping channel name to success boolean.
    """
    articles = _get_articles_for_user(db, user, prefs, max_articles)

    if not articles:
        logger.debug("No articles for user %s digest", user.id)
        return {}

    results: dict[str, bool] = {}

    if prefs.whatsapp_number:
        results["whatsapp"] = await _send_whatsapp_digest(
            db, user, prefs, articles, digest_type
        )

    normalized_type = _normalize_digest_type(digest_type)

    if prefs.email_notifications and user.email:
        results["email"] = await send_email_digest_to_user(
            db, user, prefs, articles, normalized_type
        )

    if prefs.telegram_chat_id:
        results["telegram"] = await send_telegram_digest_to_user(
            db, user, prefs, articles, normalized_type
        )

    if results:
        sent_channels = [ch for ch, ok in results.items() if ok]
        logger.info(
            "Multi-channel digest for user %s: %d articles via %s",
            user.id,
            len(articles),
            ", ".join(sent_channels) if sent_channels else "none",
        )

    return results


async def send_digest_all_users_multichannel(
    db: Session,
    max_articles: int | None = None,
    digest_type: str = "quotidien",
) -> dict[str, dict[str, bool]]:
    """Send digest to ALL eligible users via all configured channels.

    Skips users whose subscription status is not active or trialing.

    Args:
        db: Database session.
        max_articles: Override for max articles per user.
        digest_type: Type of digest.

    Returns:
        Dict mapping user_id to channel results.
    """
    users_with_prefs = (
        db.query(User)
        .join(UserPreferences)
        .options(
            joinedload(User.preferences).joinedload(UserPreferences.categories),
            joinedload(User.preferences).joinedload(UserPreferences.sources),
            joinedload(User.subscription),
        )
        .filter(UserPreferences.digest_enabled == True)  # noqa: E712
        # Include users with ANY notification channel configured
        .filter(
            or_(
                UserPreferences.whatsapp_number != None,  # noqa: E711
                UserPreferences.email_notifications == True,  # noqa: E712
                UserPreferences.telegram_chat_id != None,  # noqa: E711
            )
        )
        .all()
    )

    results: dict[str, dict[str, bool]] = {}
    for user in users_with_prefs:
        if not user.preferences:
            continue

        if user.subscription and user.subscription.status not in (
            "active",
            "trialing",
        ):
            logger.debug(
                "Skipping user %s \u2014 subscription %s",
                user.id,
                user.subscription.status,
            )
            continue

        channel_results = await send_multichannel_digest_to_user(
            db, user, user.preferences, max_articles, digest_type
        )
        results[user.id] = channel_results

    total_users = len(results)
    users_with_any = sum(
        1 for cr in results.values() if any(cr.values())
    )
    logger.info(
        "Multi-channel digest complete: %d/%d users received at least one channel",
        users_with_any,
        total_users,
    )
    return results


# ── Legacy single-user functions (backward compatibility) ──────────────────────


async def send_digest(
    db: Session,
    max_articles: int | None = None,
    digest_type: str = "quotidien",
) -> bool:
    """Send digest — delegates to multi-user if users exist in DB.

    Falls back to legacy single-recipient behavior (using env config)
    when no users are registered yet.

    Args:
        db: Database session.
        max_articles: Number of articles (default: from settings).
        digest_type: Type of digest.

    Returns:
        True if at least one digest was sent successfully.
    """
    user_count = db.query(User).count()

    if user_count > 0:
        results = await send_digest_all_users(db, max_articles, digest_type)
        return any(results.values()) if results else False

    # Legacy fallback: single recipient from env
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

    log = NotificationLog(
        type="digest" if digest_type == "quotidien" else "weekly",
        recipient=settings.whatsapp_recipient,
        content=message[:5000],
        success=success,
    )
    db.add(log)

    if success:
        for article in articles:
            article.notified = True
        db.commit()
        logger.info("Legacy digest sent: %d articles", len(articles))
    else:
        log.error = _ULTRAMSG_SEND_ERROR
        db.commit()

    return success


async def send_breaking_news_alert(article: Article, db: Session) -> bool:
    """Send breaking news alert — delegates to multi-user if users exist.

    Falls back to legacy single-recipient behavior when no users are registered.

    Args:
        article: The breaking news article.
        db: Database session.

    Returns:
        True if alert was sent successfully.
    """
    user_count = db.query(User).count()

    if user_count > 0:
        sent = await send_breaking_news_alert_all_users(article, db)
        return sent > 0

    # Legacy fallback
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
        log.error = _ULTRAMSG_SEND_ERROR
        db.commit()

    return success
