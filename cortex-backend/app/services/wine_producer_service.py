"""Business logic service for wine producer operations."""

from uuid import UUID

from fastapi.encoders import jsonable_encoder

from app.schemas.wine_producers import WineProducerCreate, WineProducerUpdate


class WineProducerService:
    """Service layer for wine producer CRUD operations using Supabase."""

    def __init__(self, supabase_client) -> None:
        self.supabase = supabase_client

    def create(self, payload: WineProducerCreate) -> dict:
        """Create a new wine producer in Supabase."""
        data = jsonable_encoder(payload.model_dump(exclude_unset=True))
        response = self.supabase.table("wine_producers").insert(data).execute()
        return response.data[0] if response.data else {}

    def list_all(self) -> list[dict]:
        """List all wine producers from Supabase."""
        response = self.supabase.table("wine_producers").select("*").execute()
        return response.data or []

    def get_by_id(self, producer_id: UUID) -> dict | None:
        """Get a single wine producer by ID."""
        response = (
            self.supabase.table("wine_producers")
            .select("*")
            .eq("id", str(producer_id))
            .execute()
        )
        return response.data[0] if response.data else None

    def update(self, producer_id: UUID, payload: WineProducerUpdate) -> dict | None:
        """Update an existing wine producer."""
        data = jsonable_encoder(payload.model_dump(exclude_unset=True, exclude_none=True))
        if not data:
            return self.get_by_id(producer_id)

        response = (
            self.supabase.table("wine_producers")
            .update(data)
            .eq("id", str(producer_id))
            .execute()
        )
        return response.data[0] if response.data else None

    def delete(self, producer_id: UUID) -> bool:
        """Delete a wine producer by ID."""
        response = (
            self.supabase.table("wine_producers")
            .delete()
            .eq("id", str(producer_id))
            .execute()
        )
        return bool(response.data)
