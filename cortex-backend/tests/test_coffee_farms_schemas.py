"""Tests for coffee farm Pydantic schemas."""

from decimal import Decimal
from uuid import uuid4
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.coffee_farms import CoffeeFarmCreate, CoffeeFarmResponse, CoffeeFarmUpdate


class TestCoffeeFarmCreate:
    """Test CoffeeFarmCreate schema validation."""

    def test_valid_coffee_farm_create_succeeds(self) -> None:
        farm = CoffeeFarmCreate(
            nombre_finca="Finca Primavera",
            marca="Café Primavera",
            hectareas_totales=Decimal("12.50"),
            tipo_actividad="Productor",
            phones=["3001234567"],
        )

        assert farm.nombre_finca == "Finca Primavera"
        assert farm.marca == "Café Primavera"
        assert farm.hectareas_totales == Decimal("12.50")
        assert farm.tipo_actividad == "Productor"
        assert farm.phones == ["3001234567"]

    def test_nombre_finca_is_required(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            CoffeeFarmCreate(ciudad="Bogotá")

        assert "nombre_finca" in str(exc_info.value)

    def test_invalid_tipo_actividad_raises_error(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            CoffeeFarmCreate(nombre_finca="Test", tipo_actividad="Invalid")

        assert "tipo_actividad" in str(exc_info.value)

    def test_optional_fields_default_to_none(self) -> None:
        farm = CoffeeFarmCreate(nombre_finca="Test")
        assert farm.razon_social is None
        assert farm.nit is None

    def test_phones_default_to_empty_list(self) -> None:
        farm = CoffeeFarmCreate(nombre_finca="Test")
        assert farm.phones == []

    def test_phones_accept_multiple_numbers(self) -> None:
        farm = CoffeeFarmCreate(
            nombre_finca="Test",
            phones=["300", "301"],
        )
        assert farm.phones == ["300", "301"]


class TestCoffeeFarmUpdate:
    """Test CoffeeFarmUpdate schema (all fields optional)."""

    def test_all_fields_are_optional(self) -> None:
        farm = CoffeeFarmUpdate()

        assert farm.nombre_finca is None
        assert farm.phones == []

    def test_partial_update_succeeds(self) -> None:
        farm = CoffeeFarmUpdate(nombre_finca="Updated")

        assert farm.nombre_finca == "Updated"
        assert farm.razon_social is None

    def test_update_phones_replaces_list(self) -> None:
        farm = CoffeeFarmUpdate(phones=["300"])
        assert farm.phones == ["300"]


class TestCoffeeFarmResponse:
    """Test CoffeeFarmResponse schema."""

    def test_response_requires_all_fields(self) -> None:
        farm_id = uuid4()
        now = datetime.now(timezone.utc)

        response = CoffeeFarmResponse(
            id=farm_id,
            nombre_finca="Test Farm",
            created_at=now,
            updated_at=now,
        )

        assert response.id == farm_id
        assert response.nombre_finca == "Test Farm"
        assert response.phones == []

    def test_response_serializes_to_dict(self) -> None:
        farm_id = uuid4()
        now = datetime.now(timezone.utc)

        response = CoffeeFarmResponse(
            id=farm_id,
            nombre_finca="Test Farm",
            phones=["300", "301"],
            created_at=now,
            updated_at=now,
        )

        data = response.model_dump()
        assert data["phones"] == ["300", "301"]
