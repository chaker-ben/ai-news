"""SQLAlchemy models for AI News."""

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
    String,
    Text,
    create_engine,
)
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
    original_content = Column(Text, nullable=True)
    summary_fr = Column(Text, nullable=True)
    url = Column(String, nullable=False)
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
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)
    error = Column(String, nullable=True)

    def __repr__(self) -> str:
        return f"<NotificationLog(type={self.type!r}, success={self.success})>"


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
