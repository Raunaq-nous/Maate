"""OCR Service configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    REDIS_URL: str = "redis://localhost:6379/1"
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin123"
    S3_BUCKET: str = "maate-documents"
    GOOGLE_VISION_API_KEY: str = ""
    TESSERACT_LANG: str = "eng"

    model_config = SettingsConfigDict(extra="ignore", env_file=".env")


settings = Settings()
