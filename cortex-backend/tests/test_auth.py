from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from supabase import AuthApiError


class TestAuthEndpoints:
    """Test auth router endpoints with mocked Supabase client."""

    def test_login_success_returns_token(self, client: TestClient) -> None:
        mock_session = MagicMock()
        mock_session.access_token = "mock-access-token-123"
        mock_response = MagicMock()
        mock_response.session = mock_session

        with patch("app.routers.auth.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.sign_in_with_password.return_value = mock_response
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/auth/login",
                json={"email": "test@example.com", "password": "secret123"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["access_token"] == "mock-access-token-123"
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials_returns_401(self, client: TestClient) -> None:
        with patch("app.routers.auth.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.sign_in_with_password.side_effect = AuthApiError(
                "Invalid login credentials", 400, "invalid_credentials"
            )
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/auth/login",
                json={"email": "wrong@example.com", "password": "wrongpass"},
            )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_register_success_returns_user_info(self, client: TestClient) -> None:
        mock_user = MagicMock()
        mock_user.id = "user-uuid-123"
        mock_user.email = "new@example.com"
        mock_user.user_metadata = {"role": "operativo"}
        mock_response = MagicMock()
        mock_response.user = mock_user

        with patch("app.routers.auth.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.create_user.return_value = mock_response
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/auth/register",
                json={
                    "email": "new@example.com",
                    "password": "secret123",
                    "full_name": "New User",
                },
            )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_id"] == "user-uuid-123"
        assert data["email"] == "new@example.com"
        assert data["role"] == "operativo"
        assert data["requires_confirmation"] is False

    def test_register_with_confirmation_required(self, client: TestClient) -> None:
        mock_user = MagicMock()
        mock_user.id = "user-uuid-456"
        mock_user.email = "confirm@example.com"
        mock_user.user_metadata = {"role": "operativo"}
        mock_user.email_confirmed_at = None
        mock_response = MagicMock()
        mock_response.user = mock_user

        with patch("app.routers.auth.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.create_user.return_value = mock_response
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/auth/register",
                json={
                    "email": "confirm@example.com",
                    "password": "secret123",
                    "full_name": "Confirm User",
                },
            )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["requires_confirmation"] is True
        assert "check your email" in data["message"].lower()

    def test_register_duplicate_email_returns_409(self, client: TestClient) -> None:
        with patch("app.routers.auth.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_supabase.auth.admin.create_user.side_effect = AuthApiError(
                "User already registered", 422, "user_already_exists"
            )
            mock_get_client.return_value = mock_supabase

            response = client.post(
                "/auth/register",
                json={
                    "email": "existing@example.com",
                    "password": "secret123",
                    "full_name": "Existing User",
                },
            )

        assert response.status_code == status.HTTP_409_CONFLICT

    def test_logout_success(self, client: TestClient) -> None:
        with patch("app.routers.auth.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.post("/auth/logout")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        mock_supabase.auth.sign_out.assert_called_once()
