"""Synthesizer engine.

Turns grounded retrieval results into a consistent final response.
"""

import json
import logging
from typing import Awaitable, Callable

logger = logging.getLogger(__name__)


class NlSynthesizer:
    """LLM-backed synthesizer that turns database rows into natural language.

    Args:
        llm_call: Async callable that takes messages and returns a response string.
    """

    def __init__(
        self,
        llm_call: Callable[[list[dict]], Awaitable[str]],
    ):
        self._llm_call = llm_call

    async def synthesize(self, user_text: str, result_rows: list[dict]) -> str:
        """Synthesize a natural-language answer from DB rows.

        Args:
            user_text: The original user question.
            result_rows: Rows returned by the validated SQL execution.

        Returns:
            A natural-language answer based only on the provided rows.
        """
        rows_json = json.dumps(result_rows, ensure_ascii=False, default=str)
        system_prompt = (
            "You are a concise answer synthesizer for a read-only chat system.\n\n"
            "Answer the user's question using ONLY the database results below. "
            "If the results are empty, state that no records were found. "
            "Do not invent facts. Be brief and clear.\n\n"
            f"User question: {user_text}\n\n"
            f"Database results: {rows_json}\n\n"
            "Answer:"
        )
        messages = [{"role": "system", "content": system_prompt}]
        return await self._llm_call(messages)
