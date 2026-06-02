from fastapi.testclient import TestClient


class TestAuth:
    def test_login_returns_not_implemented(self, client: TestClient) -> None:
        response = client.post(
            '/auth/login',
            json={'email': 'test@example.com', 'password': 'secret123'},
        )

        assert response.status_code == 501
        assert response.json() == {'access_token': '', 'token_type': 'bearer'}

    def test_register_returns_not_implemented(self, client: TestClient) -> None:
        response = client.post(
            '/auth/register',
            json={
                'email': 'test@example.com',
                'password': 'secret123',
                'full_name': 'Test User',
            },
        )

        assert response.status_code == 501
        assert response.json() == {'access_token': '', 'token_type': 'bearer'}
