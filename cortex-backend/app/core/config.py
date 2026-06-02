from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_env: str = Field(default='development', alias='APP_ENV')
    cors_origins_raw: str = Field(default='http://localhost:5173', alias='CORS_ORIGINS')
    supabase_url: str | None = Field(default=None, alias='SUPABASE_URL')
    supabase_service_key: str | None = Field(default=None, alias='SUPABASE_SERVICE_KEY')

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(',') if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
