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
    def mock_phone_service(self):
        """Create a mocked EntityContactPhoneService."""
        mock = MagicMock()
        mock.get_phones.return_value = []
        mock.batch_load_phones.return_value = {}
        mock.replace_phones.return_value = None
        return mock

    @pytest.fixture
    def service(self, mock_supabase, mock_phone_service):
        return WineProducerService(mock_supabase, mock_phone_service)

    def test_create_wine_producer_calls_supabase_insert_and_saves_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        producer_id = uuid4()
        payload = WineProducerCreate(
            nombre_comercial="Viñedos del Valle",
            razon_social="Viñedos del Valle S.A.S.",
            ciudad="Bogotá",
            marcas=["Valle Tinto", "Valle Blanco"],
            tipo_uva=["Cabernet Sauvignon", "Chardonnay"],
            phones=["3001234567"],
        )
        expected_data = {
            "id": str(producer_id),
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
        insert_payload = mock_supabase.table.return_value.insert.call_args[0][0]
        assert "phones" not in insert_payload
        assert "celular" not in insert_payload
        mock_phone_service.replace_phones.assert_called_once_with(
            "wine_producer", producer_id, ["3001234567"]
        )
        assert result == expected_data

    def test_create_wine_producer_without_phones_clears_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        producer_id = uuid4()
        payload = WineProducerCreate(
            nombre_comercial="Viñedos del Valle",
        )
        expected_data = {"id": str(producer_id), "nombre_comercial": "Viñedos del Valle"}
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            expected_data
        ]

        service.create(payload)

        mock_phone_service.replace_phones.assert_called_once_with(
            "wine_producer", producer_id, []
        )

    def test_list_wine_producers_merges_batched_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        id_1 = uuid4()
        id_2 = uuid4()
        expected_data = [
            {"id": str(id_1), "nombre_comercial": "Viñedos del Valle"},
            {"id": str(id_2), "nombre_comercial": "Bodega Real"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = expected_data
        mock_phone_service.batch_load_phones.return_value = {
            id_1: ["300"],
            id_2: ["301"],
        }

        result = service.list_all()

        mock_supabase.table.assert_called_once_with("wine_producers")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        mock_phone_service.batch_load_phones.assert_called_once_with(
            "wine_producer", [id_1, id_2]
        )
        assert result[0]["phones"] == ["300"]
        assert result[1]["phones"] == ["301"]

    def test_list_wine_producers_with_no_results_returns_empty_list(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = []

        result = service.list_all()

        assert result == []
        mock_phone_service.batch_load_phones.assert_not_called()

    def test_get_by_id_existing_producer_merges_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        producer_id = uuid4()
        expected_data = {
            "id": str(producer_id),
            "nombre_comercial": "Viñedos del Valle",
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]
        mock_phone_service.get_phones.return_value = ["300"]

        result = service.get_by_id(producer_id)

        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with(
            "id", str(producer_id)
        )
        mock_phone_service.get_phones.assert_called_once_with("wine_producer", producer_id)
        assert result["nombre_comercial"] == "Viñedos del Valle"
        assert result["phones"] == ["300"]

    def test_get_by_id_nonexistent_producer_returns_none(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        producer_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_by_id(producer_id)

        assert result is None
        mock_phone_service.get_phones.assert_not_called()

    def test_update_existing_producer_excludes_phones_and_replaces_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        producer_id = uuid4()
        payload = WineProducerUpdate(
            nombre_comercial="Viñedos del Valle Actualizado",
            phones=["310"],
        )
        expected_data = {
            "id": str(producer_id),
            "nombre_comercial": "Viñedos del Valle Actualizado",
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.update(producer_id, payload)

        update_payload = mock_supabase.table.return_value.update.call_args[0][0]
        assert "phones" not in update_payload
        assert "celular" not in update_payload
        mock_phone_service.replace_phones.assert_called_once_with(
            "wine_producer", producer_id, ["310"]
        )
        assert result["nombre_comercial"] == "Viñedos del Valle Actualizado"

    def test_update_nonexistent_producer_returns_none(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        producer_id = uuid4()
        payload = WineProducerUpdate(nombre_comercial="Viñedos del Valle Actualizado")
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.update(producer_id, payload)

        assert result is None
        mock_phone_service.replace_phones.assert_not_called()

    def test_delete_existing_producer_returns_true_and_does_not_clean_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        producer_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
            {"id": str(producer_id)}
        ]

        result = service.delete(producer_id)

        mock_supabase.table.return_value.delete.assert_called_once()
        assert result is True
        mock_phone_service.delete_phones.assert_not_called()

    def test_delete_nonexistent_producer_returns_false(
        self, service, mock_supabase
    ) -> None:
        producer_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.delete(producer_id)

        assert result is False
