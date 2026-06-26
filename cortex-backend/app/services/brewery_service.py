"""Business logic service for brewery operations."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from app.core.config import Settings, get_settings
from app.schemas.breweries import BreweryCreate, BreweryUpdate
from app.services.embedding_service import EmbeddingService
from app.utils.text_matching import build_accent_tolerant_query


logger = logging.getLogger(__name__)


class BreweryService:
    """Service layer for brewery CRUD operations using Supabase."""

    def __init__(
        self,
        supabase_client,
        embedding_service: EmbeddingService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.supabase = supabase_client
        self.embedding_service = embedding_service
        self.settings = settings

    def create(self, payload: BreweryCreate) -> dict:
        """Create a new brewery in Supabase.

        Args:
            payload: The brewery data to create.

        Returns:
            dict: The created brewery record.
        """
        data = payload.model_dump(exclude_unset=True)
        response = self.supabase.table("breweries").insert(data).execute()
        return response.data[0] if response.data else {}

    def list_all(self) -> list[dict]:
        """List all breweries from Supabase.

        Returns:
            list[dict]: List of brewery records.
        """
        response = self.supabase.table("breweries").select("*").execute()
        return response.data or []

    def get_by_id(self, brewery_id: UUID) -> dict | None:
        """Get a single brewery by ID.

        Args:
            brewery_id: The UUID of the brewery.

        Returns:
            dict | None: The brewery record or None if not found.
        """
        response = (
            self.supabase.table("breweries").select("*").eq("id", str(brewery_id)).execute()
        )
        return response.data[0] if response.data else None

    def update(
        self,
        brewery_id: UUID,
        payload: BreweryUpdate,
        mark_embedding_pending: bool = False,
    ) -> dict | None:
        """Update an existing brewery.

        Args:
            brewery_id: The UUID of the brewery to update.
            payload: The update data (only provided fields are updated).
            mark_embedding_pending: If True, set ``embedding_status`` to
                ``pending`` in the same write. Used when embeddings are enabled
                so the row does not stay misleadingly ``ready`` if the
                background refresh task is dropped.

        Returns:
            dict | None: The updated brewery record or None if not found.
        """
        data = payload.model_dump(exclude_unset=True, exclude_none=True)
        if not data:
            return self.get_by_id(brewery_id)

        if mark_embedding_pending:
            data["embedding_status"] = "pending"

        response = (
            self.supabase.table("breweries").update(data).eq("id", str(brewery_id)).execute()
        )
        return response.data[0] if response.data else None

    def delete(self, brewery_id: UUID) -> bool:
        """Delete a brewery by ID.

        Args:
            brewery_id: The UUID of the brewery to delete.

        Returns:
            bool: True if deleted, False if not found.
        """
        response = (
            self.supabase.table("breweries").delete().eq("id", str(brewery_id)).execute()
        )
        return bool(response.data)

    async def refresh_embedding(
        self, brewery_id: UUID | str, force: bool = False
    ) -> dict | None:
        """Refresh the embedding for a single brewery.

        Skips the OpenAI call when the brewery is already ready, the source
        hash matches, and the model matches the current configuration.
        On failure the previous vector is preserved and the status becomes
        ``error``; the error detail is logged but not persisted.

        Args:
            brewery_id: The UUID (or string UUID) of the brewery to refresh.
            force: If True, bypass the hash/model dedup short-circuit.

        Returns:
            dict | None: The updated brewery row, the unchanged row when the
            refresh is skipped, or None if the brewery does not exist.
        """
        settings = self.settings or get_settings()
        embedding_service = self.embedding_service or EmbeddingService(settings=settings)

        brewery = self.get_by_id(brewery_id)
        if not brewery:
            logger.warning("Brewery %s not found for embedding refresh", brewery_id)
            return None

        canonical_text = embedding_service.build_canonical_text(brewery)
        source_hash = embedding_service.compute_hash(canonical_text)

        current_status = brewery.get("embedding_status")
        current_hash = brewery.get("embedding_source_hash")
        current_model = brewery.get("embedding_model")

        if (
            not force
            and current_status == "ready"
            and current_hash == source_hash
            and current_model == settings.embedding_model
        ):
            return brewery

        try:
            vector = await embedding_service.generate_embedding(canonical_text)
        except Exception as exc:
            logger.error(
                "Embedding generation failed for brewery %s: %s",
                brewery_id,
                exc,
                exc_info=True,
                extra={"brewery_id": str(brewery_id), "error": str(exc)},
            )
            update_data = {"embedding_status": "error"}
            response = (
                self.supabase.table("breweries")
                .update(update_data)
                .eq("id", str(brewery_id))
                .execute()
            )
            return response.data[0] if response.data else None

        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            "embedding": vector,
            "embedding_status": "ready",
            "embedding_model": settings.embedding_model,
            "embedding_source_hash": source_hash,
            "embedding_updated_at": now,
        }
        response = (
            self.supabase.table("breweries")
            .update(update_data)
            .eq("id", str(brewery_id))
            .execute()
        )
        return response.data[0] if response.data else None

    _BREWERY_CHAT_PROJECTION = (
        "id,nombre_cerveceria,razon_social,nit,nombre_cervecero,nombre_contacto,"
        "celular_1,celular_2,correo,direccion,ciudad,pais,tipo_operacion,"
        "maltas_utilizadas,lupulos_utilizados,levaduras_utilizadas,"
        "utiliza_otros_productos,estilos_cerveza,marca_equipo,capacidad_brewhouse,"
        "capacidad_fermentacion,litros_mes,calidad_equipo,formatos_venta,"
        "donde_vende,observaciones,oportunidades,created_at,updated_at"
    )

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
        """Search breweries with optional filters.

        Supports natural-language questions over ALL safe brewery business fields.
        Text filters use case-insensitive partial matching (ilike).
        Array filters (hop/malt/yeast/beer_styles/sales_formats) use Postgres contains (cs).
        Bool filters use exact matching (eq).
        Numeric filters use exact matching (eq).

        Args:
            city: Filter by city (ciudad).
            country: Filter by country (pais).
            operation_type: Filter by operation type (tipo_operacion).
            brewery_name: Partial match on brewery name (nombre_cerveceria).
            brewer_name: Partial match on brewer name (nombre_cervecero).
            contact_name: Partial match on contact name (nombre_contacto).
            address: Partial match on address (direccion).
            phone: Partial match on primary or secondary phone (celular_1/2).
            email: Partial match on email (correo).
            hop: Brewery uses this hop (lupulos_utilizados).
            malt: Brewery uses this malt (maltas_utilizadas).
            legal_name: Partial match on legal business name (razon_social).
            tax_id: Partial match on tax ID (nit).
            yeast: Brewery uses this yeast (levaduras_utilizadas).
            uses_other_products: Whether brewery uses other products (utiliza_otros_productos).
            beer_styles: Brewery produces this beer style (estilos_cerveza).
            equipment_brand: Partial match on equipment brand (marca_equipo).
            brewhouse_capacity: Partial match on brewhouse capacity (capacidad_brewhouse).
            fermentation_capacity: Partial match on fermentation capacity (capacidad_fermentacion).
            liters_per_month: Exact match on monthly production liters (litros_mes).
            equipment_quality: Partial match on equipment quality (calidad_equipo).
            sales_formats: Brewery uses this sales format (formatos_venta).
            sells_where: Partial match on where they sell (donde_vende).
            observations: Partial match on observations (observaciones).
            opportunities: Partial match on opportunities (oportunidades).

        Returns:
            list[dict]: Matching brewery records with safe fields projected.
        """
        query = self.supabase.table("breweries").select(self._BREWERY_CHAT_PROJECTION)

        # Accent-tolerant exact filters for categorical/location fields
        query = build_accent_tolerant_query(query, "ciudad", city, method="eq")
        query = build_accent_tolerant_query(query, "pais", country, method="eq")
        if operation_type is not None:
            query = query.eq("tipo_operacion", operation_type)

        # Accent-tolerant partial text filters for names, address, email
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

        # Phone search across celular_1 and celular_2
        if phone is not None:
            query = query.or_(
                f"celular_1.ilike.%{phone}%,celular_2.ilike.%{phone}%"
            )

        # Array contains filters for hops and malts (exact — arrays are tricky for accents)
        if hop is not None:
            query = query.cs("lupulos_utilizados", [hop])
        if malt is not None:
            query = query.cs("maltas_utilizadas", [malt])

        # Accent-tolerant expanded text filters
        query = build_accent_tolerant_query(query, "razon_social", legal_name, method="ilike")
        query = build_accent_tolerant_query(query, "nit", tax_id, method="ilike")

        # Array contains filters for yeast and beer styles
        if yeast is not None:
            query = query.cs("levaduras_utilizadas", [yeast])
        if beer_styles is not None:
            query = query.cs("estilos_cerveza", [beer_styles])

        # Bool exact filter
        if uses_other_products is not None:
            query = query.eq("utiliza_otros_productos", uses_other_products)

        # Accent-tolerant equipment and capacity text filters
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

        # Numeric exact filter
        if liters_per_month is not None:
            query = query.eq("litros_mes", liters_per_month)

        # Sales and distribution filters
        if sales_formats is not None:
            query = query.cs("formatos_venta", [sales_formats])
        query = build_accent_tolerant_query(
            query, "donde_vende", sells_where, method="ilike"
        )

        # Accent-tolerant notes and opportunities text filters
        query = build_accent_tolerant_query(
            query, "observaciones", observations, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "oportunidades", opportunities, method="ilike"
        )

        response = query.execute()
        return response.data or []

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
        """Inspect brewery records with optional light filters and bounded results.

        This is the primary tool for general analytical questions about brewery data.
        Use it when the user asks to browse, list, inspect, or analyze brewery fields
        such as beer styles, equipment, opportunities, observations, etc.

        Results are bounded for safety and performance.

        Args:
            city: Filter by city (ciudad).
            country: Filter by country (pais).
            operation_type: Filter by operation type (tipo_operacion).
            brewery_name: Partial match on brewery name (nombre_cerveceria).
            brewer_name: Partial match on brewer name (nombre_cervecero).
            contact_name: Partial match on contact name (nombre_contacto).
            address: Partial match on address (direccion).
            phone: Partial match on primary or secondary phone (celular_1/2).
            email: Partial match on email (correo).
            hop: Brewery uses this hop (lupulos_utilizados).
            malt: Brewery uses this malt (maltas_utilizadas).
            legal_name: Partial match on legal business name (razon_social).
            tax_id: Partial match on tax ID (nit).
            yeast: Brewery uses this yeast (levaduras_utilizadas).
            uses_other_products: Whether brewery uses other products (utiliza_otros_productos).
            beer_styles: Brewery produces this beer style (estilos_cerveza).
            equipment_brand: Partial match on equipment brand (marca_equipo).
            brewhouse_capacity: Partial match on brewhouse capacity (capacidad_brewhouse).
            fermentation_capacity: Partial match on fermentation capacity (capacidad_fermentacion).
            liters_per_month: Exact match on monthly production liters (litros_mes).
            equipment_quality: Partial match on equipment quality (calidad_equipo).
            sales_formats: Brewery uses this sales format (formatos_venta).
            sells_where: Partial match on where they sell (donde_vende).
            observations: Partial match on observations (observaciones).
            opportunities: Partial match on opportunities (oportunidades).
            limit: Max records to return (default 20, capped at 50).
            offset: Pagination offset.
            order_by: Column to order by (e.g., 'nombre_cerveceria', 'created_at').
            desc: Sort descending if True.

        Returns:
            list[dict]: Brewery records with safe fields, bounded by limit.
        """
        query = self.supabase.table("breweries").select(self._BREWERY_CHAT_PROJECTION)

        # Accent-tolerant exact filters for categorical/location fields
        query = build_accent_tolerant_query(query, "ciudad", city, method="eq")
        query = build_accent_tolerant_query(query, "pais", country, method="eq")
        if operation_type is not None:
            query = query.eq("tipo_operacion", operation_type)

        # Accent-tolerant partial text filters for names, address, email
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

        # Phone search across celular_1 and celular_2
        if phone is not None:
            query = query.or_(
                f"celular_1.ilike.%{phone}%,celular_2.ilike.%{phone}%"
            )

        # Array contains filters for hops and malts (exact — arrays are tricky for accents)
        if hop is not None:
            query = query.cs("lupulos_utilizados", [hop])
        if malt is not None:
            query = query.cs("maltas_utilizadas", [malt])

        # Accent-tolerant expanded text filters
        query = build_accent_tolerant_query(query, "razon_social", legal_name, method="ilike")
        query = build_accent_tolerant_query(query, "nit", tax_id, method="ilike")

        # Array contains filters for yeast and beer styles
        if yeast is not None:
            query = query.cs("levaduras_utilizadas", [yeast])
        if beer_styles is not None:
            query = query.cs("estilos_cerveza", [beer_styles])

        # Bool exact filter
        if uses_other_products is not None:
            query = query.eq("utiliza_otros_productos", uses_other_products)

        # Accent-tolerant equipment and capacity text filters
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

        # Numeric exact filter
        if liters_per_month is not None:
            query = query.eq("litros_mes", liters_per_month)

        # Sales and distribution filters
        if sales_formats is not None:
            query = query.cs("formatos_venta", [sales_formats])
        query = build_accent_tolerant_query(
            query, "donde_vende", sells_where, method="ilike"
        )

        # Accent-tolerant notes and opportunities text filters
        query = build_accent_tolerant_query(
            query, "observaciones", observations, method="ilike"
        )
        query = build_accent_tolerant_query(
            query, "oportunidades", opportunities, method="ilike"
        )

        # Apply ordering
        if order_by is not None:
            query = query.order(order_by, desc=desc)

        # Apply bounded limit (max 50)
        query = query.limit(min(limit, 50))

        # Apply offset if provided
        if offset is not None:
            query = query.offset(offset)

        response = query.execute()
        return response.data or []

    def count(self) -> int:
        """Count total breweries in the database.

        Returns:
            int: Total number of brewery records.
        """
        response = self.supabase.table("breweries").select("*", count="exact").execute()
        return getattr(response, "count", 0) or 0
