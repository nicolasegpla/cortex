"""Security utilities for JWT verification and role-based access control."""

from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from app.core.config import get_settings

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


class User(BaseModel):
    """Authenticated user model extracted from JWT."""

    id: UUID
    email: str
    role: str = "operativo"


def verify_token(token: str | None) -> dict:
    """Verify a Supabase JWT token and return its payload.

    Args:
        token: The JWT token to verify.

    Returns:
        dict: The decoded token payload.

    Raises:
        HTTPException: If the token is invalid or missing.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    # Use dedicated JWT secret if available, fall back to service key
    secret = settings.supabase_jwt_secret or settings.supabase_service_key or ""

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT secret not configured",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


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
            detail="Invalid authentication credentials: missing user ID",
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
                detail="Insufficient permissions",
            )
        return current_user

    return role_checker
