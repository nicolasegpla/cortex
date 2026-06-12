"""Wine producer CRUD endpoints with auth and role-based access control."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import User, get_current_user, require_role
from app.schemas.wine_producers import (
    WineProducerCreate,
    WineProducerResponse,
    WineProducerUpdate,
)
from app.services.supabase_service import SupabaseService
from app.services.wine_producer_service import WineProducerService

router = APIRouter(prefix='/wine-producers', tags=['wine-producers'])


def get_wine_producer_service() -> WineProducerService:
    """Dependency to inject a WineProducerService with a Supabase client."""
    supabase = SupabaseService()
    client = supabase.get_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado",
        )
    return WineProducerService(client)


@router.post('', response_model=WineProducerResponse, status_code=status.HTTP_201_CREATED)
def create_wine_producer(
    payload: WineProducerCreate,
    _: User = Depends(get_current_user),
    service: WineProducerService = Depends(get_wine_producer_service),
) -> dict:
    """Create a new wine producer."""
    return service.create(payload)


@router.get('', response_model=list[WineProducerResponse])
def list_wine_producers(
    _: User = Depends(get_current_user),
    service: WineProducerService = Depends(get_wine_producer_service),
) -> list[dict]:
    """List all wine producers."""
    return service.list_all()


@router.get('/{producer_id}', response_model=WineProducerResponse)
def get_wine_producer(
    producer_id: UUID,
    _: User = Depends(get_current_user),
    service: WineProducerService = Depends(get_wine_producer_service),
) -> dict:
    """Get a single wine producer by ID."""
    producer = service.get_by_id(producer_id)
    if not producer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el productor de vinos",
        )
    return producer


@router.put('/{producer_id}', response_model=WineProducerResponse)
def update_wine_producer(
    producer_id: UUID,
    payload: WineProducerUpdate,
    _: User = Depends(get_current_user),
    service: WineProducerService = Depends(get_wine_producer_service),
) -> dict:
    """Update an existing wine producer."""
    producer = service.update(producer_id, payload)
    if not producer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el productor de vinos",
        )
    return producer


@router.delete('/{producer_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_wine_producer(
    producer_id: UUID,
    _: User = Depends(require_role(["super_admin"])),
    service: WineProducerService = Depends(get_wine_producer_service),
) -> None:
    """Delete a wine producer by ID."""
    success = service.delete(producer_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el productor de vinos",
        )
