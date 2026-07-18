"""Tests for animal feed producer Pydantic schemas."""

from uuid import uuid4
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.animal_feed_producers import (
    AnimalFeedProducerCreate,
    AnimalFeedProducerResponse,
    AnimalFeedProducerUpdate,
)


class TestAnimalFeedProducerCreate:
    """Test AnimalFeedProducerCreate schema validation."""

    def test_valid_animal_feed_producer_create_succeeds(self) -> None:
        producer = AnimalFeedProducerCreate(
            razon_social="Nutri Feed S.A.",
            ciudad="Bogotá",
            especies_manejadas=["Bovinos", "Porcinos"],
            phones=["3001234567"],
        )

        assert producer.razon_social == "Nutri Feed S.A."
        assert producer.ciudad == "Bogotá"
        assert producer.especies_manejadas == ["Bovinos", "Porcinos"]
        assert producer.phones == ["3001234567"]

    def test_razon_social_is_required(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            AnimalFeedProducerCreate(ciudad="Bogotá")

        assert "razon_social" in str(exc_info.value)

    def test_optional_fields_default_to_none(self) -> None:
        producer = AnimalFeedProducerCreate(razon_social="Test")
        assert producer.nit is None
        assert producer.ciudad is None

    def test_phones_default_to_empty_list(self) -> None:
        producer = AnimalFeedProducerCreate(razon_social="Test")
        assert producer.phones == []

    def test_phones_accept_multiple_numbers(self) -> None:
        producer = AnimalFeedProducerCreate(
            razon_social="Test",
            phones=["300", "301"],
        )
        assert producer.phones == ["300", "301"]


class TestAnimalFeedProducerUpdate:
    """Test AnimalFeedProducerUpdate schema (all fields optional)."""

    def test_all_fields_are_optional(self) -> None:
        producer = AnimalFeedProducerUpdate()

        assert producer.razon_social is None
        assert producer.phones == []

    def test_partial_update_succeeds(self) -> None:
        producer = AnimalFeedProducerUpdate(razon_social="Updated")

        assert producer.razon_social == "Updated"
        assert producer.ciudad is None

    def test_update_phones_replaces_list(self) -> None:
        producer = AnimalFeedProducerUpdate(phones=["300"])
        assert producer.phones == ["300"]


class TestAnimalFeedProducerResponse:
    """Test AnimalFeedProducerResponse schema."""

    def test_response_requires_all_fields(self) -> None:
        producer_id = uuid4()
        now = datetime.now(timezone.utc)

        response = AnimalFeedProducerResponse(
            id=producer_id,
            razon_social="Test Producer",
            created_at=now,
            updated_at=now,
        )

        assert response.id == producer_id
        assert response.razon_social == "Test Producer"
        assert response.phones == []

    def test_response_serializes_to_dict(self) -> None:
        producer_id = uuid4()
        now = datetime.now(timezone.utc)

        response = AnimalFeedProducerResponse(
            id=producer_id,
            razon_social="Test Producer",
            phones=["300", "301"],
            created_at=now,
            updated_at=now,
        )

        data = response.model_dump()
        assert data["phones"] == ["300", "301"]
