"""Tests for BreweryService business logic."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest

from app.schemas.breweries import BreweryCreate, BreweryUpdate
from app.services.brewery_service import BreweryService


class TestBreweryService:
    """Test BreweryService CRUD operations with mocked Supabase."""

    @pytest.fixture
    def mock_supabase(self):
        """Create a mocked Supabase client."""
        mock = MagicMock()
        return mock

    @pytest.fixture
    def service(self, mock_supabase):
        """Create a BreweryService with mocked client."""
        return BreweryService(mock_supabase)

    @pytest.fixture
    def sample_brewery_data(self):
        """Return sample brewery data as would come from Supabase."""
        return {
            "id": str(uuid4()),
            "nombre_cerveceria": "Cerveza Artesanal S.A.",
            "razon_social": "Cerveza Artesanal Sociedad Anonima",
            "nit": "900123456-7",
            "ciudad": "Bogotá",
            "pais": "Colombia",
            "tipo_operacion": "planta_propia",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def test_create_brewery_calls_supabase_insert(self, service, mock_supabase) -> None:
        payload = BreweryCreate(
            nombre_cerveceria="Test Brewery",
            ciudad="Medellín",
        )
        expected_data = {
            "id": str(uuid4()),
            "nombre_cerveceria": "Test Brewery",
            "ciudad": "Medellín",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.create(payload)

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.insert.assert_called_once()
        assert result["nombre_cerveceria"] == "Test Brewery"
        assert result["ciudad"] == "Medellín"

    def test_list_breweries_calls_supabase_select(self, service, mock_supabase) -> None:
        expected_data = [
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 1"},
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 2"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = (
            expected_data
        )

        result = service.list_all()

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        assert len(result) == 2
        assert result[0]["nombre_cerveceria"] == "Brewery 1"

    def test_get_by_id_existing_brewery_returns_data(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        expected_data = {
            "id": str(brewery_id),
            "nombre_cerveceria": "Found Brewery",
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.get_by_id(brewery_id)

        assert result is not None
        assert result["nombre_cerveceria"] == "Found Brewery"
        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with(
            "id", str(brewery_id)
        )

    def test_get_by_id_nonexistent_brewery_returns_none(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_by_id(brewery_id)

        assert result is None

    def test_update_existing_brewery_returns_updated_data(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        payload = BreweryUpdate(nombre_cerveceria="Updated Name")
        expected_data = {
            "id": str(brewery_id),
            "nombre_cerveceria": "Updated Name",
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.update(brewery_id, payload)

        assert result is not None
        assert result["nombre_cerveceria"] == "Updated Name"
        mock_supabase.table.return_value.update.assert_called_once()

    def test_update_nonexistent_brewery_returns_none(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        payload = BreweryUpdate(nombre_cerveceria="Updated Name")
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.update(brewery_id, payload)

        assert result is None

    def test_delete_existing_brewery_returns_true(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
            {"id": str(brewery_id)}
        ]

        result = service.delete(brewery_id)

        assert result is True
        mock_supabase.table.return_value.delete.assert_called_once()

    def test_delete_nonexistent_brewery_returns_false(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.delete(brewery_id)

        assert result is False

    # --- search() and count() (Phase 3: chat-db-access) ---

    def test_search_no_filters_returns_all(self, service, mock_supabase) -> None:
        expected = [
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 1"},
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 2"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = expected

        result = service.search()

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        assert len(result) == 2

    def test_search_with_city_filter_applies_eq(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "ciudad": "Bogotá"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.eq.return_value.execute.return_value.data = expected

        result = service.search(city="Bogotá")

        query_builder.eq.assert_called_once_with("ciudad", "Bogotá")
        assert len(result) == 1

    def test_search_with_all_filters_applies_multiple_eq(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "ciudad": "Medellín"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        # Chain of eq() calls — each returns self for chaining
        query_builder.eq.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(city="Medellín", country="Colombia", operation_type="planta_propia")

        assert query_builder.eq.call_count == 3
        query_builder.eq.assert_any_call("ciudad", "Medellín")
        query_builder.eq.assert_any_call("pais", "Colombia")
        query_builder.eq.assert_any_call("tipo_operacion", "planta_propia")
        assert len(result) == 1

    def test_search_with_partial_filters(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "pais": "Colombia"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.eq.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(country="Colombia")

        assert query_builder.eq.call_count == 1
        query_builder.eq.assert_called_once_with("pais", "Colombia")

    def test_count_returns_int(self, service, mock_supabase) -> None:
        mock_response = MagicMock()
        mock_response.count = 42
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response

        result = service.count()

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.select.assert_called_once_with("*", count="exact")
        assert result == 42
        assert isinstance(result, int)

    def test_count_zero_results(self, service, mock_supabase) -> None:
        mock_response = MagicMock()
        mock_response.count = 0
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response

        result = service.count()

        assert result == 0
