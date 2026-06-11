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

    def execute_raw(self, sql: str) -> list[dict]:
        """Execute a read-only SQL statement via Supabase.

        Requires a read-only ``exec_sql`` Postgres function exposed through
        PostgREST. The caller is responsible for validating the statement
        before invoking this method.

        Args:
            sql: A validated read-only SQL statement.

        Returns:
            List of result rows as dicts.

        Raises:
            RuntimeError: If Supabase is not configured.
            Exception: If the RPC call fails.
        """
        if not self.is_configured():
            raise RuntimeError("Supabase is not configured")

        client = self.get_client()
        response = client.rpc("exec_sql", {"query": sql}).execute()
        return getattr(response, "data", None) or []

    def get_chat_schema_metadata(self) -> list[dict]:
        """Fetch chat schema metadata via the dedicated Postgres RPC.

        Requires a ``get_chat_schema_metadata`` Postgres function exposed
        through PostgREST. The backend owns schema discovery, so this RPC
        returns the same table/column metadata the LLM needs without
        inlining SQL in the application layer.

        Returns:
            List of metadata rows as dicts with table_name, column_name,
            and data_type keys.

        Raises:
            RuntimeError: If Supabase is not configured.
            Exception: If the RPC call fails.
        """
        if not self.is_configured():
            raise RuntimeError("Supabase is not configured")

        client = self.get_client()
        response = client.rpc("get_chat_schema_metadata", {}).execute()
        return getattr(response, "data", None) or []
