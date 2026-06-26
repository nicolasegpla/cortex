"""Brewery CRUD endpoints with auth and role-based access control."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.security import User, get_current_user, require_role
from app.schemas.breweries import BreweryCreate, BreweryResponse, BreweryUpdate
from app.services.brewery_service import BreweryService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix='/breweries', tags=['breweries'])


def get_brewery_service() -> BreweryService:
    """Dependency to inject a BreweryService with a Supabase client."""
    supabase = SupabaseService()
    client = supabase.get_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado",
        )
    return BreweryService(client)


@router.post('', response_model=BreweryResponse, status_code=status.HTTP_201_CREATED)
@router.post('/', response_model=BreweryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_brewery(
    payload: BreweryCreate,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user),
    service: BreweryService = Depends(get_brewery_service),
) -> dict:
    """Create a new brewery.

    Accessible by both super_admin and operativo roles.
    A best-effort embedding refresh is scheduled in the background when
    embeddings are enabled.
    """
    brewery = service.create(payload)
    if get_settings().embeddings_enabled and brewery.get("id"):
        background_tasks.add_task(service.refresh_embedding, brewery["id"])
    return brewery


@router.get('', response_model=list[BreweryResponse])
@router.get('/', response_model=list[BreweryResponse], include_in_schema=False)
def list_breweries(
    _: User = Depends(get_current_user),
    service: BreweryService = Depends(get_brewery_service),
) -> list[dict]:
    """List all breweries.

    Accessible by both super_admin and operativo roles.
    """
    return service.list_all()


@router.get('/{brewery_id}', response_model=BreweryResponse)
def get_brewery(
    brewery_id: UUID,
    _: User = Depends(get_current_user),
    service: BreweryService = Depends(get_brewery_service),
) -> dict:
    """Get a single brewery by ID.

    Accessible by both super_admin and operativo roles.
    """
    brewery = service.get_by_id(brewery_id)
    if not brewery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la cervecería",
        )
    return brewery


@router.put('/{brewery_id}', response_model=BreweryResponse)
def update_brewery(
    brewery_id: UUID,
    payload: BreweryUpdate,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user),
    service: BreweryService = Depends(get_brewery_service),
) -> dict:
    """Update an existing brewery.

    Accessible by both super_admin and operativo roles.
    A best-effort embedding refresh is scheduled in the background when
    embeddings are enabled.
    """
    brewery = service.update(brewery_id, payload)
    if not brewery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la cervecería",
        )
    if get_settings().embeddings_enabled:
        background_tasks.add_task(service.refresh_embedding, str(brewery_id))
    return brewery


@router.delete('/{brewery_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_brewery(
    brewery_id: UUID,
    _: User = Depends(require_role(["super_admin"])),
    service: BreweryService = Depends(get_brewery_service),
) -> None:
    """Delete a brewery by ID.

    Only accessible by super_admin role.
    """
    success = service.delete(brewery_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la cervecería",
        )


@router.post('/{brewery_id}/reprocess-embedding', status_code=status.HTTP_202_ACCEPTED)
def reprocess_embedding(
    brewery_id: UUID,
    background_tasks: BackgroundTasks,
    _: User = Depends(require_role(["super_admin"])),
    service: BreweryService = Depends(get_brewery_service),
) -> None:
    """Force a brewery embedding refresh.

    Only accessible by super_admin role. Bypasses hash/model dedup and
    schedules a fresh embedding generation in the background.
    """
    brewery = service.get_by_id(brewery_id)
    if not brewery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la cervecería",
        )
    background_tasks.add_task(service.refresh_embedding, brewery_id, force=True)
