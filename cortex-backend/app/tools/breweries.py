"""Brewery tool handlers — read-only queries via BreweryService."""

import json

from app.schemas.chat import ToolDefinition
from app.services.brewery_service import BreweryService
from app.tools.definitions import COUNT_BREWERIES_TOOL, SEARCH_BREWERIES_TOOL
from app.tools.registry import ToolRegistry


def make_search_handler(service: BreweryService):
    """Create a handler for the search_breweries tool.

    Args:
        service: BreweryService instance with search() method.

    Returns:
        Handler function accepting arguments dict and returning JSON string.
    """

    def handler(arguments: dict) -> str:
        city = arguments.get("city")
        country = arguments.get("country")
        operation_type = arguments.get("operation_type")
        results = service.search(city=city, country=country, operation_type=operation_type)
        return json.dumps(results)

    return handler


def make_count_handler(service: BreweryService):
    """Create a handler for the count_breweries tool.

    Args:
        service: BreweryService instance with count() method.

    Returns:
        Handler function returning count as string.
    """

    def handler(arguments: dict) -> str:
        count = service.count()
        return str(count)

    return handler


def register_brewery_tools(registry: ToolRegistry, service: BreweryService) -> None:
    """Register brewery query tools in a ToolRegistry.

    Args:
        registry: ToolRegistry instance.
        service: BreweryService instance for database access.
    """
    registry.register(SEARCH_BREWERIES_TOOL, make_search_handler(service))
    registry.register(COUNT_BREWERIES_TOOL, make_count_handler(service))
