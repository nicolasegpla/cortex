"""Tests for wine producer Pydantic schemas."""

from uuid import uuid4
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.wine_producers import WineProducerCreate, WineProducerResponse, WineProducerUpdate


class TestWineProducerCreate:
    """Test WineProducerCreate schema validation."""

    def test_valid_wine_producer_create_succeeds(self) -> None:
        producer = WineProducerCreate(
            nombre_comercial="Viñedos del Valle",
            razon_social="Viñedos del Valle S.A.S.",
            ciudad="Bogotá",
            marcas=["Valle Tinto", "Valle Blanco"],
            tipo_uva=["Cabernet Sauvignon", "Chardonnay"],
            phones=["3001234567"],
        )

        assert producer.nombre_comercial == "Viñedos del Valle"
        assert producer.marcas == ["Valle Tinto", "Valle Blanco"]
        assert producer.phones == ["3001234567"]

    def test_nombre_comercial_is_required(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            WineProducerCreate(ciudad="Bogotá")

        assert "nombre_comercial" in str(exc_info.value)

    def test_optional_fields_default_to_none(self) -> None:
        producer = WineProducerCreate(nombre_comercial="Test")
        assert producer.razon_social is None
        assert producer.nit is None

    def test_phones_default_to_empty_list(self) -> None:
        producer = WineProducerCreate(nombre_comercial="Test")
        assert producer.phones == []

    def test_phones_accept_multiple_numbers(self) -> None:
        producer = WineProducerCreate(
            nombre_comercial="Test",
            phones=["300", "301"],
        )
        assert producer.phones == ["300", "301"]


class TestWineProducerUpdate:
    """Test WineProducerUpdate schema (all fields optional)."""

    def test_all_fields_are_optional(self) -> None:
        producer = WineProducerUpdate()

        assert producer.nombre_comercial is None
        assert producer.phones == []

    def test_partial_update_succeeds(self) -> None:
        producer = WineProducerUpdate(nombre_comercial="Updated")

        assert producer.nombre_comercial == "Updated"
        assert producer.razon_social is None

    def test_update_phones_replaces_list(self) -> None:
        producer = WineProducerUpdate(phones=["300"])
        assert producer.phones == ["300"]


class TestWineProducerResponse:
    """Test WineProducerResponse schema."""

    def test_response_requires_all_fields(self) -> None:
        producer_id = uuid4()
        now = datetime.now(timezone.utc)

        response = WineProducerResponse(
            id=producer_id,
            nombre_comercial="Test Producer",
            created_at=now,
            updated_at=now,
        )

        assert response.id == producer_id
        assert response.nombre_comercial == "Test Producer"
        assert response.phones == []

    def test_response_serializes_to_dict(self) -> None:
        producer_id = uuid4()
        now = datetime.now(timezone.utc)

        response = WineProducerResponse(
            id=producer_id,
            nombre_comercial="Test Producer",
            phones=["300", "301"],
            created_at=now,
            updated_at=now,
        )

        data = response.model_dump()
        assert data["phones"] == ["300", "301"]
