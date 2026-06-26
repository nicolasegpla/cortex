"""Tests for BreweryService business logic."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest

from app.core.config import Settings
from app.schemas.breweries import BreweryCreate, BreweryUpdate
from app.services.brewery_service import BreweryService


class TestBreweryServiceRefreshEmbedding:
    """Test BreweryService.refresh_embedding hash dedup and OpenAI wiring."""

    @pytest.fixture
    def mock_supabase(self):
        return MagicMock()

    @pytest.fixture
    def mock_embedding_service(self):
        mock = MagicMock()
        mock.build_canonical_text.return_value = "canonical text"
        mock.compute_hash.return_value = "current-hash"
        mock.generate_embedding = AsyncMock(return_value=[0.01] * 1536)
        return mock

    @pytest.fixture
    def settings(self):
        return Settings(
            OPENAI_API_KEY="sk-test",
            EMBEDDING_MODEL="text-embedding-3-small",
            EMBEDDING_DIMENSION=1536,
            EMBEDDINGS_ENABLED=True,
        )

    @pytest.fixture
    def service(self, mock_supabase, mock_embedding_service, settings):
        return BreweryService(
            mock_supabase,
            embedding_service=mock_embedding_service,
            settings=settings,
        )

    @pytest.fixture
    def brewery_id(self):
        return uuid4()

    def _brewery_row(self, brewery_id: UUID, **overrides):
        return {
            "id": str(brewery_id),
            "nombre_cerveceria": "Test Brewery",
            "embedding": [0.1] * 1536,
            "embedding_status": overrides.get("embedding_status", "pending"),
            "embedding_model": overrides.get("embedding_model", "text-embedding-3-small"),
            "embedding_source_hash": overrides.get("embedding_source_hash", "current-hash"),
            "embedding_updated_at": "2026-01-01T00:00:00+00:00",
            **overrides,
        }

    def _configure_get_by_id(self, mock_supabase, row):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            [row] if row is not None else []
        )

    def _configure_update(self, mock_supabase, updated_row):
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            updated_row
        ]

    @pytest.mark.asyncio
    async def test_refresh_embedding_missing_brewery_returns_none(
        self, service, mock_supabase, mock_embedding_service, brewery_id
    ):
        self._configure_get_by_id(mock_supabase, None)

        result = await service.refresh_embedding(brewery_id)

        assert result is None
        mock_embedding_service.generate_embedding.assert_not_called()
        mock_supabase.table.return_value.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_refresh_embedding_skips_when_ready_hash_and_model_match(
        self, service, mock_supabase, mock_embedding_service, brewery_id
    ):
        row = self._brewery_row(
            brewery_id,
            embedding_status="ready",
            embedding_source_hash="current-hash",
            embedding_model="text-embedding-3-small",
        )
        self._configure_get_by_id(mock_supabase, row)

        result = await service.refresh_embedding(brewery_id)

        assert result == row
        mock_embedding_service.generate_embedding.assert_not_called()
        mock_supabase.table.return_value.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_refresh_embedding_regenerates_when_hash_mismatch(
        self, service, mock_supabase, mock_embedding_service, brewery_id
    ):
        row = self._brewery_row(
            brewery_id,
            embedding_status="ready",
            embedding_source_hash="old-hash",
            embedding_model="text-embedding-3-small",
        )
        updated_row = self._brewery_row(
            brewery_id,
            embedding_status="ready",
            embedding_source_hash="current-hash",
            embedding_model="text-embedding-3-small",
        )
        self._configure_get_by_id(mock_supabase, row)
        self._configure_update(mock_supabase, updated_row)

        result = await service.refresh_embedding(brewery_id)

        mock_embedding_service.generate_embedding.assert_awaited_once_with("canonical text")
        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["embedding_status"] == "ready"
        assert update_call["embedding_model"] == "text-embedding-3-small"
        assert update_call["embedding_source_hash"] == "current-hash"
        assert update_call["embedding"] == [0.01] * 1536
        assert "embedding_updated_at" in update_call
        assert result == updated_row

    @pytest.mark.asyncio
    async def test_refresh_embedding_regenerates_when_model_mismatch(
        self, service, mock_supabase, mock_embedding_service, brewery_id
    ):
        row = self._brewery_row(
            brewery_id,
            embedding_status="ready",
            embedding_source_hash="current-hash",
            embedding_model="old-model",
        )
        self._configure_get_by_id(mock_supabase, row)
        self._configure_update(mock_supabase, row)

        await service.refresh_embedding(brewery_id)

        mock_embedding_service.generate_embedding.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_refresh_embedding_regenerates_when_status_error(
        self, service, mock_supabase, mock_embedding_service, brewery_id
    ):
        row = self._brewery_row(
            brewery_id,
            embedding_status="error",
            embedding_source_hash="current-hash",
            embedding_model="text-embedding-3-small",
        )
        self._configure_get_by_id(mock_supabase, row)
        self._configure_update(mock_supabase, row)

        await service.refresh_embedding(brewery_id)

        mock_embedding_service.generate_embedding.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_refresh_embedding_force_bypasses_dedup(
        self, service, mock_supabase, mock_embedding_service, brewery_id
    ):
        row = self._brewery_row(
            brewery_id,
            embedding_status="ready",
            embedding_source_hash="current-hash",
            embedding_model="text-embedding-3-small",
        )
        self._configure_get_by_id(mock_supabase, row)
        self._configure_update(mock_supabase, row)

        await service.refresh_embedding(brewery_id, force=True)

        mock_embedding_service.generate_embedding.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_refresh_embedding_failure_preserves_prior_vector(
        self, service, mock_supabase, mock_embedding_service, brewery_id
    ):
        prior_vector = [0.99] * 1536
        row = self._brewery_row(
            brewery_id,
            embedding=prior_vector,
            embedding_status="ready",
            embedding_source_hash="old-hash",
            embedding_model="text-embedding-3-small",
        )
        updated_row = self._brewery_row(brewery_id, embedding=prior_vector, embedding_status="error")
        self._configure_get_by_id(mock_supabase, row)
        self._configure_update(mock_supabase, updated_row)
        mock_embedding_service.generate_embedding.side_effect = RuntimeError("OpenAI request failed")

        result = await service.refresh_embedding(brewery_id)

        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call == {"embedding_status": "error"}
        assert result == updated_row

    @pytest.mark.asyncio
    async def test_refresh_embedding_accepts_string_id(
        self, service, mock_supabase, mock_embedding_service
    ):
        brewery_id = str(uuid4())
        row = self._brewery_row(
            UUID(brewery_id),
            embedding_status="pending",
            embedding_source_hash="old-hash",
        )
        updated_row = self._brewery_row(
            UUID(brewery_id),
            embedding_status="ready",
            embedding_source_hash="current-hash",
            embedding_model="text-embedding-3-small",
        )
        self._configure_get_by_id(mock_supabase, row)
        self._configure_update(mock_supabase, updated_row)

        result = await service.refresh_embedding(brewery_id)

        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with(
            "id", brewery_id
        )
        mock_embedding_service.generate_embedding.assert_awaited_once()
        assert result == updated_row

    @pytest.mark.asyncio
    async def test_refresh_embedding_failure_does_not_raise(
        self, service, mock_supabase, mock_embedding_service, brewery_id, caplog
    ):
        row = self._brewery_row(
            brewery_id,
            embedding_status="pending",
            embedding_source_hash="old-hash",
        )
        self._configure_get_by_id(mock_supabase, row)
        self._configure_update(mock_supabase, {**row, "embedding_status": "error"})
        mock_embedding_service.generate_embedding.side_effect = ValueError("No key")

        with caplog.at_level("ERROR"):
            result = await service.refresh_embedding(brewery_id)

        assert result is not None
        assert result["embedding_status"] == "error"
        assert "No key" in caplog.text


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

    def test_update_marks_embedding_pending_when_requested(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        payload = BreweryUpdate(nombre_cerveceria="Updated Name")
        expected_data = {
            "id": str(brewery_id),
            "nombre_cerveceria": "Updated Name",
            "embedding_status": "pending",
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.update(brewery_id, payload, mark_embedding_pending=True)

        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["nombre_cerveceria"] == "Updated Name"
        assert update_call["embedding_status"] == "pending"
        assert result == expected_data

    def test_update_does_not_mark_embedding_pending_by_default(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        payload = BreweryUpdate(nombre_cerveceria="Updated Name")
        expected_data = {
            "id": str(brewery_id),
            "nombre_cerveceria": "Updated Name",
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        service.update(brewery_id, payload)

        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert "embedding_status" not in update_call

    def test_mark_embedding_pending_sets_status(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        expected_data = {
            "id": str(brewery_id),
            "nombre_cerveceria": "Test Brewery",
            "embedding_status": "pending",
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]

        result = service.mark_embedding_pending(brewery_id)

        assert result == expected_data
        mock_supabase.table.assert_called_once_with("breweries")
        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call == {"embedding_status": "pending"}
        mock_supabase.table.return_value.update.return_value.eq.assert_called_once_with(
            "id", str(brewery_id)
        )

    def test_mark_embedding_pending_missing_brewery_returns_none(self, service, mock_supabase) -> None:
        brewery_id = uuid4()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.mark_embedding_pending(brewery_id)

        assert result is None

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

    # --- search() and count() (Phase 3: chat-db-access) ---

    def _brewery_projection(self):
        return (
            "id,nombre_cerveceria,razon_social,nit,nombre_cervecero,nombre_contacto,"
            "celular_1,celular_2,correo,direccion,ciudad,pais,tipo_operacion,"
            "maltas_utilizadas,lupulos_utilizados,levaduras_utilizadas,"
            "utiliza_otros_productos,estilos_cerveza,marca_equipo,capacidad_brewhouse,"
            "capacidad_fermentacion,litros_mes,calidad_equipo,formatos_venta,"
            "donde_vende,observaciones,oportunidades,created_at,updated_at"
        )

    def test_search_no_filters_returns_all(self, service, mock_supabase) -> None:
        expected = [
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 1"},
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 2"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = expected

        result = service.search()

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.select.assert_called_once_with(self._brewery_projection())
        assert len(result) == 2

    def test_search_with_city_filter_applies_accent_tolerant(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "ciudad": "Bogotá"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.or_.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(city="Bogotá")

        mock_supabase.table.return_value.select.assert_called_once_with(self._brewery_projection())
        query_builder.or_.assert_called_once_with("ciudad.ilike.Bogotá,ciudad.ilike.Bogota")
        assert len(result) == 1

    def test_search_with_city_no_accent_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "ciudad": "Medellín"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(city="Medellin")

        query_builder.ilike.assert_called_once_with("ciudad", "Medellin")
        assert len(result) == 1

    def test_search_with_all_filters_applies_multiple(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "ciudad": "Medellín"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.eq.return_value = query_builder
        query_builder.or_.return_value = query_builder
        query_builder.execute.return_value.data = expected
        query_builder.execute.return_value.data = expected

        result = service.search(city="Medellín", country="Colombia", operation_type="planta_propia")

        # city uses or_ (has accents), country uses ilike (no accents), operation_type uses eq
        assert query_builder.ilike.call_count == 1
        query_builder.ilike.assert_any_call("pais", "Colombia")
        query_builder.or_.assert_called_once_with("ciudad.ilike.Medellín,ciudad.ilike.Medellin")
        query_builder.eq.assert_called_once_with("tipo_operacion", "planta_propia")
        assert len(result) == 1
    def test_search_with_partial_filters(self, service, mock_supabase) -> None:
        expected = [{'id': str(uuid4()), 'pais': 'Colombia'}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(country="Colombia")

        query_builder.ilike.assert_called_once_with("pais", "Colombia")
        assert len(result) == 1
    def test_count_returns_int(self, service, mock_supabase) -> None:
        mock_response = MagicMock()
        mock_response.count = 42
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response

        result = service.count()

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.select.assert_called_once_with("*", count="exact")
        assert result == 42
        assert isinstance(result, int)

    def test_count_zero_results(self, service, mock_supabase) -> None:
        mock_response = MagicMock()
        mock_response.count = 0
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response

        result = service.count()

        assert result == 0

    def test_search_with_brewery_name_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nombre_cerveceria": "Artesanal Brew"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(brewery_name="Artesanal")

        query_builder.ilike.assert_any_call("nombre_cerveceria", "%Artesanal%")
        assert len(result) == 1

    def test_search_with_brewer_name_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nombre_cervecero": "Juan Perez"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(brewer_name="Juan")

        query_builder.ilike.assert_any_call("nombre_cervecero", "%Juan%")
        assert len(result) == 1

    def test_search_with_contact_name_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nombre_contacto": "Maria Gomez"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(contact_name="Maria")

        query_builder.ilike.assert_any_call("nombre_contacto", "%Maria%")
        assert len(result) == 1

    def test_search_with_address_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "direccion": "Calle 123"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(address="Calle 123")

        query_builder.ilike.assert_any_call("direccion", "%Calle 123%")
        assert len(result) == 1

    def test_search_with_phone_uses_or_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "celular_1": "3001234567"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.or_.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(phone="3001234567")

        query_builder.or_.assert_called_once_with(
            "celular_1.ilike.%3001234567%,celular_2.ilike.%3001234567%"
        )
        assert len(result) == 1

    def test_search_with_email_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "correo": "brew@example.com"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(email="brew@example.com")

        query_builder.ilike.assert_any_call("correo", "%brew@example.com%")
        assert len(result) == 1

    def test_search_with_hop_uses_contains(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "lupulos_utilizados": ["Cascade"]}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.cs.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(hop="Cascade")

        query_builder.cs.assert_called_once_with("lupulos_utilizados", ["Cascade"])
        assert len(result) == 1

    def test_search_with_malt_uses_contains(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "maltas_utilizadas": ["Pilsen"]}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.cs.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(malt="Pilsen")

        query_builder.cs.assert_called_once_with("maltas_utilizadas", ["Pilsen"])
        assert len(result) == 1

    # --- New expanded field tests ---

    def test_search_with_legal_name_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "razon_social": "Cerveza Artesanal S.A."}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(legal_name="Artesanal")

        query_builder.ilike.assert_any_call("razon_social", "%Artesanal%")
        assert len(result) == 1

    def test_search_with_tax_id_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nit": "900123456-7"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(tax_id="900123456")

        query_builder.ilike.assert_any_call("nit", "%900123456%")
        assert len(result) == 1

    def test_search_with_yeast_uses_contains(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "levaduras_utilizadas": ["US-05"]}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.cs.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(yeast="US-05")

        query_builder.cs.assert_called_once_with("levaduras_utilizadas", ["US-05"])
        assert len(result) == 1

    def test_search_with_uses_other_products_uses_eq(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "utiliza_otros_productos": True}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.eq.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(uses_other_products=True)

        query_builder.eq.assert_any_call("utiliza_otros_productos", True)
        assert len(result) == 1

    def test_search_with_beer_styles_uses_contains(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "estilos_cerveza": ["IPA", "Stout"]}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.cs.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(beer_styles="IPA")

        query_builder.cs.assert_called_once_with("estilos_cerveza", ["IPA"])
        assert len(result) == 1

    def test_search_with_equipment_brand_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "marca_equipo": "Ss Brewtech"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(equipment_brand="Ss Brewtech")

        query_builder.ilike.assert_any_call("marca_equipo", "%Ss Brewtech%")
        assert len(result) == 1

    def test_search_with_brewhouse_capacity_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "capacidad_brewhouse": "500L"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(brewhouse_capacity="500L")

        query_builder.ilike.assert_any_call("capacidad_brewhouse", "%500L%")
        assert len(result) == 1

    def test_search_with_fermentation_capacity_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "capacidad_fermentacion": "1000L"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(fermentation_capacity="1000L")

        query_builder.ilike.assert_any_call("capacidad_fermentacion", "%1000L%")
        assert len(result) == 1

    def test_search_with_liters_per_month_uses_eq(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "litros_mes": 5000}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.eq.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(liters_per_month=5000)

        query_builder.eq.assert_any_call("litros_mes", 5000)
        assert len(result) == 1

    def test_search_with_equipment_quality_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "calidad_equipo": "Alta"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(equipment_quality="Alta")

        query_builder.ilike.assert_any_call("calidad_equipo", "%Alta%")
        assert len(result) == 1

    def test_search_with_sales_formats_uses_contains(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "formatos_venta": ["botella", "lata"]}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.cs.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(sales_formats="botella")

        query_builder.cs.assert_called_once_with("formatos_venta", ["botella"])
        assert len(result) == 1

    def test_search_with_sells_where_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "donde_vende": "Supermercados"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(sells_where="Supermercados")

        query_builder.ilike.assert_any_call("donde_vende", "%Supermercados%")
        assert len(result) == 1

    def test_search_with_observations_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "observaciones": "Excelente cliente"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(observations="Excelente")

        query_builder.ilike.assert_any_call("observaciones", "%Excelente%")
        assert len(result) == 1

    def test_search_with_opportunities_uses_ilike(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "oportunidades": "Expandir distribución"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.ilike.return_value = query_builder
        query_builder.execute.return_value.data = expected

        result = service.search(opportunities="Expandir")

        query_builder.ilike.assert_any_call("oportunidades", "%Expandir%")
        assert len(result) == 1

    def test_search_selects_safe_projection(self, service, mock_supabase) -> None:
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.execute.return_value.data = []

        service.search()

        mock_supabase.table.return_value.select.assert_called_once_with(
            "id,nombre_cerveceria,razon_social,nit,nombre_cervecero,nombre_contacto,"
            "celular_1,celular_2,correo,direccion,ciudad,pais,tipo_operacion,"
            "maltas_utilizadas,lupulos_utilizados,levaduras_utilizadas,"
            "utiliza_otros_productos,estilos_cerveza,marca_equipo,capacidad_brewhouse,"
            "capacidad_fermentacion,litros_mes,calidad_equipo,formatos_venta,"
            "donde_vende,observaciones,oportunidades,created_at,updated_at"
        )

    # --- inspect() (Phase 4: inspect breweries tool) ---

    def test_inspect_no_filters_returns_all_with_default_limit(self, service, mock_supabase) -> None:
        expected = [
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 1"},
            {"id": str(uuid4()), "nombre_cerveceria": "Brewery 2"},
        ]
        mock_supabase.table.return_value.select.return_value.limit.return_value.execute.return_value.data = expected

        result = service.inspect()

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.select.assert_called_once_with(self._brewery_projection())
        mock_supabase.table.return_value.select.return_value.limit.assert_called_once_with(20)
        assert len(result) == 2

    def test_inspect_with_custom_limit(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nombre_cerveceria": "Brewery 1"}]
        mock_supabase.table.return_value.select.return_value.limit.return_value.execute.return_value.data = expected

        result = service.inspect(limit=5)

        mock_supabase.table.return_value.select.return_value.limit.assert_called_once_with(5)
        assert len(result) == 1

    def test_inspect_with_offset(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nombre_cerveceria": "Brewery 3"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.limit.return_value = query_builder
        query_builder.offset.return_value.execute.return_value.data = expected

        result = service.inspect(limit=10, offset=20)

        query_builder.limit.assert_called_once_with(10)
        query_builder.offset.assert_called_once_with(20)
        assert len(result) == 1

    def test_inspect_caps_limit_at_50(self, service, mock_supabase) -> None:
        mock_supabase.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []

        service.inspect(limit=100)

        mock_supabase.table.return_value.select.return_value.limit.assert_called_once_with(50)

    def test_inspect_with_city_filter(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "ciudad": "Bogotá"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.or_.return_value = query_builder
        query_builder.or_.return_value = query_builder
        query_builder.limit.return_value.execute.return_value.data = expected

        result = service.inspect(city="Bogotá")

        query_builder.or_.assert_called_once_with("ciudad.ilike.Bogotá,ciudad.ilike.Bogota")
        assert len(result) == 1

    def test_inspect_with_beer_styles_filter(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "estilos_cerveza": ["IPA"]}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.cs.return_value = query_builder
        query_builder.limit.return_value.execute.return_value.data = expected

        result = service.inspect(beer_styles="IPA")

        query_builder.cs.assert_called_once_with("estilos_cerveza", ["IPA"])
        assert len(result) == 1

    def test_inspect_with_order_by(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nombre_cerveceria": "A Brewery"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.order.return_value = query_builder
        query_builder.limit.return_value.execute.return_value.data = expected

        result = service.inspect(order_by="nombre_cerveceria")

        query_builder.order.assert_called_once_with("nombre_cerveceria", desc=False)
        assert len(result) == 1

    def test_inspect_with_order_by_desc(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "nombre_cerveceria": "Z Brewery"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.order.return_value = query_builder
        query_builder.limit.return_value.execute.return_value.data = expected

        result = service.inspect(order_by="created_at", desc=True)

        query_builder.order.assert_called_once_with("created_at", desc=True)
        assert len(result) == 1

    def test_inspect_combines_multiple_filters(self, service, mock_supabase) -> None:
        expected = [{"id": str(uuid4()), "ciudad": "Bogotá", "estilos_cerveza": ["IPA"]}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.or_.return_value = query_builder
        query_builder.cs.return_value = query_builder
        query_builder.limit.return_value.execute.return_value.data = expected

        result = service.inspect(city="Bogotá", beer_styles="IPA", limit=10)


        query_builder.or_.assert_called_once_with("ciudad.ilike.Bogotá,ciudad.ilike.Bogota")
        query_builder.limit.assert_called_once_with(10)
