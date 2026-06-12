"""Tests for WineProducerService business logic."""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.schemas.wine_producers import WineProducerCreate, WineProducerUpdate
from app.services.wine_producer_service import WineProducerService


class TestWineProducerService:
    """Test WineProducerService CRUD operations with mocked Supabase."""

    @pytest.fixture
    def mock_supabase(self):
        return MagicMock()

    @pytest.fixture
    def service(self, mock_supabase):
        return WineProducerService(mock_supabase)

    def test_create_wine_producer_calls_supabase_insert(self, service, mock_supabase) -> None:
        payload = WineProducerCreate(
            nombre_comercial="Viñedos del Valle",
            razon_social="Viñedos del Valle S.A.S.",
            ciudad="Bogotá",
            marcas=["Valle Tinto", "Valle Blanco"],
            tipo_uva=["Cabernet Sauvignon", "Chardonnay"],
        )
        expected_data = {
            "id": str(uuid4()),
            "nombre_comercial": "Viñedos del Valle",
            "razon_social": "Viñedos del Valle S.A.S.",
            "ciudad": "Bogotá",
            "marcas": ["Valle Tinto", "Valle Blanco"],
            "tipo_uva": ["Cabernet Sauvignon", "Chardonnay"],
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.create(payload)

        mock_supabase.table.assert_called_once_with("wine_producers")
        mock_supabase.table.return_value.insert.assert_called_once_with(
            {
                "nombre_comercial": "Viñedos del Valle",
                "razon_social": "Viñedos del Valle S.A.S.",
                "ciudad": "Bogotá",
                "marcas": ["Valle Tinto", "Valle Blanco"],
                "tipo_uva": ["Cabernet Sauvignon", "Chardonnay"],
            }
        )
        assert result == expected_data

    def test_list_wine_producers_calls_supabase_select(self, service, mock_supabase) -> None:
        expected_data = [
            {"id": str(uuid4()), "nombre_comercial": "Viñedos del Valle"},
            {"id": str(uuid4()), "nombre_comercial": "Bodega Real"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = expected_data

        result = service.list_all()

        mock_supabase.table.assert_called_once_with("wine_producers")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        assert result == expected_data

    def test_get_by_id_existing_producer_returns_data(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        expected_data = {
            "id": str(producer_id),
            "nombre_comercial": "Viñedos del Valle",
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.get_by_id(producer_id)

        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with(
            "id", str(producer_id)
        )
        assert result == expected_data

    def test_get_by_id_nonexistent_producer_returns_none(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_by_id(producer_id)

        assert result is None

    def test_update_existing_producer_returns_updated_data(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        payload = WineProducerUpdate(
            nombre_comercial="Viñedos del Valle Actualizado",
            tipo_vino=["Tinto", "Blanco"],
        )
        expected_data = {
            "id": str(producer_id),
            "nombre_comercial": "Viñedos del Valle Actualizado",
            "tipo_vino": ["Tinto", "Blanco"],
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.update(producer_id, payload)

        mock_supabase.table.return_value.update.assert_called_once_with(
            {
                "nombre_comercial": "Viñedos del Valle Actualizado",
                "tipo_vino": ["Tinto", "Blanco"],
            }
        )
        assert result == expected_data

    def test_update_nonexistent_producer_returns_none(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        payload = WineProducerUpdate(nombre_comercial="Viñedos del Valle Actualizado")
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.update(producer_id, payload)

        assert result is None

    def test_delete_existing_producer_returns_true(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
            {"id": str(producer_id)}
        ]

        result = service.delete(producer_id)

        mock_supabase.table.return_value.delete.assert_called_once()
        assert result is True

    def test_delete_nonexistent_producer_returns_false(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.delete(producer_id)

        assert result is False
