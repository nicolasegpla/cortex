from fastapi.testclient import TestClient


class TestHealth:
    def test_read_health_returns_ok_status(self, client: TestClient) -> None:
        response = client.get('/health')

        assert response.status_code == 200
        assert response.json() == {'status': 'ok'}
