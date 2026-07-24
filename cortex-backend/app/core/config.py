from functools import lru_cache

from pydantic import Field
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
    support_to_email: str = Field(default='stalloy@stalloy.io', alias='SUPPORT_TO_EMAIL')
    encryption_key: str | None = Field(default=None, alias='ENCRYPTION_KEY')
    n8n_chat_webhook_url: str | None = Field(default=None, alias='N8N_CHAT_WEBHOOK_URL')
    n8n_chat_timeout_seconds: int = Field(default=60, alias='N8N_CHAT_TIMEOUT_SECONDS')

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(',') if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
