from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AuthApiError

from app.core.config import get_settings
from app.core.security import User, get_current_user
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix='/auth', tags=['auth'])


def get_supabase_client():
    """Get a configured Supabase client using the service role key."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado",
        )
    return SupabaseService().get_client()


@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    """Authenticate a user with email and password via Supabase Auth."""
    supabase = get_supabase_client()

    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        ) from exc

    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo iniciar sesión",
        )

    return TokenResponse(
        access_token=response.session.access_token,
        token_type="bearer",
    )


@router.get('/me', response_model=dict)
def me(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    """Return the currently authenticated user's profile."""
    return {
        'id': str(current_user.id),
        'email': current_user.email,
        'role': current_user.role,
    }


@router.post('/logout', response_model=dict)
def logout() -> dict[str, str]:
    """Sign out the current user from Supabase Auth."""
    supabase = get_supabase_client()

    try:
        supabase.auth.sign_out()
    except AuthApiError:
        # Ignore sign-out errors; local state is what matters
        pass

    return {"message": "Sesión cerrada correctamente"}
