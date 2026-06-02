from supabase import Client, create_client

from app.core.config import Settings, get_settings


class SupabaseService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: Client | None = None

    def is_configured(self) -> bool:
        return bool(self.settings.supabase_url and self.settings.supabase_service_key)

    def get_client(self) -> Client | None:
        if not self.is_configured():
            return None

        if self._client is None:
            self._client = create_client(self.settings.supabase_url, self.settings.supabase_service_key)

        return self._client
