from fastapi import APIRouter

from app.schemas.health import HealthCheck

router = APIRouter(tags=['health'])


@router.get('/health', response_model=HealthCheck)
def read_health() -> HealthCheck:
    return HealthCheck(status='ok')
