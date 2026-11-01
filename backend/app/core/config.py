import os
import secrets
import logging
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator

logger = logging.getLogger("uvicorn.error")


class Settings(BaseSettings):
    APP_NAME: str = "MAGIC MUG POS"
    ENV: str = "development"
    PORT: int = 8000
    DEBUG: bool = False
    TIMEZONE: str = "Asia/Kolkata"

    # Database (PostgreSQL via asyncpg or SQLite for local dev)
    DATABASE_URL: str = Field(
        default="",
        description="PostgreSQL or SQLite async SQLAlchemy database URL"
    )

    # JWT Security
    SECRET_KEY: str = Field(
        default="",
        description="Cryptographic secret key for signing JWT tokens"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12 hours

    # CORS
    ALLOWED_ORIGINS: str = (
        "https://magic-mug-pos.vercel.app,https://magic-mug-pos.onrender.com,"
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"
    )

    @model_validator(mode="after")
    def validate_insecure_defaults(self):
        is_prod = self.ENV.lower() in ("production", "prod")

        # 1. Fallback Secret Key Validation (Fail-Secure)
        if not self.SECRET_KEY:
            if is_prod:
                raise ValueError("Fail-secure: SECRET_KEY environment variable is required in production.")
            # For local development without .env, generate a cryptographically strong per-boot random key
            self.SECRET_KEY = secrets.token_urlsafe(32)
        elif is_prod and "change-in-production" in self.SECRET_KEY.lower():
            logger.warning(
                "SECURITY WARNING: Production is running with a placeholder SECRET_KEY. "
                "Update SECRET_KEY in your deployment environment variables."
            )

        # 2. Database URL Validation (Fail-Secure)
        if not self.DATABASE_URL:
            if is_prod:
                raise ValueError("Fail-secure: DATABASE_URL environment variable is required in production.")
            # For local development without .env, default to local SQLite without hardcoded credentials
            self.DATABASE_URL = "sqlite+aiosqlite:///./magic_mug_local.db"

        return self

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origins(self) -> List[str]:
        if self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()


def get_app_timezone():
    from datetime import timezone, timedelta
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(settings.TIMEZONE)
    except Exception:
        return timezone(timedelta(hours=5, minutes=30))
