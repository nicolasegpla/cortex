"""Tests for ToolRegistry."""

from unittest.mock import MagicMock

import pytest

from app.tools.registry import ToolRegistry
from app.schemas.chat import ToolDefinition


class TestToolRegistry:
    def test_register_and_list_definitions(self):
        registry = ToolRegistry()
        tool = ToolDefinition(
            name="test_tool",
            description="A test tool",
            parameters={},
        )
        handler = MagicMock(return_value="result")

        registry.register(tool, handler)
        definitions = registry.list_definitions()

        assert len(definitions) == 1
        assert definitions[0].name == "test_tool"

    def test_execute_calls_handler(self):
        registry = ToolRegistry()
        tool = ToolDefinition(
            name="test_tool",
            description="A test tool",
            parameters={},
        )
        handler = MagicMock(return_value="executed")
        registry.register(tool, handler)

        result = registry.execute("test_tool", {"arg": "value"})

        assert result == "executed"
        handler.assert_called_once_with({"arg": "value"})

    def test_execute_missing_tool_raises_value_error(self):
        registry = ToolRegistry()

        with pytest.raises(ValueError, match="Tool 'missing' not found"):
            registry.execute("missing", {})

    def test_list_definitions_with_filter(self):
        registry = ToolRegistry()
        tool1 = ToolDefinition(name="tool1", description="First", parameters={})
        tool2 = ToolDefinition(name="tool2", description="Second", parameters={})
        registry.register(tool1, MagicMock())
        registry.register(tool2, MagicMock())

        filtered = registry.list_definitions(names=["tool1"])

        assert len(filtered) == 1
        assert filtered[0].name == "tool1"

    def test_handler_exception_propagates(self):
        registry = ToolRegistry()
        tool = ToolDefinition(
            name="failing_tool",
            description="Always fails",
            parameters={},
        )
        handler = MagicMock(side_effect=RuntimeError("boom"))
        registry.register(tool, handler)

        with pytest.raises(RuntimeError, match="boom"):
            registry.execute("failing_tool", {})
