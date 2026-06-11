"""Tests for planner engine (app.planner.engine)."""

import pytest


class TestSqlPlanner:
    """Unit tests for SqlPlanner."""

    @pytest.mark.asyncio
    async def test_generate_returns_select(self):
        """RED: SqlPlanner extracts a SELECT from the LLM response."""
        from app.planner.engine import SqlPlanner

        async def llm_call(messages: list[dict]) -> str:
            return "SELECT COUNT(*) FROM breweries"

        planner = SqlPlanner(llm_call=llm_call)
        sql = await planner.generate("how many breweries?", "Table: breweries")

        assert sql == "SELECT COUNT(*) FROM breweries"

    @pytest.mark.asyncio
    async def test_generate_strips_markdown_fences(self):
        """TRIANGULATE: Markdown code fences are stripped."""
        from app.planner.engine import SqlPlanner

        async def llm_call(messages: list[dict]) -> str:
            return "```sql\nSELECT name FROM breweries\n```"

        planner = SqlPlanner(llm_call=llm_call)
        sql = await planner.generate("names?", "Table: breweries")

        assert sql == "SELECT name FROM breweries"

    @pytest.mark.asyncio
    async def test_generate_rejects_non_select(self):
        """TRIANGULATE: Non-SELECT responses raise ValueError."""
        from app.planner.engine import SqlPlanner

        async def llm_call(messages: list[dict]) -> str:
            return "DELETE FROM breweries"

        planner = SqlPlanner(llm_call=llm_call)

        with pytest.raises(ValueError, match="not a SELECT"):
            await planner.generate("delete", "Table: breweries")

    @pytest.mark.asyncio
    async def test_generate_strips_uppercase_sql_markdown_fences(self):
        """TRIANGULATE: Uppercase SQL fence labels are stripped."""
        from app.planner.engine import SqlPlanner

        async def llm_call(messages: list[dict]) -> str:
            return "```SQL\nSELECT name FROM breweries\n```"

        planner = SqlPlanner(llm_call=llm_call)
        sql = await planner.generate("names?", "Table: breweries")

        assert sql == "SELECT name FROM breweries"
