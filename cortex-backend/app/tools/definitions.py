"""Tool definitions for brewery queries in OpenAI function-calling format."""

from app.schemas.chat import ToolDefinition

SEARCH_BREWERIES_TOOL = ToolDefinition(
    name="search_breweries",
    description="Search breweries by location filters (city, country) or operation type.",
    parameters={
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": "City name to filter breweries",
            },
            "country": {
                "type": "string",
                "description": "Country name to filter breweries",
            },
            "operation_type": {
                "type": "string",
                "description": "Operation type filter (e.g., planta_propia, maquila)",
            },
        },
    },
)

COUNT_BREWERIES_TOOL = ToolDefinition(
    name="count_breweries",
    description="Count the total number of breweries in the database.",
    parameters={
        "type": "object",
        "properties": {},
    },
)
