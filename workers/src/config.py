"""Centralized configuration with Pydantic validation."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/ainews"

    # AI & Translation
    anthropic_api_key: str = ""
    deepl_api_key: str = ""

    # Social Media APIs
    twitter_bearer_token: str = ""
    youtube_api_key: str = ""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""

    # WhatsApp (UltraMsg)
    ultramsg_instance_id: str = ""
    ultramsg_token: str = ""
    whatsapp_recipient: str = ""

    # Scheduler
    digest_time: str = "08:00"
    weekly_digest_day: str = "monday"
    weekly_digest_time: str = "09:00"
    min_score_alert: float = 9.0
    max_articles_digest: int = 5
    max_articles_weekly: int = 10

    # Collection
    collection_interval_hours: int = 1
    max_article_age_hours: int = 24

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
