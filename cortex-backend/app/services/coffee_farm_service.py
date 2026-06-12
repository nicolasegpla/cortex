"""Business logic service for coffee farm operations."""

from uuid import UUID

from fastapi.encoders import jsonable_encoder

from app.schemas.coffee_farms import CoffeeFarmCreate, CoffeeFarmUpdate


class CoffeeFarmService:
    """Service layer for coffee farm CRUD operations using Supabase."""

    def __init__(self, supabase_client) -> None:
        self.supabase = supabase_client

    def create(self, payload: CoffeeFarmCreate) -> dict:
        """Create a new coffee farm in Supabase."""
        data = jsonable_encoder(payload.model_dump(exclude_unset=True))
        response = self.supabase.table("coffee_farms").insert(data).execute()
        return response.data[0] if response.data else {}

    def list_all(self) -> list[dict]:
        """List all coffee farms from Supabase."""
        response = self.supabase.table("coffee_farms").select("*").execute()
        return response.data or []

    def get_by_id(self, coffee_farm_id: UUID) -> dict | None:
        """Get a single coffee farm by ID."""
        response = (
            self.supabase.table("coffee_farms").select("*").eq("id", str(coffee_farm_id)).execute()
        )
        return response.data[0] if response.data else None

    def update(self, coffee_farm_id: UUID, payload: CoffeeFarmUpdate) -> dict | None:
        """Update an existing coffee farm."""
        data = jsonable_encoder(payload.model_dump(exclude_unset=True, exclude_none=True))
        if not data:
            return self.get_by_id(coffee_farm_id)

        response = (
            self.supabase.table("coffee_farms").update(data).eq("id", str(coffee_farm_id)).execute()
        )
        return response.data[0] if response.data else None

    def delete(self, coffee_farm_id: UUID) -> bool:
        """Delete a coffee farm by ID."""
        response = (
            self.supabase.table("coffee_farms").delete().eq("id", str(coffee_farm_id)).execute()
        )
        return bool(response.data)
