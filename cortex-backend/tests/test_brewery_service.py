"""Tests for BreweryService business logic."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest

from app.schemas.breweries import BreweryCreate, BreweryUpdate
from app.services.brewery_service import BreweryService


class TestBreweryService:
    """Test BreweryService CRUD operations with mocked Supabase."""

    @pytest.fixture
    def mock_supabase(self):
        """Create a mocked Supabase client."""
        mock = MagicMock()
        return mock

    @pytest.fixture
    def mock_phone_service(self):
        """Create a mocked EntityContactPhoneService."""
        mock = MagicMock()
        mock.get_phones.return_value = []
        mock.batch_load_phones.return_value = {}
        mock.replace_phones.return_value = None
        mock.find_entity_ids_by_phone.return_value = []
        return mock

    @pytest.fixture
    def service(self, mock_supabase, mock_phone_service):
        """Create a BreweryService with mocked client and phone service."""
        return BreweryService(mock_supabase, mock_phone_service)

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

    def test_create_brewery_calls_supabase_insert_and_saves_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        brewery_id = uuid4()
        payload = BreweryCreate(
            nombre_cerveceria="Test Brewery",
            ciudad="Medellín",
            phones=["3001234567", "3017654321"],
        )
        expected_data = {
            "id": str(brewery_id),
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
        # Phones should not be part of the breweries insert payload
        insert_payload = mock_supabase.table.return_value.insert.call_args[0][0]
        assert "phones" not in insert_payload
        assert "celular_1" not in insert_payload
        assert "celular_2" not in insert_payload
        mock_phone_service.replace_phones.assert_called_once_with(
            "brewery", brewery_id, ["3001234567", "3017654321"]
        )
        assert result["nombre_cerveceria"] == "Test Brewery"

    def test_create_brewery_without_phones_still_clears_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        brewery_id = uuid4()
        payload = BreweryCreate(nombre_cerveceria="Test Brewery")
        expected_data = {"id": str(brewery_id), "nombre_cerveceria": "Test Brewery"}
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            expected_data
        ]

        service.create(payload)

        mock_phone_service.replace_phones.assert_called_once_with("brewery", brewery_id, [])

    def test_list_breweries_merges_batched_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        id_1 = uuid4()
        id_2 = uuid4()
        expected_data = [
            {"id": str(id_1), "nombre_cerveceria": "Brewery 1"},
            {"id": str(id_2), "nombre_cerveceria": "Brewery 2"},
        ]
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = (
            expected_data
        )
        mock_phone_service.batch_load_phones.return_value = {
            id_1: ["300"],
            id_2: ["301", "302"],
        }

        result = service.list_all()

        mock_supabase.table.assert_called_once_with("breweries")
        mock_supabase.table.return_value.select.assert_called_once_with("*")
        mock_phone_service.batch_load_phones.assert_called_once_with("brewery", [id_1, id_2])
        assert len(result) == 2
        assert result[0]["phones"] == ["300"]
        assert result[1]["phones"] == ["301", "302"]

    def test_list_breweries_with_no_results_returns_empty_list(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        mock_supabase.table.return_value.select.return_value.execute.return_value.data = []

        result = service.list_all()

        assert result == []
        mock_phone_service.batch_load_phones.assert_not_called()

    def test_get_by_id_existing_brewery_merges_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        brewery_id = uuid4()
        expected_data = {
            "id": str(brewery_id),
            "nombre_cerveceria": "Found Brewery",
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            expected_data
        ]
        mock_phone_service.get_phones.return_value = ["300", "301"]

        result = service.get_by_id(brewery_id)

        assert result is not None
        assert result["nombre_cerveceria"] == "Found Brewery"
        assert result["phones"] == ["300", "301"]
        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with(
            "id", str(brewery_id)
        )
        mock_phone_service.get_phones.assert_called_once_with("brewery", brewery_id)

    def test_get_by_id_nonexistent_brewery_returns_none(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        brewery_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_by_id(brewery_id)

        assert result is None
        mock_phone_service.get_phones.assert_not_called()

    def test_update_existing_brewery_excludes_phones_from_payload_and_replaces_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        brewery_id = uuid4()
        payload = BreweryUpdate(nombre_cerveceria="Updated Name", phones=["310"])
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
        update_payload = mock_supabase.table.return_value.update.call_args[0][0]
        assert "phones" not in update_payload
        assert "celular_1" not in update_payload
        assert "celular_2" not in update_payload
        mock_phone_service.replace_phones.assert_called_once_with(
            "brewery", brewery_id, ["310"]
        )

    def test_update_nonexistent_brewery_returns_none(
        self, service, mock_supabase
    ) -> None:
        brewery_id = uuid4()
        payload = BreweryUpdate(nombre_cerveceria="Updated Name")
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.update(brewery_id, payload)

        assert result is None

    def test_delete_existing_brewery_returns_true_and_does_not_clean_phones(
        self, service, mock_supabase, mock_phone_service
    ) -> None:
        brewery_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
            {"id": str(brewery_id)}
        ]

        result = service.delete(brewery_id)

        assert result is True
        mock_supabase.table.return_value.delete.assert_called_once()
        mock_phone_service.delete_phones.assert_not_called()  # DB trigger owns cleanup

    def test_delete_nonexistent_brewery_returns_false(
        self, service, mock_supabase
    ) -> None:
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
            "correo,direccion,ciudad,pais,tipo_operacion,"
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

    def test_search_with_phone_uses_two_step_query(self, service, mock_supabase, mock_phone_service) -> None:
        matching_id = uuid4()
        expected = [{"id": str(matching_id), "nombre_cerveceria": "Brewery 1"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.in_.return_value = query_builder
        query_builder.execute.return_value.data = expected
        mock_phone_service.find_entity_ids_by_phone.return_value = [matching_id]

        result = service.search(phone="3001234567")

        mock_phone_service.find_entity_ids_by_phone.assert_called_once_with(
            "brewery", "3001234567"
        )
        query_builder.in_.assert_called_once_with("id", [str(matching_id)])
        assert len(result) == 1

    def test_search_with_phone_no_matches_returns_empty(self, service, mock_supabase, mock_phone_service) -> None:
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.in_.return_value = query_builder
        query_builder.execute.return_value.data = []
        mock_phone_service.find_entity_ids_by_phone.return_value = []

        result = service.search(phone="999")

        query_builder.in_.assert_called_once_with("id", [])
        assert result == []

    def test_search_attaches_phones_after_retrieval(self, service, mock_supabase, mock_phone_service) -> None:
        id_1 = uuid4()
        id_2 = uuid4()
        expected_data = [
            {"id": str(id_1), "nombre_cerveceria": "Brewery 1"},
            {"id": str(id_2), "nombre_cerveceria": "Brewery 2"},
        ]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.execute.return_value.data = expected_data
        mock_phone_service.batch_load_phones.return_value = {
            id_1: ["300"],
            id_2: ["301", "302"],
        }

        result = service.search()

        mock_phone_service.batch_load_phones.assert_called_once_with("brewery", [id_1, id_2])
        assert len(result) == 2
        assert result[0]["phones"] == ["300"]
        assert result[1]["phones"] == ["301", "302"]

    def test_search_with_phone_no_results_does_not_batch_load_phones(self, service, mock_supabase, mock_phone_service) -> None:
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.in_.return_value = query_builder
        query_builder.execute.return_value.data = []
        mock_phone_service.find_entity_ids_by_phone.return_value = []

        result = service.search(phone="999")

        assert result == []
        mock_phone_service.batch_load_phones.assert_not_called()

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
        expected = [{"id": str(uuid4()), "pais": "Colombia"}]
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
            "correo,direccion,ciudad,pais,tipo_operacion,"
            "maltas_utilizadas,lupulos_utilizados,levaduras_utilizadas,"
            "utiliza_otros_productos,estilos_cerveza,marca_equipo,capacidad_brewhouse,"
            "capacidad_fermentacion,litros_mes,calidad_equipo,formatos_venta,"
            "donde_vende,observaciones,oportunidades,created_at,updated_at"
        )
        # phones is a virtual field stored in entity_contact_phones, not a physical column.
        select_arg = mock_supabase.table.return_value.select.call_args[0][0]
        assert "phones" not in select_arg

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

    def test_inspect_with_phone_uses_two_step_query(self, service, mock_supabase, mock_phone_service) -> None:
        matching_id = uuid4()
        expected = [{"id": str(matching_id), "nombre_cerveceria": "Brewery 1"}]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.limit.return_value = query_builder
        query_builder.in_.return_value = query_builder
        query_builder.execute.return_value.data = expected
        mock_phone_service.find_entity_ids_by_phone.return_value = [matching_id]

        result = service.inspect(phone="300")

        mock_phone_service.find_entity_ids_by_phone.assert_called_once_with("brewery", "300")
        query_builder.in_.assert_called_once_with("id", [str(matching_id)])
        assert len(result) == 1

    def test_inspect_with_phone_no_matches_returns_empty(self, service, mock_supabase, mock_phone_service) -> None:
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.limit.return_value = query_builder
        query_builder.in_.return_value = query_builder
        query_builder.execute.return_value.data = []
        mock_phone_service.find_entity_ids_by_phone.return_value = []

        result = service.inspect(phone="999")

        query_builder.in_.assert_called_once_with("id", [])
        assert result == []

    def test_inspect_attaches_phones_after_retrieval(self, service, mock_supabase, mock_phone_service) -> None:
        id_1 = uuid4()
        id_2 = uuid4()
        expected_data = [
            {"id": str(id_1), "nombre_cerveceria": "Brewery 1"},
            {"id": str(id_2), "nombre_cerveceria": "Brewery 2"},
        ]
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.limit.return_value = query_builder
        query_builder.execute.return_value.data = expected_data
        mock_phone_service.batch_load_phones.return_value = {
            id_1: ["300"],
            id_2: ["301", "302"],
        }

        result = service.inspect()

        mock_phone_service.batch_load_phones.assert_called_once_with("brewery", [id_1, id_2])
        assert len(result) == 2
        assert result[0]["phones"] == ["300"]
        assert result[1]["phones"] == ["301", "302"]

    def test_inspect_with_phone_no_results_does_not_batch_load_phones(self, service, mock_supabase, mock_phone_service) -> None:
        query_builder = mock_supabase.table.return_value.select.return_value
        query_builder.limit.return_value = query_builder
        query_builder.in_.return_value = query_builder
        query_builder.execute.return_value.data = []
        mock_phone_service.find_entity_ids_by_phone.return_value = []

        result = service.inspect(phone="999")

        assert result == []
        mock_phone_service.batch_load_phones.assert_not_called()
