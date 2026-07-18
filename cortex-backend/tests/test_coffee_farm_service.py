"""Tests for CoffeeFarmService business logic."""

from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.schemas.coffee_farms import CoffeeFarmCreate, CoffeeFarmUpdate
from app.services.coffee_farm_service import CoffeeFarmService


class TestCoffeeFarmService:
    """Test CoffeeFarmService CRUD operations with mocked Supabase."""

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
        return CoffeeFarmService(mock_supabase, mock_phone_service)

    def test_create_coffee_farm_calls_supabase_insert_and_saves_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        farm_id = uuid4()
        payload = CoffeeFarmCreate(
            nombre_finca="Finca Primavera",
            marca="Café Primavera",
            hectareas_totales=Decimal("12.50"),
            tipo_actividad="Productor",
            phones=["3001234567"],
        )
        expected_data = {
            "id": str(farm_id),
            "nombre_finca": "Finca Primavera",
            "marca": "Café Primavera",
            "hectareas_totales": Decimal("12.50"),
            "tipo_actividad": "Productor",
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.create(payload)

        mock_supabase.table.assert_called_once_with("coffee_farms")
        insert_payload = mock_supabase.table.return_value.insert.call_args[0][0]
        assert "phones" not in insert_payload
        assert "celular" not in insert_payload
        mock_phone_service.replace_phones.assert_called_once_with(
            "coffee_farm", farm_id, ["3001234567"]
        )
        assert result == expected_data

    def test_create_coffee_farm_without_phones_clears_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        farm_id = uuid4()
        payload = CoffeeFarmCreate(
            nombre_finca="Finca Primavera",
            tipo_actividad="Productor",
        )
        expected_data = {"id": str(farm_id), "nombre_finca": "Finca Primavera"}
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            expected_data
        ]

        service.create(payload)

        mock_phone_service.replace_phones.assert_called_once_with(
            "coffee_farm", farm_id, []
        )

    def test_list_coffee_farms_merges_batched_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        id_1 = uuid4()
        id_2 = uuid4()
        expected_data = [
            {"id": str(id_1), "nombre_finca": "Finca 1"},
            {"id": str(id_2), "nombre_finca": "Finca 2"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = (
            expected_data
        )
        mock_phone_service.batch_load_phones.return_value = {
            id_1: ["300"],
            id_2: ["301"],
        }

        result = service.list_all()

        mock_supabase.table.assert_called_once_with("coffee_farms")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        mock_phone_service.batch_load_phones.assert_called_once_with("coffee_farm", [id_1, id_2])
        assert result[0]["phones"] == ["300"]
        assert result[1]["phones"] == ["301"]

    def test_list_coffee_farms_with_no_results_returns_empty_list(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = []

        result = service.list_all()

        assert result == []
        mock_phone_service.batch_load_phones.assert_not_called()

    def test_get_by_id_existing_coffee_farm_merges_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        coffee_farm_id = uuid4()
        expected_data = {
            "id": str(coffee_farm_id),
            "nombre_finca": "Finca Encontrada",
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]
        mock_phone_service.get_phones.return_value = ["300", "301"]

        result = service.get_by_id(coffee_farm_id)

        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with(
            "id", str(coffee_farm_id)
        )
        mock_phone_service.get_phones.assert_called_once_with("coffee_farm", coffee_farm_id)
        assert result["nombre_finca"] == "Finca Encontrada"
        assert result["phones"] == ["300", "301"]

    def test_get_by_id_nonexistent_coffee_farm_returns_none(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        coffee_farm_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_by_id(coffee_farm_id)

        assert result is None
        mock_phone_service.get_phones.assert_not_called()

    def test_update_existing_coffee_farm_excludes_phones_and_replaces_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        coffee_farm_id = uuid4()
        payload = CoffeeFarmUpdate(
            nombre_finca="Finca Actualizada",
            phones=["310"],
        )
        expected_data = {
            "id": str(coffee_farm_id),
            "nombre_finca": "Finca Actualizada",
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.update(coffee_farm_id, payload)

        update_payload = mock_supabase.table.return_value.update.call_args[0][0]
        assert "phones" not in update_payload
        assert "celular" not in update_payload
        mock_phone_service.replace_phones.assert_called_once_with(
            "coffee_farm", coffee_farm_id, ["310"]
        )
        assert result["nombre_finca"] == "Finca Actualizada"

    def test_update_nonexistent_coffee_farm_returns_none(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        coffee_farm_id = uuid4()
        payload = CoffeeFarmUpdate(nombre_finca="Finca Actualizada")
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.update(coffee_farm_id, payload)

        assert result is None
        mock_phone_service.replace_phones.assert_not_called()

    def test_delete_existing_coffee_farm_returns_true_and_does_not_clean_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        coffee_farm_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
            {"id": str(coffee_farm_id)}
        ]

        result = service.delete(coffee_farm_id)

        mock_supabase.table.return_value.delete.assert_called_once()
        assert result is True
        mock_phone_service.delete_phones.assert_not_called()

    def test_delete_nonexistent_coffee_farm_returns_false(
        self, service, mock_supabase
    ) -> None:
        coffee_farm_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.delete(coffee_farm_id)

        assert result is False
