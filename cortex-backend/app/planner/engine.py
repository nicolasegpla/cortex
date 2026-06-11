"""Planner engine.

Calls the LLM with a structured prompt and returns one read-only SQL statement.
"""

from typing import Awaitable, Callable

from app.planner.prompt_builder import build_sql_prompt


class SqlPlanner:
    """LLM-backed planner that emits one read-only SQL statement.

    Args:
        llm_call: Async callable that takes messages and returns a response string.
    """

    def __init__(
        self,
        llm_call: Callable[[list[dict]], Awaitable[str]],
    ):
        self._llm_call = llm_call

    async def generate(self, user_text: str, schema_context: str) -> str:
        """Generate one read-only SELECT statement.

        Args:
            user_text: The current user question.
            schema_context: Backend-prepared DDL-style schema context.

        Returns:
            A SQL string starting with SELECT.

        Raises:
            ValueError: If the LLM response cannot be parsed into a SELECT.
        """
        system_prompt = build_sql_prompt(user_text, schema_context)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ]

        raw_response = await self._llm_call(messages)
        sql = self._extract_sql(raw_response)

        if not sql.upper().startswith("SELECT"):
            raise ValueError(f"Generated SQL is not a SELECT statement: {sql[:200]}")

        return sql

    @staticmethod
    def _extract_sql(raw_response: str) -> str:
        """Strip markdown fences and whitespace from a raw LLM SQL response."""
        cleaned = raw_response.strip()

        # Remove markdown code fences if present (case-insensitive label).
        if cleaned.lower().startswith("```"):
            cleaned = cleaned[3:].lstrip()
            if cleaned.lower().startswith("sql"):
                cleaned = cleaned[3:].lstrip()
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()

        # Remove a trailing semicolon to keep the statement single.
        cleaned = cleaned.rstrip().rstrip(";")
        return cleaned
