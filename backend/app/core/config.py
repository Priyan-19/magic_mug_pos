from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    APP_NAME: str = "MAGIC MUG POS"
    ENV: str = "development"
    PORT: int = 8000
    DEBUG: bool = True
    TIMEZONE: str = "Asia/Kolkata"

    # Database (PostgreSQL via asyncpg)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://pos_user:super_secure_pos_password@localhost:5432/magic_mug_pos",
        description="PostgreSQL async SQLAlchemy database URL"
    )

    # JWT Security
    SECRET_KEY: str = "magic-mug-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12 hours

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"

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
