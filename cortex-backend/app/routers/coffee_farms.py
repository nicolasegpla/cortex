"""Coffee farm CRUD endpoints with auth and role-based access control."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import User, get_current_user, require_role
from app.schemas.coffee_farms import CoffeeFarmCreate, CoffeeFarmResponse, CoffeeFarmUpdate
from app.services.coffee_farm_service import CoffeeFarmService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix='/coffee-farms', tags=['coffee-farms'])


def get_coffee_farm_service() -> CoffeeFarmService:
    """Dependency to inject a CoffeeFarmService with a Supabase client."""
    supabase = SupabaseService()
    client = supabase.get_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado",
        )
    return CoffeeFarmService(client)


@router.post('', response_model=CoffeeFarmResponse, status_code=status.HTTP_201_CREATED)
def create_coffee_farm(
    payload: CoffeeFarmCreate,
    _: User = Depends(get_current_user),
    service: CoffeeFarmService = Depends(get_coffee_farm_service),
) -> dict:
    """Create a new coffee farm."""
    return service.create(payload)


@router.get('', response_model=list[CoffeeFarmResponse])
def list_coffee_farms(
    _: User = Depends(get_current_user),
    service: CoffeeFarmService = Depends(get_coffee_farm_service),
) -> list[dict]:
    """List all coffee farms."""
    return service.list_all()


@router.get('/{coffee_farm_id}', response_model=CoffeeFarmResponse)
def get_coffee_farm(
    coffee_farm_id: UUID,
    _: User = Depends(get_current_user),
    service: CoffeeFarmService = Depends(get_coffee_farm_service),
) -> dict:
    """Get a single coffee farm by ID."""
    coffee_farm = service.get_by_id(coffee_farm_id)
    if not coffee_farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la finca cafetera",
        )
    return coffee_farm


@router.put('/{coffee_farm_id}', response_model=CoffeeFarmResponse)
def update_coffee_farm(
    coffee_farm_id: UUID,
    payload: CoffeeFarmUpdate,
    _: User = Depends(get_current_user),
    service: CoffeeFarmService = Depends(get_coffee_farm_service),
) -> dict:
    """Update an existing coffee farm."""
    coffee_farm = service.update(coffee_farm_id, payload)
    if not coffee_farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la finca cafetera",
        )
    return coffee_farm


@router.delete('/{coffee_farm_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_coffee_farm(
    coffee_farm_id: UUID,
    _: User = Depends(require_role(["super_admin"])),
    service: CoffeeFarmService = Depends(get_coffee_farm_service),
) -> None:
    """Delete a coffee farm by ID."""
    success = service.delete(coffee_farm_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la finca cafetera",
        )
