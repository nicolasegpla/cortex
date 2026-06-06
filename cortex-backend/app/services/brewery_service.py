"""Business logic service for brewery operations."""

from uuid import UUID

from app.schemas.breweries import BreweryCreate, BreweryUpdate


class BreweryService:
    """Service layer for brewery CRUD operations using Supabase."""

    def __init__(self, supabase_client) -> None:
        self.supabase = supabase_client

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

    def update(self, brewery_id: UUID, payload: BreweryUpdate) -> dict | None:
        """Update an existing brewery.

        Args:
            brewery_id: The UUID of the brewery to update.
            payload: The update data (only provided fields are updated).

        Returns:
            dict | None: The updated brewery record or None if not found.
        """
        data = payload.model_dump(exclude_unset=True, exclude_none=True)
        if not data:
            return self.get_by_id(brewery_id)

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

    def search(
        self,
        city: str | None = None,
        country: str | None = None,
        operation_type: str | None = None,
    ) -> list[dict]:
        """Search breweries with optional filters.

        Args:
            city: Filter by city (ciudad).
            country: Filter by country (pais).
            operation_type: Filter by operation type (tipo_operacion).

        Returns:
            list[dict]: Matching brewery records.
        """
        query = self.supabase.table("breweries").select("*")
        if city is not None:
            query = query.eq("ciudad", city)
        if country is not None:
            query = query.eq("pais", country)
        if operation_type is not None:
            query = query.eq("tipo_operacion", operation_type)
        response = query.execute()
        return response.data or []

    def count(self) -> int:
        """Count total breweries in the database.

        Returns:
            int: Total number of brewery records.
        """
        response = self.supabase.table("breweries").select("*", count="exact").execute()
        return getattr(response, "count", 0) or 0
