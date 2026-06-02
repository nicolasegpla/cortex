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
