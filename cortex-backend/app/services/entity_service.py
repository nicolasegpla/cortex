from app.schemas.entities import EntityCreate, EntityResponse, EntityUpdate
from app.services.supabase_service import SupabaseService


class EntityService:
    def __init__(self, supabase_service: SupabaseService | None = None) -> None:
        self.supabase_service = supabase_service or SupabaseService()

    def list_entities(self) -> list[EntityResponse]:
        return []

    def create_entity(self, payload: EntityCreate) -> EntityResponse:
        return EntityResponse(id='pending', name=payload.name, description=payload.description)

    def update_entity(self, entity_id: str, payload: EntityUpdate) -> EntityResponse:
        return EntityResponse(
            id=entity_id,
            name=payload.name or 'pending',
            description=payload.description,
        )
