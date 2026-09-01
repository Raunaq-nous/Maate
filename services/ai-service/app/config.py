from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_LOCAL = Path(__file__).resolve().parent.parent / ".env"
ENV_ROOT = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=(str(ENV_LOCAL), str(ENV_ROOT), ".env"),
    )

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    REDIS_URL: str = "redis://localhost:6379/2"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/maate_dev"

    # Primary LLM Provider: Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # Secondary / Future LLM Provider: OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_TEMPERATURE: float = 0.1

    # Vector Storage
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "maate-health"


settings = Settings()

