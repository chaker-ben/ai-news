"""SQLAlchemy models for AI News."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

from workers.src.config import settings


class Base(DeclarativeBase):
    """Base class for all models."""


class Source(Base):
    """A news source to collect from."""

    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    type = Column(
        Enum(
            "blog", "twitter", "youtube", "tiktok", "reddit", "linkedin", "arxiv",
            name="source_type",
        ),
        nullable=False,
    )
    url = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    last_collected = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    articles = relationship("Article", back_populates="source")

    def __repr__(self) -> str:
        return f"<Source(name={self.name!r}, type={self.type!r})>"


class Article(Base):
    """A collected and processed news article."""

    __tablename__ = "articles"
    __table_args__ = (
        Index("ix_articles_score", "score"),
        Index("ix_articles_published_at", "published_at"),
        Index("ix_articles_notified", "notified"),
        Index("ix_articles_source_type", "source_type"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String, ForeignKey("sources.id"), nullable=False)
    source_type = Column(
        Enum(
            "blog", "twitter", "youtube", "tiktok", "reddit", "linkedin", "arxiv",
            name="source_type",
            create_type=False,
        ),
        nullable=False,
    )
    original_title = Column(String, nullable=False)
    title_fr = Column(String, nullable=True)
    title_en = Column(String, nullable=True)
    title_ar = Column(String, nullable=True)
    original_content = Column(Text, nullable=True)
    summary_fr = Column(Text, nullable=True)
    summary_en = Column(Text, nullable=True)
    summary_ar = Column(Text, nullable=True)
    url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=False)
    collected_at = Column(DateTime, default=datetime.utcnow)
    score = Column(Float, default=0.0)
    notified = Column(Boolean, default=False)
    content_hash = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source = relationship("Source", back_populates="articles")

    def __repr__(self) -> str:
        return f"<Article(title={self.original_title!r}, score={self.score})>"


class NotificationLog(Base):
    """Log of sent notifications."""

    __tablename__ = "notification_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String, nullable=False)  # "digest", "breaking", "weekly"
    recipient = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)
    error = Column(String, nullable=True)

    def __repr__(self) -> str:
        return f"<NotificationLog(type={self.type!r}, success={self.success})>"


class User(Base):
    """User synced from Clerk webhooks (read-only from workers)."""

    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Clerk user ID
    email = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    preferences = relationship("UserPreferences", uselist=False, back_populates="user")
    subscription = relationship("Subscription", uselist=False, back_populates="user")


class UserPreferences(Base):
    """User notification and content preferences."""

    __tablename__ = "user_preferences"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # Notification channels
    whatsapp_number = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    email_notifications = Column(Boolean, default=True)

    # Digest settings
    digest_time = Column(String, default="08:00")  # HH:mm
    timezone = Column(String, default="Europe/Paris")
    digest_enabled = Column(Boolean, default=True)
    weekly_digest_enabled = Column(Boolean, default=True)

    # Content preferences
    min_score_alert = Column(Float, default=7.0)
    max_articles_digest = Column(Integer, default=10)
    language = Column(String, default="fr")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="preferences")
    categories = relationship("UserCategory", back_populates="preferences")
    sources = relationship("UserSource", back_populates="preferences")


class Category(Base):
    """AI domain categories."""

    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    name_fr = Column(String, nullable=False)
    name_ar = Column(String, nullable=True)
    slug = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    keywords = Column(ARRAY(String), default=[])
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("UserCategory", back_populates="category")


class UserCategory(Base):
    """User's selected categories."""

    __tablename__ = "user_categories"
    __table_args__ = (
        Index("ix_user_categories_unique", "preferences_id", "category_id", unique=True),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    preferences_id = Column(
        String, ForeignKey("user_preferences.id", ondelete="CASCADE"), nullable=False
    )
    category_id = Column(
        String, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    preferences = relationship("UserPreferences", back_populates="categories")
    category = relationship("Category", back_populates="users")


class UserSource(Base):
    """User's selected sources."""

    __tablename__ = "user_sources"
    __table_args__ = (
        Index("ix_user_sources_unique", "preferences_id", "source_id", unique=True),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    preferences_id = Column(
        String, ForeignKey("user_preferences.id", ondelete="CASCADE"), nullable=False
    )
    source_id = Column(
        String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    preferences = relationship("UserPreferences", back_populates="sources")
    source = relationship("Source")


class Subscription(Base):
    """User subscription (read-only from workers)."""

    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    billing_plan_id = Column(String, nullable=False)
    plan = Column(String, nullable=False)  # free, pro, team, enterprise
    status = Column(String, default="inactive")  # active, inactive, trialing, cancelled, expired
    billing_cycle = Column(String, default="monthly")
    amount = Column(Float, default=0)
    currency = Column(String, default="USD")
    payment_status = Column(String, default="unpaid")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="subscription")


class UserNotificationStatus(Base):
    """Per-user article notification tracking.

    Replaces the global Article.notified flag for multi-user support.
    If a record exists for (user_id, article_id), the article was sent to that user.
    """

    __tablename__ = "user_notification_status"
    __table_args__ = (
        Index("ix_user_notif_status_unique", "user_id", "article_id", unique=True),
        Index("ix_user_notif_status_user", "user_id"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    article_id = Column(
        String, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False
    )
    notified_at = Column(DateTime, default=datetime.utcnow)
    channel = Column(String, default="whatsapp")  # whatsapp, email, telegram


# Database engine and session — lazy initialization
_engine = None
_SessionLocal = None


def get_engine():
    """Get or create the database engine (lazy)."""
    global _engine
    if _engine is None:
        _engine = create_engine(settings.database_url)
    return _engine


def get_session_factory():
    """Get or create the session factory (lazy)."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal



def get_db() -> Session:
    """Get a database session."""
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create all tables in the database."""
    Base.metadata.create_all(bind=get_engine())
