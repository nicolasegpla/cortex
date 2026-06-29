import os
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault('N8N_CHAT_WEBHOOK_URL', 'https://n8n.example.com/webhook/chat')
os.environ.setdefault('N8N_CHAT_AUTH_TOKEN', 'test-auth-token')

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def mock_brewery_service():
    """Create a mock BreweryService with search/inspect/count methods."""
    mock = MagicMock()
    mock.search.return_value = [{"nombre_cerveceria": "Test Brewery", "ciudad": "Bogotá"}]
    mock.inspect.return_value = [{"nombre_cerveceria": "Inspect Brewery", "ciudad": "Medellín"}]
    mock.count.return_value = 42
    return mock
