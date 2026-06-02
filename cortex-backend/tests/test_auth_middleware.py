"""Tests for JWT auth middleware and role-based access control."""

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi import Depends, FastAPI, status
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings


def create_mock_user(user_id: str, email: str, role: str = "operativo"):
    """Create a mock Supabase User object."""
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = email
    mock_user.user_metadata = {"role": role}
    return mock_user


def create_mock_user_response(user_id: str, email: str, role: str = "operativo"):
    """Create a mock UserResponse from Supabase."""
    mock_response = MagicMock()
    mock_response.user = create_mock_user(user_id, email, role)
    return mock_response


class TestJWTVerification:
    """Test JWT token verification in security module."""

    def test_verify_token_with_valid_token_returns_payload(self) -> None:
        from app.core.security import verify_token

        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            mock_client.auth.get_user.return_value = create_mock_user_response(
                "user-123", "test@example.com", "super_admin"
            )
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            result = verify_token("valid-token")

        assert result["sub"] == "user-123"
        assert result["email"] == "test@example.com"
        assert result["user_metadata"]["role"] == "super_admin"

    def test_verify_token_with_invalid_token_raises_401(self) -> None:
        from app.core.security import verify_token

        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            from supabase_auth.errors import AuthApiError
            mock_client.auth.get_user.side_effect = AuthApiError(
                "Invalid token", 401, "invalid_token"
            )
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            with pytest.raises(Exception) as exc_info:
                verify_token("invalid-token")

        assert "401" in str(exc_info.value) or "Invalid" in str(exc_info.value)

    def test_verify_token_with_expired_token_raises_401(self) -> None:
        from app.core.security import verify_token

        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            from supabase_auth.errors import AuthApiError
            mock_client.auth.get_user.side_effect = AuthApiError(
                "Token expired", 401, "token_expired"
            )
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            with pytest.raises(Exception) as exc_info:
                verify_token("expired-token")

        assert "401" in str(exc_info.value) or "Invalid" in str(exc_info.value)

    def test_verify_token_with_missing_client_raises_401(self) -> None:
        from app.core.security import verify_token

        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service.get_client.return_value = None
            mock_get_service.return_value = mock_service

            with pytest.raises(Exception) as exc_info:
                verify_token("valid-token")

        assert "401" in str(exc_info.value)

    def test_verify_token_with_none_raises_401(self) -> None:
        from app.core.security import verify_token

        with pytest.raises(Exception) as exc_info:
            verify_token(None)

        assert "401" in str(exc_info.value)


class TestCurrentUserDependency:
    """Test current_user dependency injection."""

    def test_get_current_user_with_valid_token_returns_user(self) -> None:
        from app.core.security import User, get_current_user

        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            mock_client.auth.get_user.return_value = create_mock_user_response(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "admin@example.com", "super_admin"
            )
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            user = get_current_user("valid-token")

        assert isinstance(user, User)
        assert str(user.id) == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        assert user.email == "admin@example.com"
        assert user.role == "super_admin"

    def test_get_current_user_with_missing_token_raises_401(self) -> None:
        from app.core.security import get_current_user

        with pytest.raises(Exception) as exc_info:
            get_current_user(None)

        assert "401" in str(exc_info.value) or "credentials" in str(exc_info.value)

    def test_get_current_user_without_role_defaults_to_operativo(self) -> None:
        from app.core.security import User, get_current_user

        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            mock_user = MagicMock()
            mock_user.id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            mock_user.email = "user@example.com"
            mock_user.user_metadata = {}
            mock_response = MagicMock()
            mock_response.user = mock_user
            mock_client.auth.get_user.return_value = mock_response
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            user = get_current_user("valid-token")

        assert isinstance(user, User)
        assert user.role == "operativo"


class TestRequireRoleDependency:
    """Test role-based access control dependency."""

    def test_require_role_with_allowed_role_succeeds(self) -> None:
        from app.core.security import User, require_role

        user = User(
            id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            email="admin@example.com",
            role="super_admin",
        )
        checker = require_role(["super_admin"])

        # Should not raise
        result = checker(user)
        assert result == user

    def test_require_role_with_disallowed_role_raises_403(self) -> None:
        from app.core.security import User, require_role

        user = User(
            id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            email="user@example.com",
            role="operativo",
        )
        checker = require_role(["super_admin"])

        with pytest.raises(Exception) as exc_info:
            checker(user)

        assert "403" in str(exc_info.value) or "permission" in str(exc_info.value)

    def test_require_role_with_multiple_allowed_roles_matches_any(self) -> None:
        from app.core.security import User, require_role

        user = User(
            id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            email="user@example.com",
            role="operativo",
        )
        checker = require_role(["super_admin", "operativo"])

        # Should not raise
        result = checker(user)
        assert result == user


class TestAuthEndpoints:
    """Test auth router endpoints with mocked JWT tokens."""

    @pytest.fixture
    def admin_token(self) -> str:
        return "admin-mock-token"

    @pytest.fixture
    def operativo_token(self) -> str:
        return "operativo-mock-token"

    def test_auth_me_returns_current_user_with_role(self, client: TestClient, admin_token: str) -> None:
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            mock_client.auth.get_user.return_value = create_mock_user_response(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "admin@example.com", "super_admin"
            )
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            response = client.get(
                "/auth/me",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "admin@example.com"
        assert data["role"] == "super_admin"

    def test_auth_me_without_token_returns_401(self, client: TestClient) -> None:
        response = client.get("/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_auth_me_with_invalid_token_returns_401(self, client: TestClient) -> None:
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            from supabase_auth.errors import AuthApiError
            mock_client.auth.get_user.side_effect = AuthApiError(
                "Invalid token", 401, "invalid_token"
            )
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            response = client.get(
                "/auth/me",
                headers={"Authorization": "Bearer invalid-token"},
            )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_auth_me_returns_operativo_role(self, client: TestClient, operativo_token: str) -> None:
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()
            mock_client.auth.get_user.return_value = create_mock_user_response(
                "b2c3d4e5-f6a7-8901-bcde-f23456789012", "user@example.com", "operativo"
            )
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            response = client.get(
                "/auth/me",
                headers={"Authorization": f"Bearer {operativo_token}"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "operativo"
