"""Tests for schema introspection (app.services.schema_introspection)."""

from unittest.mock import MagicMock

import pytest


class TestSchemaIntrospection:
    """Unit tests for SchemaIntrospection.fetch."""

    @pytest.fixture
    def introspection(self):
        """Provide a fresh SchemaIntrospection instance."""
        from app.services.schema_introspection import SchemaIntrospection

        return SchemaIntrospection()

    @pytest.fixture
    def mock_service(self):
        """Build a mock SupabaseService with get_chat_schema_metadata."""
        service = MagicMock()
        service.get_chat_schema_metadata.return_value = [
            {"table_name": "breweries", "column_name": "id", "data_type": "uuid"},
            {"table_name": "breweries", "column_name": "name", "data_type": "text"},
            {"table_name": "suppliers", "column_name": "id", "data_type": "uuid"},
        ]
        return service

    def test_fetch_includes_table_names(self, introspection, mock_service):
        """RED: Output describes each table name with public schema qualification."""
        result = introspection.fetch(mock_service)

        assert "Table: public.breweries" in result
        assert "Table: public.suppliers" in result

    def test_fetch_includes_column_names_and_types(self, introspection, mock_service):
        """TRIANGULATE: Output describes columns and their data types."""
        result = introspection.fetch(mock_service)

        assert "  - id: uuid" in result
        assert "  - name: text" in result

    def test_fetch_qualifies_all_tables_with_public_schema(self, introspection):
        """TRIANGULATE: Every table name is prefixed with the public schema."""
        service = MagicMock()
        service.get_chat_schema_metadata.return_value = [
            {"table_name": "animal_feed_producers", "column_name": "id", "data_type": "uuid"},
            {"table_name": "breweries", "column_name": "name", "data_type": "text"},
        ]

        result = introspection.fetch(service)

        assert "Table: public.animal_feed_producers" in result
        assert "Table: public.breweries" in result
        # Ensure unqualified names do NOT appear
        assert "Table: animal_feed_producers" not in result
        assert "Table: breweries" not in result

    def test_fetch_uses_get_chat_schema_metadata_rpc(self, introspection, mock_service):
        """TRIANGULATE: Uses the dedicated get_chat_schema_metadata RPC."""
        introspection.fetch(mock_service)

        mock_service.get_chat_schema_metadata.assert_called_once_with()

    def test_fetch_returns_empty_string_when_no_columns(self, introspection):
        """TRIANGULATE: Empty metadata returns an empty schema context."""
        service = MagicMock()
        service.get_chat_schema_metadata.return_value = []

        result = introspection.fetch(service)

        assert result == ""

    def test_fetch_raises_when_service_is_none(self, introspection):
        """TRIANGULATE: A missing service is rejected early."""
        with pytest.raises(ValueError, match="Supabase service"):
            introspection.fetch(None)
