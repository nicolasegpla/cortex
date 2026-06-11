"""Schema introspection for the read-only chat orchestrator."""

from collections import defaultdict


class SchemaIntrospection:
    """Fetch DDL-style schema metadata from Supabase.

    The backend owns schema discovery so the LLM receives deterministic,
    up-to-date context before generating SQL.
    """

    def fetch(self, supabase_service) -> str:
        """Return a DDL-style description of the public schema.

        Uses the dedicated ``get_chat_schema_metadata`` Postgres RPC (via
        ``SupabaseService.get_chat_schema_metadata``) instead of inlining
        SQL or using PostgREST schema introspection. Keeping schema
        discovery behind a named RPC lets the database own the metadata
        query and keeps the backend contract narrow.

        Args:
            supabase_service: A ``SupabaseService`` instance with
                ``get_chat_schema_metadata``.

        Returns:
            A human-readable string describing tables and columns.

        Raises:
            ValueError: If ``supabase_service`` is ``None``.
        """
        if supabase_service is None:
            raise ValueError("Supabase service is required")

        rows = supabase_service.get_chat_schema_metadata()

        if not rows:
            return ""

        grouped: dict[str, list[dict]] = defaultdict(list)
        for row in rows:
            grouped[row["table_name"]].append(row)

        lines: list[str] = []
        for table_name in sorted(grouped):
            lines.append(f"Table: public.{table_name}")
            for column in grouped[table_name]:
                lines.append(f"  - {column['column_name']}: {column['data_type']}")

        return "\n".join(lines)
