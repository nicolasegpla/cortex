from fastapi import APIRouter, status

from app.schemas.entities import EntityCreate, EntityResponse, EntityUpdate

router = APIRouter(prefix='/entities', tags=['entities'])


@router.get('/', response_model=list[EntityResponse], status_code=status.HTTP_501_NOT_IMPLEMENTED)
def list_entities() -> list[EntityResponse]:
    # TODO: connect generic entity listing to the first client tables.
    return []


@router.post('/', response_model=EntityResponse, status_code=status.HTTP_501_NOT_IMPLEMENTED)
def create_entity(payload: EntityCreate) -> EntityResponse:
    # TODO: persist entities in Supabase.
    return EntityResponse(id='pending', name=payload.name, description=payload.description)


@router.put('/{entity_id}', response_model=EntityResponse, status_code=status.HTTP_501_NOT_IMPLEMENTED)
def update_entity(entity_id: str, payload: EntityUpdate) -> EntityResponse:
    # TODO: update entities in Supabase.
    return EntityResponse(id=entity_id, name=payload.name or 'pending', description=payload.description)


@router.delete('/{entity_id}', status_code=status.HTTP_501_NOT_IMPLEMENTED)
def delete_entity(entity_id: str) -> dict[str, str]:
    # TODO: delete entities in Supabase.
    return {'detail': f'Entity {entity_id} not implemented'}
