"""Animal feed producer CRUD endpoints with auth and role-based access control."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import User, get_current_user, require_role
from app.schemas.animal_feed_producers import (
    AnimalFeedProducerCreate,
    AnimalFeedProducerResponse,
    AnimalFeedProducerUpdate,
)
from app.services.animal_feed_producer_service import AnimalFeedProducerService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix='/animal-feed-producers', tags=['animal-feed-producers'])


def get_animal_feed_producer_service() -> AnimalFeedProducerService:
    """Dependency to inject an AnimalFeedProducerService with a Supabase client."""
    supabase = SupabaseService()
    client = supabase.get_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado",
        )
    return AnimalFeedProducerService(client)


@router.post('', response_model=AnimalFeedProducerResponse, status_code=status.HTTP_201_CREATED)
def create_animal_feed_producer(
    payload: AnimalFeedProducerCreate,
    _: User = Depends(get_current_user),
    service: AnimalFeedProducerService = Depends(get_animal_feed_producer_service),
) -> dict:
    """Create a new animal feed producer."""
    return service.create(payload)


@router.get('', response_model=list[AnimalFeedProducerResponse])
def list_animal_feed_producers(
    _: User = Depends(get_current_user),
    service: AnimalFeedProducerService = Depends(get_animal_feed_producer_service),
) -> list[dict]:
    """List all animal feed producers."""
    return service.list_all()


@router.get('/{producer_id}', response_model=AnimalFeedProducerResponse)
def get_animal_feed_producer(
    producer_id: UUID,
    _: User = Depends(get_current_user),
    service: AnimalFeedProducerService = Depends(get_animal_feed_producer_service),
) -> dict:
    """Get a single animal feed producer by ID."""
    producer = service.get_by_id(producer_id)
    if not producer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el productor de alimentos para animales",
        )
    return producer


@router.put('/{producer_id}', response_model=AnimalFeedProducerResponse)
def update_animal_feed_producer(
    producer_id: UUID,
    payload: AnimalFeedProducerUpdate,
    _: User = Depends(get_current_user),
    service: AnimalFeedProducerService = Depends(get_animal_feed_producer_service),
) -> dict:
    """Update an existing animal feed producer."""
    producer = service.update(producer_id, payload)
    if not producer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el productor de alimentos para animales",
        )
    return producer


@router.delete('/{producer_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_animal_feed_producer(
    producer_id: UUID,
    _: User = Depends(require_role(["super_admin"])),
    service: AnimalFeedProducerService = Depends(get_animal_feed_producer_service),
) -> None:
    """Delete an animal feed producer by ID."""
    success = service.delete(producer_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el productor de alimentos para animales",
        )
