import threading
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AuthApiError

from app.core.config import get_settings
from app.core.security import User, require_role
from app.dependencies import get_email_service
from app.schemas.admin_users import CreateUserRequest, UserListResponse, UserResponse
from app.services.email_service import EmailService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/admin/users", tags=["admin"])

# Serialize super_admin delete checks to prevent concurrent deletes from
# both passing the "last super_admin" guard and orphaning admin access.
_delete_user_lock = threading.Lock()


def get_supabase_client():
    """Get a configured Supabase client using the service role key."""
    service = SupabaseService()
    client = service.get_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado",
        )
    return client


def _error_message(exc: AuthApiError) -> str:
    """Return a normalized message string from a Supabase AuthApiError."""
    return getattr(exc, "message", str(exc)).lower()


def _is_duplicate_user_error(exc: AuthApiError) -> bool:
    """Check whether a Supabase Auth error indicates a duplicate user."""
    message = _error_message(exc)
    return any(
        phrase in message
        for phrase in (
            "already registered",
            "already exists",
            "duplicate",
        )
    )


def _is_not_found_error(exc: AuthApiError) -> bool:
    """Check whether a Supabase Auth error indicates a missing user."""
    message = _error_message(exc)
    return any(
        phrase in message
        for phrase in (
            "not found",
            "user not found",
            "no user",
        )
    )


def _raise_auth_api_error(exc: AuthApiError) -> None:
    """Translate a Supabase AuthApiError into a stable, non-500 HTTPException.

    All user-facing detail messages are returned in Spanish to match the
    product language used across the rest of the API.
    """
    if _is_duplicate_user_error(exc):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este email",
        ) from exc

    if _is_not_found_error(exc):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el usuario",
        ) from exc

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Error en el servicio de autenticación",
    ) from exc


def _normalize_user_list(response: Any) -> list[Any]:
    """Return a user list from the Supabase ``list_users`` response.

    The real Supabase auth admin client returns the user list directly as a
    ``list``; some test fixtures or older wrappers return an object with a
    ``users`` attribute. This helper keeps the contract explicit.
    """
    if isinstance(response, list):
        return response
    return getattr(response, "users", [])


def _get_user_role(user: Any) -> str | None:
    """Extract the ``role`` from a Supabase user's metadata, if present."""
    metadata = getattr(user, "user_metadata", None)
    if isinstance(metadata, dict):
        return metadata.get("role")
    return None


def _count_super_admins(users: list[Any]) -> int:
    """Count how many users currently have the ``super_admin`` role."""
    return sum(1 for user in users if _get_user_role(user) == "super_admin")


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: CreateUserRequest,
    _: User = Depends(require_role(["super_admin"])),
    email_service: EmailService = Depends(get_email_service),
) -> UserResponse:
    """Invite a new managed user by email and assign their role.

    Supabase generates an invite link; the backend sends it through Resend.
    The invited user follows the link, exchanges the one-time code for a
    session, and sets their password before they can log in.
    """
    supabase = get_supabase_client()
    settings = get_settings()

    try:
        response = supabase.auth.admin.generate_link(
            {
                "type": "invite",
                "email": payload.email,
                "options": {
                    "data": {"role": payload.role},
                    "redirect_to": settings.supabase_invite_redirect_url,
                },
            }
        )
    except AuthApiError as exc:
        _raise_auth_api_error(exc)

    try:
        email_service.send_invite_email(payload.email, response.properties.action_link)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo enviar el email de invitación",
        ) from exc

    user = response.user
    return UserResponse(
        id=str(user.id),
        email=user.email,
        role=user.user_metadata.get("role", "operativo"),
    )


@router.get("", response_model=UserListResponse)
def list_users(
    _: User = Depends(require_role(["super_admin"])),
) -> UserListResponse:
    """List all managed platform users."""
    supabase = get_supabase_client()

    try:
        response = supabase.auth.admin.list_users()
    except AuthApiError as exc:
        _raise_auth_api_error(exc)

    users = [
        UserResponse(
            id=str(user.id),
            email=user.email,
            role=_get_user_role(user) or "operativo",
        )
        for user in _normalize_user_list(response)
    ]

    return UserListResponse(users=users)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    current_user: User = Depends(require_role(["super_admin"])),
) -> None:
    """Delete a managed platform user.

    Prevents a super_admin from deleting their own account and prevents
    deleting the last remaining super_admin.
    """
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No podés eliminar tu propio usuario",
        )

    try:
        with _delete_user_lock:
            supabase = get_supabase_client()
            users = _normalize_user_list(supabase.auth.admin.list_users())

            target_user = next(
                (user for user in users if str(user.id) == user_id),
                None,
            )
            if target_user is not None and _get_user_role(target_user) == "super_admin":
                if _count_super_admins(users) <= 1:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No podés eliminar el último super administrador",
                    )

            supabase.auth.admin.delete_user(user_id)
    except AuthApiError as exc:
        _raise_auth_api_error(exc)
    return None
