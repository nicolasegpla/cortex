import importlib
import sys

import pytest
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

    def test_no_provider_credentials_routes(self) -> None:
        """The /provider-credentials CRUD surface is deleted (n8n owns credentials)."""
        application = create_app()
        paths = {route.path for route in application.routes}

        assert not any(p.startswith('/provider-credentials') for p in paths)

        client = TestClient(application)
        assert client.get('/provider-credentials').status_code == 404
        assert client.post('/provider-credentials', json={}).status_code == 404
        assert client.delete('/provider-credentials/openai').status_code == 404

    def test_encryption_service_not_importable(self) -> None:
        """EncryptionService module is deleted; importing it must fail."""
        sys.modules.pop('app.services.encryption_service', None)
        with pytest.raises(ImportError):
            importlib.import_module('app.services.encryption_service')
