"""Business logic service for brewery operations."""

from uuid import UUID

from app.schemas.breweries import BreweryCreate, BreweryUpdate
from app.services.entity_contact_phone_service import EntityContactPhoneService
from app.utils.text_matching import build_accent_tolerant_query


class BreweryService:
    """Service layer for brewery CRUD operations using Supabase."""

    _ENTITY_TYPE = "brewery"

    def __init__(
        self,
        supabase_client,
        phone_service: EntityContactPhoneService,
    ) -> None:
        self.supabase = supabase_client
        self.phone_service = phone_service

    def _exclude_phones(self, payload: BreweryCreate | BreweryUpdate) -> dict:
        """Dump payload excluding the virtual ``phones`` field."""
        return payload.model_dump(
            exclude_unset=True,
            exclude_none=True,
            exclude={"phones"},
        )

    def _merge_phones(self, record: dict | None, entity_id: UUID) -> dict | None:
        """Attach ordered phones from the shared phone store to a record."""
        if record is None:
            return None
        record["phones"] = self.phone_service.get_phones(self._ENTITY_TYPE, entity_id)
        return record

    def _merge_batch_phones(self, records: list[dict]) -> list[dict]:
        """Attach ordered phones from the shared phone store to each record."""
        if not records:
            return records
        ids = [UUID(record["id"]) for record in records]
        phones_by_id = self.phone_service.batch_load_phones(self._ENTITY_TYPE, ids)
        for record in records:
            record["phones"] = phones_by_id.get(UUID(record["id"]), [])
        return records

    def create(self, payload: BreweryCreate) -> dict:
        """Create a new brewery in Supabase and persist its phones."""
        data = self._exclude_phones(payload)
        response = self.supabase.table("breweries").insert(data).execute()
        record = response.data[0] if response.data else {}
        if record:
            brewery_id = UUID(record["id"])
            self.phone_service.replace_phones(
                self._ENTITY_TYPE, brewery_id, payload.phones
            )
            record = self._merge_phones(record, brewery_id)
        return record

    def list_all(self) -> list[dict]:
        """List all breweries from Supabase with their ordered phones."""
        response = self.supabase.table("breweries").select("*").execute()
        records = response.data or []
        return self._merge_batch_phones(records)

    def get_by_id(self, brewery_id: UUID) -> dict | None:
        """Get a single brewery by ID with its ordered phones."""
        response = (
            self.supabase.table("breweries").select("*").eq("id", str(brewery_id)).execute()
        )
        record = response.data[0] if response.data else None
        return self._merge_phones(record, brewery_id)

    def update(self, brewery_id: UUID, payload: BreweryUpdate) -> dict | None:
        """Update an existing brewery and replace its phones."""
        data = self._exclude_phones(payload)
        if data:
            response = (
                self.supabase.table("breweries").update(data).eq("id", str(brewery_id)).execute()
            )
            record = response.data[0] if response.data else None
        else:
            record = self.get_by_id(brewery_id)

        if record is not None:
            self.phone_service.replace_phones(
                self._ENTITY_TYPE, brewery_id, payload.phones
            )
            record = self._merge_phones(record, brewery_id)
        return record

    def delete(self, brewery_id: UUID) -> bool:
        """Delete a brewery by ID.

        Phone cleanup is handled by the database AFTER DELETE trigger; the
        service does not call the phone service here.
        """
        response = (
            self.supabase.table("breweries").delete().eq("id", str(brewery_id)).execute()
        )
        return bool(response.data)

    _BREWERY_CHAT_PROJECTION = (
        "id,nombre_cerveceria,razon_social,nit,nombre_cervecero,nombre_contacto,"
        "correo,direccion,ciudad,pais,tipo_operacion,"
        "maltas_utilizadas,lupulos_utilizados,levaduras_utilizadas,"
        "utiliza_otros_productos,estilos_cerveza,marca_equipo,capacidad_brewhouse,"
        "capacidad_fermentacion,litros_mes,calidad_equipo,formatos_venta,"
        "donde_vende,observaciones,oportunidades,created_at,updated_at"
    )

    def _apply_phone_filter(self, query, phone: str | None):
        """Filter query by shared phone rows using a two-step lookup."""
        if phone is None:
            return query
        entity_ids = self.phone_service.find_entity_ids_by_phone(
            self._ENTITY_TYPE, phone
        )
        return query.in_("id", [str(entity_id) for entity_id in entity_ids])

    def search(
        self,
        city: str | None = None,
        country: str | None = None,
        operation_type: str | None = None,
        brewery_name: str | None = None,
        brewer_name: str | None = None,
        contact_name: str | None = None,
        address: str | None = None,
        phone: str | None = None,
        email: str | None = None,
        hop: str | None = None,
        malt: str | None = None,
        legal_name: str | None = None,
        tax_id: str | None = None,
        yeast: str | None = None,
        uses_other_products: bool | None = None,
        beer_styles: str | None = None,
        equipment_brand: str | None = None,
        brewhouse_capacity: str | None = None,
        fermentation_capacity: str | None = None,
        liters_per_month: int | None = None,
        equipment_quality: str | None = None,
        sales_formats: str | None = None,
        sells_where: str | None = None,
        observations: str | None = None,
        opportunities: str | None = None,
    ) -> list[dict]:
        """Search breweries with optional filters."""
        query = self.supabase.table("breweries").select(self._BREWERY_CHAT_PROJECTION)

        query = build_accent_tolerant_query(query, "ciudad", city, method="eq")
        query = build_accent_tolerant_query(query, "pais", country, method="eq")
        if operation_type is not None:
            query = query.eq("tipo_operacion", operation_type)

        query = build_accent_tolerant_query(
            query, "nombre_cerveceria", brewery_name, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "nombre_cervecero", brewer_name, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "nombre_contacto", contact_name, method="ilike"
        )
        query = build_accent_tolerant_query(query, "direccion", address, method="ilike")
        query = build_accent_tolerant_query(query, "correo", email, method="ilike")

        query = self._apply_phone_filter(query, phone)

        if hop is not None:
            query = query.cs("lupulos_utilizados", [hop])
        if malt is not None:
            query = query.cs("maltas_utilizadas", [malt])

        query = build_accent_tolerant_query(query, "razon_social", legal_name, method="ilike")
        query = build_accent_tolerant_query(query, "nit", tax_id, method="ilike")

        if yeast is not None:
            query = query.cs("levaduras_utilizadas", [yeast])
        if beer_styles is not None:
            query = query.cs("estilos_cerveza", [beer_styles])

        if uses_other_products is not None:
            query = query.eq("utiliza_otros_productos", uses_other_products)

        query = build_accent_tolerant_query(
            query, "marca_equipo", equipment_brand, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "capacidad_brewhouse", brewhouse_capacity, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "capacidad_fermentacion", fermentation_capacity, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "calidad_equipo", equipment_quality, method="ilike"
        )

        if liters_per_month is not None:
            query = query.eq("litros_mes", liters_per_month)

        if sales_formats is not None:
            query = query.cs("formatos_venta", [sales_formats])
        query = build_accent_tolerant_query(
            query, "donde_vende", sells_where, method="ilike"
        )

        query = build_accent_tolerant_query(
            query, "observaciones", observations, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "oportunidades", opportunities, method="ilike"
        )

        response = query.execute()
        return self._merge_batch_phones(response.data or [])

    def inspect(
        self,
        city: str | None = None,
        country: str | None = None,
        operation_type: str | None = None,
        brewery_name: str | None = None,
        brewer_name: str | None = None,
        contact_name: str | None = None,
        address: str | None = None,
        phone: str | None = None,
        email: str | None = None,
        hop: str | None = None,
        malt: str | None = None,
        legal_name: str | None = None,
        tax_id: str | None = None,
        yeast: str | None = None,
        uses_other_products: bool | None = None,
        beer_styles: str | None = None,
        equipment_brand: str | None = None,
        brewhouse_capacity: str | None = None,
        fermentation_capacity: str | None = None,
        liters_per_month: int | None = None,
        equipment_quality: str | None = None,
        sales_formats: str | None = None,
        sells_where: str | None = None,
        observations: str | None = None,
        opportunities: str | None = None,
        limit: int = 20,
        offset: int | None = None,
        order_by: str | None = None,
        desc: bool = False,
    ) -> list[dict]:
        """Inspect brewery records with optional light filters and bounded results."""
        query = self.supabase.table("breweries").select(self._BREWERY_CHAT_PROJECTION)

        query = build_accent_tolerant_query(query, "ciudad", city, method="eq")
        query = build_accent_tolerant_query(query, "pais", country, method="eq")
        if operation_type is not None:
            query = query.eq("tipo_operacion", operation_type)

        query = build_accent_tolerant_query(
            query, "nombre_cerveceria", brewery_name, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "nombre_cervecero", brewer_name, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "nombre_contacto", contact_name, method="ilike"
        )
        query = build_accent_tolerant_query(query, "direccion", address, method="ilike")
        query = build_accent_tolerant_query(query, "correo", email, method="ilike")

        query = self._apply_phone_filter(query, phone)

        if hop is not None:
            query = query.cs("lupulos_utilizados", [hop])
        if malt is not None:
            query = query.cs("maltas_utilizadas", [malt])

        query = build_accent_tolerant_query(query, "razon_social", legal_name, method="ilike")
        query = build_accent_tolerant_query(query, "nit", tax_id, method="ilike")

        if yeast is not None:
            query = query.cs("levaduras_utilizadas", [yeast])
        if beer_styles is not None:
            query = query.cs("estilos_cerveza", [beer_styles])

        if uses_other_products is not None:
            query = query.eq("utiliza_otros_productos", uses_other_products)

        query = build_accent_tolerant_query(
            query, "marca_equipo", equipment_brand, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "capacidad_brewhouse", brewhouse_capacity, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "capacidad_fermentacion", fermentation_capacity, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "calidad_equipo", equipment_quality, method="ilike"
        )

        if liters_per_month is not None:
            query = query.eq("litros_mes", liters_per_month)

        if sales_formats is not None:
            query = query.cs("formatos_venta", [sales_formats])
        query = build_accent_tolerant_query(
            query, "donde_vende", sells_where, method="ilike"
        )

        query = build_accent_tolerant_query(
            query, "observaciones", observations, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "oportunidades", opportunities, method="ilike"
        )

        if order_by is not None:
            query = query.order(order_by, desc=desc)

        query = query.limit(min(limit, 50))

        if offset is not None:
            query = query.offset(offset)

        response = query.execute()
        return self._merge_batch_phones(response.data or [])

    def count(self) -> int:
        """Count total breweries in the database."""
        response = self.supabase.table("breweries").select("*", count="exact").execute()
        return getattr(response, "count", 0) or 0
