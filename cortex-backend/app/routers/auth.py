from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AuthApiError

from app.core.config import get_settings
from app.core.security import User, get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix='/auth', tags=['auth'])


def get_supabase_client():
    """Get a configured Supabase client using the service role key."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured",
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
            detail="Invalid email or password",
        ) from exc

    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

    return TokenResponse(
        access_token=response.session.access_token,
        token_type="bearer",
    )


@router.post('/register', response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> RegisterResponse:
    """Register a new user with Supabase Auth and assign the operativo role."""
    supabase = get_supabase_client()

    try:
        response = supabase.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "user_metadata": {"role": "operativo"},
        })
    except AuthApiError as exc:
        if "already registered" in str(exc).lower() or "already exists" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already registered",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    user = response.user
    requires_confirmation = not getattr(user, "email_confirmed_at", None)

    return RegisterResponse(
        user_id=str(user.id),
        email=user.email,
        role=user.user_metadata.get("role", "operativo"),
        requires_confirmation=requires_confirmation,
        message=(
            "Registration successful. Please check your email to confirm your account."
            if requires_confirmation
            else "Registration successful."
        ),
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

    return {"message": "Logged out successfully"}
