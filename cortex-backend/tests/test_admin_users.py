"""Tests for admin user management endpoints and schemas."""

from concurrent.futures import ThreadPoolExecutor
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from pydantic import ValidationError
from supabase import AuthApiError

from app.schemas.admin_users import CreateUserRequest, UserListResponse, UserResponse


def create_mock_admin_client():
    """Create a mock Supabase client with auth.admin methods."""
    mock_client = MagicMock()
    return mock_client


def create_mock_auth_service(role: str = "super_admin", user_id: str = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"):
    """Create a mock SupabaseService that returns an authenticated user."""
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = "admin@example.com"
    mock_user.user_metadata = {"role": role}
    mock_response = MagicMock()
    mock_response.user = mock_user

    mock_auth_client = MagicMock()
    mock_auth_client.auth.get_user.return_value = mock_response

    mock_service = MagicMock()
    mock_service.get_client.return_value = mock_auth_client
    return mock_service


class TestCreateUserRequestSchema:
    """Test Pydantic schema validation for user creation."""

    def test_valid_request_with_matching_passwords_passes(self) -> None:
        request = CreateUserRequest(
            email="new@example.com",
            password="secret123",
            password_confirm="secret123",
            role="operativo",
        )

        assert request.email == "new@example.com"
        assert request.password == "secret123"
        assert request.password_confirm == "secret123"
        assert request.role == "operativo"

    def test_default_role_is_operativo(self) -> None:
        request = CreateUserRequest(
            email="new@example.com",
            password="secret123",
            password_confirm="secret123",
        )

        assert request.role == "operativo"

    def test_mismatched_passwords_raise_validation_error(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            CreateUserRequest(
                email="new@example.com",
                password="secret123",
                password_confirm="different",
                role="operativo",
            )

        assert "password" in str(exc_info.value).lower() or "coincid" in str(exc_info.value).lower()

    def test_missing_required_field_raises_validation_error(self) -> None:
        with pytest.raises(ValidationError):
            CreateUserRequest(
                password="secret123",
                password_confirm="secret123",
            )

    def test_invalid_role_raises_validation_error(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            CreateUserRequest(
                email="new@example.com",
                password="secret123",
                password_confirm="secret123",
                role="admin",
            )

        assert "rol" in str(exc_info.value).lower()

    def test_super_admin_role_is_valid(self) -> None:
        request = CreateUserRequest(
            email="new@example.com",
            password="secret123",
            password_confirm="secret123",
            role="super_admin",
        )

        assert request.role == "super_admin"


class TestUserResponseSchema:
    """Test Pydantic response schema serialization."""

    def test_user_response_serializes_correctly(self) -> None:
        response = UserResponse(id="user-123", email="user@example.com", role="super_admin")
        data = response.model_dump()

        assert data == {"id": "user-123", "email": "user@example.com", "role": "super_admin"}


class TestUserListResponseSchema:
    """Test list response schema serialization."""

    def test_list_response_serializes_users(self) -> None:
        response = UserListResponse(
            users=[
                UserResponse(id="user-1", email="one@example.com", role="operativo"),
                UserResponse(id="user-2", email="two@example.com", role="super_admin"),
            ]
        )
        data = response.model_dump()

        assert len(data["users"]) == 2
        assert data["users"][0]["email"] == "one@example.com"
        assert data["users"][1]["role"] == "super_admin"


class TestAdminUsersEndpoints:
    """Test admin user CRUD endpoints with mocked Supabase."""

    @pytest.fixture
    def admin_auth_patch(self):
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_get_service.return_value = create_mock_auth_service("super_admin")
            yield

    @pytest.fixture
    def operativo_auth_patch(self):
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_get_service.return_value = create_mock_auth_service("operativo")
            yield

    def test_create_user_success(self, client: TestClient, admin_auth_patch) -> None:
        mock_user = MagicMock()
        mock_user.id = "new-user-123"
        mock_user.email = "new@example.com"
        mock_user.user_metadata = {"role": "operativo"}
        mock_response = MagicMock()
        mock_response.user = mock_user

        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.create_user.return_value = mock_response
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/admin/users",
                json={
                    "email": "new@example.com",
                    "password": "secret123",
                    "password_confirm": "secret123",
                    "role": "operativo",
                },
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["id"] == "new-user-123"
        assert data["email"] == "new@example.com"
        assert data["role"] == "operativo"

    def test_create_user_password_mismatch_returns_422(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/admin/users",
                json={
                    "email": "new@example.com",
                    "password": "secret123",
                    "password_confirm": "different",
                    "role": "operativo",
                },
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        mock_supabase.auth.admin.create_user.assert_not_called()

    def test_create_user_with_custom_role(self, client: TestClient, admin_auth_patch) -> None:
        mock_user = MagicMock()
        mock_user.id = "admin-user-456"
        mock_user.email = "admin-user@example.com"
        mock_user.user_metadata = {"role": "super_admin"}
        mock_response = MagicMock()
        mock_response.user = mock_user

        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.create_user.return_value = mock_response
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/admin/users",
                json={
                    "email": "admin-user@example.com",
                    "password": "secret123",
                    "password_confirm": "secret123",
                    "role": "super_admin",
                },
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["role"] == "super_admin"
        mock_supabase.auth.admin.create_user.assert_called_once_with(
            {
                "email": "admin-user@example.com",
                "password": "secret123",
                "user_metadata": {"role": "super_admin"},
            }
        )

    def test_create_user_duplicate_email_returns_409(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.create_user.side_effect = AuthApiError(
                "User already registered", 422, None
            )
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/admin/users",
                json={
                    "email": "existing@example.com",
                    "password": "secret123",
                    "password_confirm": "secret123",
                    "role": "operativo",
                },
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "ya existe un usuario" in response.json()["detail"].lower()
        mock_supabase.auth.admin.create_user.assert_called_once()

    def test_create_user_upstream_auth_error_returns_502(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.create_user.side_effect = AuthApiError(
                "Upstream service unavailable", 503, None
            )
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/admin/users",
                json={
                    "email": "new@example.com",
                    "password": "secret123",
                    "password_confirm": "secret123",
                    "role": "operativo",
                },
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert response.json()["detail"] == "Error en el servicio de autenticación"
        mock_supabase.auth.admin.create_user.assert_called_once()

    def test_list_users_returns_directory(self, client: TestClient, admin_auth_patch) -> None:
        mock_user_one = MagicMock()
        mock_user_one.id = "user-1"
        mock_user_one.email = "one@example.com"
        mock_user_one.user_metadata = {"role": "operativo"}
        mock_user_two = MagicMock()
        mock_user_two.id = "user-2"
        mock_user_two.email = "two@example.com"
        mock_user_two.user_metadata = {"role": "super_admin"}

        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.return_value = [mock_user_one, mock_user_two]
            mock_get_client.return_value = mock_supabase

            response = client.get(
                "/admin/users",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["users"]) == 2
        assert data["users"][0]["id"] == "user-1"
        assert data["users"][1]["email"] == "two@example.com"

    def test_list_users_upstream_error_returns_502(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.side_effect = AuthApiError(
                "Upstream service unavailable", 503, None
            )
            mock_get_client.return_value = mock_supabase

            response = client.get(
                "/admin/users",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert response.json()["detail"] == "Error en el servicio de autenticación"
        mock_supabase.auth.admin.list_users.assert_called_once()

    def test_delete_user_success(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/user-123",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_supabase.auth.admin.delete_user.assert_called_once_with("user-123")

    def test_delete_user_not_found_returns_404(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.return_value = []
            mock_supabase.auth.admin.delete_user.side_effect = AuthApiError(
                "User not found", 404, None
            )
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/missing-user",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró el usuario"
        mock_supabase.auth.admin.delete_user.assert_called_once_with("missing-user")

    def test_delete_user_upstream_error_returns_502(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.return_value = []
            mock_supabase.auth.admin.delete_user.side_effect = AuthApiError(
                "Upstream service unavailable", 503, None
            )
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/user-123",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert response.json()["detail"] == "Error en el servicio de autenticación"
        mock_supabase.auth.admin.delete_user.assert_called_once_with("user-123")

    def test_delete_self_is_forbidden(self, client: TestClient, admin_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_supabase.auth.admin.delete_user.assert_not_called()

    def test_delete_last_super_admin_is_forbidden(self, client: TestClient, admin_auth_patch) -> None:
        mock_user = MagicMock()
        mock_user.id = "user-1"
        mock_user.email = "one@example.com"
        mock_user.user_metadata = {"role": "super_admin"}

        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.return_value = [mock_user]
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/user-1",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_supabase.auth.admin.delete_user.assert_not_called()

    def test_delete_super_admin_when_multiple_exist_succeeds(self, client: TestClient, admin_auth_patch) -> None:
        mock_user_one = MagicMock()
        mock_user_one.id = "user-1"
        mock_user_one.email = "one@example.com"
        mock_user_one.user_metadata = {"role": "super_admin"}
        mock_user_two = MagicMock()
        mock_user_two.id = "user-2"
        mock_user_two.email = "two@example.com"
        mock_user_two.user_metadata = {"role": "super_admin"}

        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.return_value = [mock_user_one, mock_user_two]
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/user-1",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_supabase.auth.admin.delete_user.assert_called_once_with("user-1")

    def test_delete_operativo_user_succeeds(self, client: TestClient, admin_auth_patch) -> None:
        mock_user = MagicMock()
        mock_user.id = "user-1"
        mock_user.email = "one@example.com"
        mock_user.user_metadata = {"role": "operativo"}

        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.return_value = [mock_user]
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/user-1",
                headers={"Authorization": "Bearer admin-token"},
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_supabase.auth.admin.delete_user.assert_called_once_with("user-1")

    def test_concurrent_delete_last_two_super_admins_only_one_succeeds(
        self, client: TestClient, admin_auth_patch
    ) -> None:
        """Concurrent deletes of the last two super_admins must not both pass.

        Without serialization, two requests could each see count == 2 and both
        delete, leaving zero super_admins. The backend lock plus in-lock recheck
        guarantees at most one deletion succeeds.
        """
        mock_user_one = MagicMock()
        mock_user_one.id = "user-1"
        mock_user_one.email = "one@example.com"
        mock_user_one.user_metadata = {"role": "super_admin"}
        mock_user_two = MagicMock()
        mock_user_two.id = "user-2"
        mock_user_two.email = "two@example.com"
        mock_user_two.user_metadata = {"role": "super_admin"}

        # Mutable list shared by the mock so later list_users calls see the
        # deletion performed by an earlier call.
        users = [mock_user_one, mock_user_two]

        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.list_users.side_effect = lambda: list(users)

            def delete_side_effect(uid: str) -> None:
                nonlocal users
                users = [user for user in users if str(user.id) != uid]

            mock_supabase.auth.admin.delete_user.side_effect = delete_side_effect
            mock_get_client.return_value = mock_supabase

            def delete(uid: str) -> int:
                return client.delete(
                    f"/admin/users/{uid}",
                    headers={"Authorization": "Bearer admin-token"},
                ).status_code

            with ThreadPoolExecutor(max_workers=2) as executor:
                future_one = executor.submit(delete, "user-1")
                future_two = executor.submit(delete, "user-2")
                status_one = future_one.result()
                status_two = future_two.result()

        assert {status_one, status_two} == {status.HTTP_204_NO_CONTENT, status.HTTP_403_FORBIDDEN}
        assert mock_supabase.auth.admin.delete_user.call_count == 1

    def test_non_super_admin_cannot_create_user(self, client: TestClient, operativo_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/admin/users",
                json={
                    "email": "new@example.com",
                    "password": "secret123",
                    "password_confirm": "secret123",
                    "role": "operativo",
                },
                headers={"Authorization": "Bearer operativo-token"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_supabase.auth.admin.create_user.assert_not_called()

    def test_non_super_admin_cannot_list_users(self, client: TestClient, operativo_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.get(
                "/admin/users",
                headers={"Authorization": "Bearer operativo-token"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_supabase.auth.admin.list_users.assert_not_called()

    def test_non_super_admin_cannot_delete_user(self, client: TestClient, operativo_auth_patch) -> None:
        with patch("app.routers.admin_users.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.delete(
                "/admin/users/user-123",
                headers={"Authorization": "Bearer operativo-token"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_supabase.auth.admin.delete_user.assert_not_called()

    def test_unauthenticated_request_rejected(self, client: TestClient) -> None:
        response = client.get("/admin/users")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
