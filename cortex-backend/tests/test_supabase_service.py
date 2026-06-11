"""Tests for SupabaseService (app.services.supabase_service)."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.supabase_service import SupabaseService


class TestSupabaseService:
    """Unit tests for SupabaseService RPC helpers."""

    @pytest.fixture
    def settings(self):
        """Provide configured settings."""
        settings = MagicMock()
        settings.supabase_url = "https://example.supabase.co"
        settings.supabase_service_key = "service-key"
        return settings

    def test_get_chat_schema_metadata_calls_rpc(self, settings):
        """RED: Uses the dedicated get_chat_schema_metadata Postgres RPC."""
        mock_response = MagicMock()
        mock_response.data = [
            {"table_name": "breweries", "column_name": "id", "data_type": "uuid"}
        ]
        mock_rpc = MagicMock()
        mock_rpc.execute.return_value = mock_response
        mock_client = MagicMock()
        mock_client.rpc.return_value = mock_rpc

        service = SupabaseService(settings=settings)
        service._client = mock_client

        service.get_chat_schema_metadata()

        mock_client.rpc.assert_called_once_with("get_chat_schema_metadata", {})
        mock_rpc.execute.assert_called_once()

    def test_get_chat_schema_metadata_returns_rows(self, settings):
        """TRIANGULATE: Returns the rows exposed by the RPC."""
        mock_response = MagicMock()
        mock_response.data = [
            {"table_name": "breweries", "column_name": "id", "data_type": "uuid"},
            {"table_name": "breweries", "column_name": "name", "data_type": "text"},
        ]
        mock_rpc = MagicMock()
        mock_rpc.execute.return_value = mock_response
        mock_client = MagicMock()
        mock_client.rpc.return_value = mock_rpc

        service = SupabaseService(settings=settings)
        service._client = mock_client

        result = service.get_chat_schema_metadata()

        assert result == mock_response.data

    def test_get_chat_schema_metadata_returns_empty_list_when_no_data(self, settings):
        """TRIANGULATE: Missing data attribute yields an empty list."""
        mock_response = MagicMock()
        mock_response.data = None
        mock_rpc = MagicMock()
        mock_rpc.execute.return_value = mock_response
        mock_client = MagicMock()
        mock_client.rpc.return_value = mock_rpc

        service = SupabaseService(settings=settings)
        service._client = mock_client

        result = service.get_chat_schema_metadata()

        assert result == []

    def test_get_chat_schema_metadata_raises_when_unconfigured(self):
        """TRIANGULATE: An unconfigured service rejects the call early."""
        settings = MagicMock()
        settings.supabase_url = None
        settings.supabase_service_key = None
        service = SupabaseService(settings=settings)

        with pytest.raises(RuntimeError, match="Supabase is not configured"):
            service.get_chat_schema_metadata()
