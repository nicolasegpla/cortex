from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

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
