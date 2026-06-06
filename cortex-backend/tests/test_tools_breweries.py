"""Tests for brewery tool handlers."""

import json
from unittest.mock import MagicMock

import pytest

from app.tools.breweries import make_search_handler, make_count_handler, register_brewery_tools
from app.tools.registry import ToolRegistry


class TestBreweryToolHandlers:
    def test_search_handler_calls_service_with_city_filter(self):
        mock_service = MagicMock()
        mock_service.search.return_value = [
            {"nombre_cerveceria": "Bogotá Brew"}
        ]
        handler = make_search_handler(mock_service)

        result = handler({"city": "Bogotá"})

        mock_service.search.assert_called_once_with(city="Bogotá", country=None, operation_type=None)
        data = json.loads(result)
        assert len(data) == 1
        assert data[0]["nombre_cerveceria"] == "Bogotá Brew"

    def test_search_handler_calls_service_with_all_filters(self):
        mock_service = MagicMock()
        mock_service.search.return_value = []
        handler = make_search_handler(mock_service)

        handler({"city": "Medellín", "country": "Colombia", "operation_type": "planta_propia"})

        mock_service.search.assert_called_once_with(
            city="Medellín", country="Colombia", operation_type="planta_propia"
        )

    def test_count_handler_returns_int_as_string(self):
        mock_service = MagicMock()
        mock_service.count.return_value = 42
        handler = make_count_handler(mock_service)

        result = handler({})

        mock_service.count.assert_called_once()
        assert result == "42"

    def test_search_handler_empty_results(self):
        mock_service = MagicMock()
        mock_service.search.return_value = []
        handler = make_search_handler(mock_service)

        result = handler({"city": "Nowhere"})

        data = json.loads(result)
        assert data == []

    def test_search_handler_no_filters(self):
        mock_service = MagicMock()
        mock_service.search.return_value = [{"nombre_cerveceria": "All Breweries"}]
        handler = make_search_handler(mock_service)

        result = handler({})

        mock_service.search.assert_called_once_with(city=None, country=None, operation_type=None)
        data = json.loads(result)
        assert len(data) == 1

    def test_search_handler_partial_filters(self):
        mock_service = MagicMock()
        mock_service.search.return_value = []
        handler = make_search_handler(mock_service)

        handler({"country": "Colombia"})

        mock_service.search.assert_called_once_with(city=None, country="Colombia", operation_type=None)

    def test_count_handler_ignores_arguments(self):
        mock_service = MagicMock()
        mock_service.count.return_value = 5
        handler = make_count_handler(mock_service)

        result = handler({"ignored": "value"})

        assert result == "5"

    def test_register_brewery_tools_wires_registry(self):
        registry = ToolRegistry()
        mock_service = MagicMock()
        mock_service.search.return_value = [{"nombre_cerveceria": "Test"}]

        register_brewery_tools(registry, mock_service)

        definitions = registry.list_definitions()
        assert len(definitions) == 2
        names = {d.name for d in definitions}
        assert names == {"search_breweries", "count_breweries"}

        result = registry.execute("search_breweries", {"city": "Bogotá"})
        data = json.loads(result)
        assert data == [{"nombre_cerveceria": "Test"}]
