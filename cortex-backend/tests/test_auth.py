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

    def test_logout_success(self, client: TestClient) -> None:
        with patch("app.routers.auth.get_supabase_client") as mock_get_client:
            mock_supabase = MagicMock()
            mock_get_client.return_value = mock_supabase

            response = client.post("/auth/logout")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        mock_supabase.auth.sign_out.assert_called_once()

    def test_register_endpoint_removed_returns_404(self, client: TestClient) -> None:
        response = client.post(
            "/auth/register",
            json={
                "email": "new@example.com",
                "password": "secret123",
                "full_name": "New User",
            },
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
