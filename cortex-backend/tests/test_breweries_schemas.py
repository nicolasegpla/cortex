"""Tests for brewery Pydantic schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.breweries import BreweryCreate, BreweryResponse, BreweryUpdate


class TestBreweryCreate:
    """Test BreweryCreate schema validation."""

    def test_valid_brewery_create_succeeds(self) -> None:
        data = {
            "nombre_cerveceria": "Cerveza Artesanal S.A.",
            "razon_social": "Cerveza Artesanal Sociedad Anonima",
            "nit": "900123456-7",
            "ciudad": "Bogotá",
            "pais": "Colombia",
            "tipo_operacion": "planta_propia",
        }

        brewery = BreweryCreate(**data)

        assert brewery.nombre_cerveceria == "Cerveza Artesanal S.A."
        assert brewery.razon_social == "Cerveza Artesanal Sociedad Anonima"
        assert brewery.nit == "900123456-7"
        assert brewery.ciudad == "Bogotá"
        assert brewery.pais == "Colombia"
        assert brewery.tipo_operacion == "planta_propia"

    def test_nombre_cerveceria_is_required(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            BreweryCreate(razon_social="Test")

        assert "nombre_cerveceria" in str(exc_info.value)

    def test_invalid_tipo_operacion_raises_error(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            BreweryCreate(
                nombre_cerveceria="Test",
                tipo_operacion="invalid_type",
            )

        assert "tipo_operacion" in str(exc_info.value)

    def test_valid_tipo_operacion_values_accepted(self) -> None:
        for tipo in ["maquila", "planta_propia", "ambos"]:
            brewery = BreweryCreate(nombre_cerveceria="Test", tipo_operacion=tipo)
            assert brewery.tipo_operacion == tipo

    def test_array_fields_accept_lists(self) -> None:
        brewery = BreweryCreate(
            nombre_cerveceria="Test",
            maltas_utilizadas=["Pilsen", "Caramelo"],
            lupulos_utilizados=["Cascade", "Simcoe"],
            levaduras_utilizadas=["Ale"],
            estilos_cerveza=["IPA", "Stout"],
            formatos_venta=["Botella", "Lata"],
        )

        assert brewery.maltas_utilizadas == ["Pilsen", "Caramelo"]
        assert brewery.lupulos_utilizados == ["Cascade", "Simcoe"]
        assert brewery.levaduras_utilizadas == ["Ale"]
        assert brewery.estilos_cerveza == ["IPA", "Stout"]
        assert brewery.formatos_venta == ["Botella", "Lata"]

    def test_optional_fields_default_to_none(self) -> None:
        brewery = BreweryCreate(nombre_cerveceria="Test")

        assert brewery.razon_social is None
        assert brewery.nit is None
        assert brewery.direccion is None
        assert brewery.ciudad is None
        assert brewery.pais is None


class TestBreweryUpdate:
    """Test BreweryUpdate schema (all fields optional)."""

    def test_all_fields_are_optional(self) -> None:
        brewery = BreweryUpdate()

        assert brewery.nombre_cerveceria is None
        assert brewery.razon_social is None

    def test_partial_update_succeeds(self) -> None:
        brewery = BreweryUpdate(nombre_cerveceria="Updated Name")

        assert brewery.nombre_cerveceria == "Updated Name"
        assert brewery.razon_social is None

    def test_invalid_tipo_operacion_in_update_raises_error(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            BreweryUpdate(tipo_operacion="invalid")

        assert "tipo_operacion" in str(exc_info.value)


class TestBreweryResponse:
    """Test BreweryResponse schema."""

    def test_response_requires_all_fields(self) -> None:
        from uuid import uuid4
        from datetime import datetime, timezone

        brewery_id = uuid4()
        now = datetime.now(timezone.utc)

        response = BreweryResponse(
            id=brewery_id,
            nombre_cerveceria="Test Brewery",
            created_at=now,
            updated_at=now,
        )

        assert response.id == brewery_id
        assert response.nombre_cerveceria == "Test Brewery"
        assert response.created_at == now
        assert response.updated_at == now

    def test_response_serializes_to_dict(self) -> None:
        from uuid import uuid4
        from datetime import datetime, timezone

        brewery_id = uuid4()
        now = datetime.now(timezone.utc)

        response = BreweryResponse(
            id=brewery_id,
            nombre_cerveceria="Test Brewery",
            ciudad="Bogotá",
            created_at=now,
            updated_at=now,
        )

        data = response.model_dump()
        assert data["nombre_cerveceria"] == "Test Brewery"
        assert data["ciudad"] == "Bogotá"
        assert "id" in data

    def test_response_includes_embedding_metadata(self) -> None:
        from uuid import uuid4
        from datetime import datetime, timezone

        brewery_id = uuid4()
        now = datetime.now(timezone.utc)

        response = BreweryResponse(
            id=brewery_id,
            nombre_cerveceria="Test Brewery",
            created_at=now,
            updated_at=now,
            embedding_status="ready",
            embedding_updated_at=now,
        )

        data = response.model_dump()
        assert data["embedding_status"] == "ready"
        assert data["embedding_updated_at"] == now

    def test_response_embedding_fields_default_to_none(self) -> None:
        from uuid import uuid4
        from datetime import datetime, timezone

        brewery_id = uuid4()
        now = datetime.now(timezone.utc)

        response = BreweryResponse(
            id=brewery_id,
            nombre_cerveceria="Test Brewery",
            created_at=now,
            updated_at=now,
        )

        data = response.model_dump()
        assert data["embedding_status"] is None
        assert data["embedding_updated_at"] is None
