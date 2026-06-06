"""Tool registry implementation."""

from collections.abc import Callable

from app.schemas.chat import ToolDefinition


class ToolRegistry:
    """Registry for whitelisted LLM tools.

    Mirrors the ProviderRegistry pattern: register definitions with handlers,
    list available tools, and execute by name.
    """

    def __init__(self) -> None:
        self._tools: dict[str, tuple[ToolDefinition, Callable]] = {}

    def register(self, definition: ToolDefinition, handler: Callable) -> None:
        """Register a tool definition and its handler."""
        self._tools[definition.name] = (definition, handler)

    def list_definitions(self, names: list[str] | None = None) -> list[ToolDefinition]:
        """List registered tool definitions.

        Args:
            names: Optional filter to return only specific tool names.

        Returns:
            List of ToolDefinition objects.
        """
        if names is not None:
            return [
                self._tools[name][0]
                for name in names
                if name in self._tools
            ]
        return [definition for definition, _ in self._tools.values()]

    def execute(self, name: str, arguments: dict) -> str:
        """Execute a registered tool by name.

        Args:
            name: Tool name.
            arguments: Arguments to pass to the handler.

        Returns:
            Tool execution result as string.

        Raises:
            ValueError: If tool is not registered.
        """
        if name not in self._tools:
            raise ValueError(f"Tool '{name}' not found")
        _, handler = self._tools[name]
        return handler(arguments)
