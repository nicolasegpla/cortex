"""Tests for JWT auth middleware and role-based access control."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import Depends, FastAPI, status
from fastapi.testclient import TestClient
from jwt import encode as jwt_encode

from app.core.config import Settings, get_settings


class TestJWTVerification:
    """Test JWT token verification in security module."""

    def test_verify_token_with_valid_token_returns_payload(self) -> None:
        from app.core.security import verify_token

        # Generate a valid token with our secret
        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "user-123",
            "email": "test@example.com",
            "user_metadata": {"role": "super_admin"},
        }
        token = jwt_encode(payload, secret, algorithm="HS256")

        result = verify_token(token)

        assert result["sub"] == "user-123"
        assert result["email"] == "test@example.com"
        assert result["user_metadata"]["role"] == "super_admin"

    def test_verify_token_with_invalid_token_raises_401(self) -> None:
        from app.core.security import verify_token

        with pytest.raises(Exception) as exc_info:
            verify_token("invalid-token")

        assert "401" in str(exc_info.value) or "Invalid" in str(exc_info.value)

    def test_verify_token_with_expired_token_raises_401(self) -> None:
        from app.core.security import verify_token

        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "user-123",
            "email": "test@example.com",
            "exp": 0,  # expired
        }
        token = jwt_encode(payload, secret, algorithm="HS256")

        with pytest.raises(Exception) as exc_info:
            verify_token(token)

        assert "401" in str(exc_info.value) or "Invalid" in str(exc_info.value)


class TestCurrentUserDependency:
    """Test current_user dependency injection."""

    def test_get_current_user_with_valid_token_returns_user(self) -> None:
        from app.core.security import User, get_current_user

        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "email": "admin@example.com",
            "user_metadata": {"role": "super_admin"},
        }
        token = jwt_encode(payload, secret, algorithm="HS256")

        user = get_current_user(token)

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

        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "email": "user@example.com",
            "user_metadata": {},
        }
        token = jwt_encode(payload, secret, algorithm="HS256")

        user = get_current_user(token)

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
    """Test auth router endpoints with real JWT tokens."""

    @pytest.fixture
    def admin_token(self) -> str:
        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "email": "admin@example.com",
            "user_metadata": {"role": "super_admin"},
        }
        return jwt_encode(payload, secret, algorithm="HS256")

    @pytest.fixture
    def operativo_token(self) -> str:
        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
            "email": "user@example.com",
            "user_metadata": {"role": "operativo"},
        }
        return jwt_encode(payload, secret, algorithm="HS256")

    def test_auth_me_returns_current_user_with_role(self, client: TestClient, admin_token: str) -> None:
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
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_auth_me_returns_operativo_role(self, client: TestClient, operativo_token: str) -> None:
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {operativo_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "operativo"
