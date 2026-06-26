from functools import lru_cache

from pydantic import Field, field_validator

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_env: str = Field(default='development', alias='APP_ENV')
    cors_origins_raw: str = Field(default='http://localhost:5173', alias='CORS_ORIGINS')
    supabase_url: str | None = Field(default=None, alias='SUPABASE_URL')
    supabase_service_key: str | None = Field(default=None, alias='SUPABASE_SERVICE_KEY')
    supabase_jwt_secret: str | None = Field(default=None, alias='SUPABASE_JWT_SECRET')
    supabase_anon_key: str | None = Field(default=None, alias='SUPABASE_ANON_KEY')
    supabase_invite_redirect_url: str = Field(
        default='http://localhost:5173/auth/invite',
        alias='SUPABASE_INVITE_REDIRECT_URL',
    )
    resend_api_key: str | None = Field(default=None, alias='RESEND_API_KEY')
    resend_from_email: str = Field(default='noreply@cortex.local', alias='RESEND_FROM_EMAIL')
    encryption_key: str | None = Field(default=None, alias='ENCRYPTION_KEY')

    # OpenAI embedding configuration
    openai_api_key: str | None = Field(default=None, alias='OPENAI_API_KEY')
    embedding_model: str = Field(default='text-embedding-3-small', alias='EMBEDDING_MODEL')
    embedding_dimension: int = Field(default=1536, alias='EMBEDDING_DIMENSION')
    embeddings_enabled: bool = Field(default=True, alias='EMBEDDINGS_ENABLED')

    @field_validator('embedding_dimension', mode='after')
    @classmethod
    def _validate_embedding_dimension(cls, value: int) -> int:
        expected = 1536
        if value != expected:
            raise ValueError(
                f'EMBEDDING_DIMENSION must be {expected} to match the DB schema '
                f'(vector({expected})) in this phase'
            )
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(',') if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
