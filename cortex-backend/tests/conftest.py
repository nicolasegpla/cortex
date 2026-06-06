from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.tools.breweries import register_brewery_tools
from app.tools.registry import ToolRegistry


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def mock_brewery_service():
    """Create a mock BreweryService with search/count methods."""
    mock = MagicMock()
    mock.search.return_value = [{"nombre_cerveceria": "Test Brewery", "ciudad": "Bogotá"}]
    mock.count.return_value = 42
    return mock


@pytest.fixture
def mock_tool_registry(mock_brewery_service):
    """Create a ToolRegistry with mocked brewery tools registered."""
    registry = ToolRegistry()
    register_brewery_tools(registry, mock_brewery_service)
    return registry
