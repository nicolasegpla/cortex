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
    def service(self, mock_supabase):
        return CoffeeFarmService(mock_supabase)

    def test_create_coffee_farm_calls_supabase_insert(self, service, mock_supabase) -> None:
        payload = CoffeeFarmCreate(
            nombre_finca="Finca Primavera",
            marca="Café Primavera",
            hectareas_totales=Decimal("12.50"),
            tipo_actividad="Productor",
        )
        expected_data = {
            "id": str(uuid4()),
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
        mock_supabase.table.return_value.insert.assert_called_once_with(
            {
                "nombre_finca": "Finca Primavera",
                "marca": "Café Primavera",
                "hectareas_totales": 12.5,
                "tipo_actividad": "Productor",
            }
        )
        assert result == expected_data

    def test_list_coffee_farms_calls_supabase_select(self, service, mock_supabase) -> None:
        expected_data = [
            {"id": str(uuid4()), "nombre_finca": "Finca 1"},
            {"id": str(uuid4()), "nombre_finca": "Finca 2"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = (
            expected_data
        )

        result = service.list_all()

        mock_supabase.table.assert_called_once_with("coffee_farms")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        assert result == expected_data

    def test_get_by_id_existing_coffee_farm_returns_data(self, service, mock_supabase) -> None:
        coffee_farm_id = uuid4()
        expected_data = {
            "id": str(coffee_farm_id),
            "nombre_finca": "Finca Encontrada",
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.get_by_id(coffee_farm_id)

        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with(
            "id", str(coffee_farm_id)
        )
        assert result == expected_data

    def test_get_by_id_nonexistent_coffee_farm_returns_none(self, service, mock_supabase) -> None:
        coffee_farm_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_by_id(coffee_farm_id)

        assert result is None

    def test_update_existing_coffee_farm_returns_updated_data(self, service, mock_supabase) -> None:
        coffee_farm_id = uuid4()
        payload = CoffeeFarmUpdate(
            nombre_finca="Finca Actualizada",
            marca="Café Oro",
            puntaje_cafe=Decimal("87.5"),
        )
        expected_data = {
            "id": str(coffee_farm_id),
            "nombre_finca": "Finca Actualizada",
            "marca": "Café Oro",
            "puntaje_cafe": Decimal("87.5"),
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.update(coffee_farm_id, payload)

        mock_supabase.table.return_value.update.assert_called_once_with(
            {
                "nombre_finca": "Finca Actualizada",
                "marca": "Café Oro",
                "puntaje_cafe": 87.5,
            }
        )
        assert result == expected_data

    def test_update_nonexistent_coffee_farm_returns_none(self, service, mock_supabase) -> None:
        coffee_farm_id = uuid4()
        payload = CoffeeFarmUpdate(nombre_finca="Finca Actualizada")
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.update(coffee_farm_id, payload)

        assert result is None

    def test_delete_existing_coffee_farm_returns_true(self, service, mock_supabase) -> None:
        coffee_farm_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
            {"id": str(coffee_farm_id)}
        ]

        result = service.delete(coffee_farm_id)

        mock_supabase.table.return_value.delete.assert_called_once()
        assert result is True

    def test_delete_nonexistent_coffee_farm_returns_false(self, service, mock_supabase) -> None:
        coffee_farm_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.delete(coffee_farm_id)

        assert result is False
