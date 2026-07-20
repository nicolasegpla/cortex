from fastapi.testclient import TestClient

from app.main import create_app


class TestMain:
    def test_create_app_includes_expected_routes(self) -> None:
        application = create_app()
        paths = {route.path for route in application.routes}

        assert '/health' in paths
        assert '/auth/login' in paths
        assert '/auth/register' not in paths
        assert '/admin/users' in paths
        assert '/admin/users/{user_id}' in paths

    def test_no_chat_stream_route(self) -> None:
        """Legacy /chat/stream SSE route is deleted; /chat/n8n stays wired."""
        application = create_app()
        paths = {route.path for route in application.routes}

        assert '/chat/stream' not in paths
        assert '/chat/n8n' in paths

        client = TestClient(application)
        assert client.post('/chat/stream', json={}).status_code == 404
