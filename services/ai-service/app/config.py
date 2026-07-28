"""AI Service configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    REDIS_URL: str = "redis://localhost:6379/2"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/maate_dev"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_TEMPERATURE: float = 0.1
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "maate-health"

    class Config:
        env_file = ".env"


settings = Settings()
