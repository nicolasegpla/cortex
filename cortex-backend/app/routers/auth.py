from fastapi import APIRouter, Depends, status

from app.core.security import User, get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=TokenResponse, status_code=status.HTTP_501_NOT_IMPLEMENTED)
def login(_: LoginRequest) -> TokenResponse:
    # TODO: implement Supabase-backed login flow for the first client.
    return TokenResponse(access_token='', token_type='bearer')


@router.post('/register', response_model=TokenResponse, status_code=status.HTTP_501_NOT_IMPLEMENTED)
def register(_: RegisterRequest) -> TokenResponse:
    # TODO: implement Supabase-backed registration flow.
    return TokenResponse(access_token='', token_type='bearer')


@router.get('/me', response_model=dict)
def me(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    """Return the currently authenticated user's profile."""
    return {
        'id': str(current_user.id),
        'email': current_user.email,
        'role': current_user.role,
    }
