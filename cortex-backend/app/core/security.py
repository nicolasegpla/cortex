"""Security utilities for JWT verification and role-based access control."""

from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from app.core.config import get_settings
from app.services.supabase_service import SupabaseService

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


class User(BaseModel):
    """Authenticated user model extracted from JWT."""

    id: UUID
    email: str
    role: str = "operativo"


def get_supabase_service() -> SupabaseService:
    """Get or create a SupabaseService instance."""
    return SupabaseService()


def verify_token(token: str | None) -> dict:
    """Verify a Supabase JWT token using the Supabase server and return its payload.

    Args:
        token: The JWT token to verify.

    Returns:
        dict: The decoded token payload with user info.

    Raises:
        HTTPException: If the token is invalid or missing.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    service = get_supabase_service()
    client = service.get_client()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase no está configurado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Validate token against Supabase Auth server
        # This works with any JWT signing algorithm (HS256, ECC, etc.)
        user_response = client.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales de autenticación inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = user_response.user
        return {
            "sub": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata or {},
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Credenciales de autenticación inválidas: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """FastAPI dependency to extract the current authenticated user from JWT.

    Args:
        token: The JWT token extracted from the Authorization header.

    Returns:
        User: The authenticated user with id, email, and role.

    Raises:
        HTTPException: If the token is invalid or missing.
    """
    payload = verify_token(token)

    user_id = payload.get("sub")
    email = payload.get("email", "")
    user_metadata = payload.get("user_metadata", {})
    role = user_metadata.get("role", "operativo") if isinstance(user_metadata, dict) else "operativo"

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación inválidas: falta el ID de usuario",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return User(id=UUID(user_id), email=email, role=role)


def require_role(allowed_roles: list[str]):
    """Create a dependency that checks if the current user has an allowed role.

    Args:
        allowed_roles: List of roles that are permitted to access the endpoint.

    Returns:
        Callable: A dependency function that validates the user's role.
    """

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos suficientes",
            )
        return current_user

    return role_checker
