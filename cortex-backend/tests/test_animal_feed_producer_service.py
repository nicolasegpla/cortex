"""Tests for AnimalFeedProducerService business logic."""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.schemas.animal_feed_producers import AnimalFeedProducerCreate, AnimalFeedProducerUpdate
from app.services.animal_feed_producer_service import AnimalFeedProducerService


class TestAnimalFeedProducerService:
    """Test AnimalFeedProducerService CRUD operations with mocked Supabase."""

    @pytest.fixture
    def mock_supabase(self):
        return MagicMock()

    @pytest.fixture
    def service(self, mock_supabase):
        return AnimalFeedProducerService(mock_supabase)

    def test_create_animal_feed_producer_calls_supabase_insert(self, service, mock_supabase) -> None:
        payload = AnimalFeedProducerCreate(
            razon_social="Nutri Feed S.A.",
            ciudad="Bogotá",
            especies_manejadas=["Bovinos", "Porcinos"],
        )
        expected_data = {
            "id": str(uuid4()),
            "razon_social": "Nutri Feed S.A.",
            "ciudad": "Bogotá",
            "especies_manejadas": ["Bovinos", "Porcinos"],
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.create(payload)

        mock_supabase.table.assert_called_once_with("animal_feed_producers")
        mock_supabase.table.return_value.insert.assert_called_once_with(
            {
                "razon_social": "Nutri Feed S.A.",
                "ciudad": "Bogotá",
                "especies_manejadas": ["Bovinos", "Porcinos"],
            }
        )
        assert result == expected_data

    def test_list_animal_feed_producers_calls_supabase_select(self, service, mock_supabase) -> None:
        expected_data = [
            {"id": str(uuid4()), "razon_social": "Nutri Feed S.A."},
            {"id": str(uuid4()), "razon_social": "Alimentos del Campo"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = expected_data

        result = service.list_all()

        mock_supabase.table.assert_called_once_with("animal_feed_producers")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        assert result == expected_data

    def test_get_by_id_existing_producer_returns_data(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        expected_data = {
            "id": str(producer_id),
            "razon_social": "Nutri Feed S.A.",
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
        payload = AnimalFeedProducerUpdate(
            razon_social="Nutri Feed Actualizada",
            productos_fabricados=["Concentrado", "Premezcla"],
        )
        expected_data = {
            "id": str(producer_id),
            "razon_social": "Nutri Feed Actualizada",
            "productos_fabricados": ["Concentrado", "Premezcla"],
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.update(producer_id, payload)

        mock_supabase.table.return_value.update.assert_called_once_with(
            {
                "razon_social": "Nutri Feed Actualizada",
                "productos_fabricados": ["Concentrado", "Premezcla"],
            }
        )
        assert result == expected_data

    def test_update_nonexistent_producer_returns_none(self, service, mock_supabase) -> None:
        producer_id = uuid4()
        payload = AnimalFeedProducerUpdate(razon_social="Nutri Feed Actualizada")
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
