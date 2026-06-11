"""Tests for synthesizer engine (app.synthesizer.engine)."""

import pytest


class TestNlSynthesizer:
    """Unit tests for NlSynthesizer."""

    @pytest.mark.asyncio
    async def test_synthesize_includes_rows_in_prompt(self):
        """RED: NlSynthesizer passes result rows to the LLM prompt."""
        from app.synthesizer.engine import NlSynthesizer

        captured_messages = []

        async def llm_call(messages: list[dict]) -> str:
            captured_messages.append(messages)
            return "There is 1 brewery."

        synthesizer = NlSynthesizer(llm_call=llm_call)
        result = await synthesizer.synthesize(
            "how many breweries?", [{"count": 1}]
        )

        assert result == "There is 1 brewery."
        assert captured_messages
        prompt = captured_messages[0][0]["content"]
        assert '"count": 1' in prompt
        assert "how many breweries?" in prompt

    @pytest.mark.asyncio
    async def test_synthesize_handles_empty_rows(self):
        """TRIANGULATE: Empty rows are still passed to the LLM for grounded answer."""
        from app.synthesizer.engine import NlSynthesizer

        async def llm_call(messages: list[dict]) -> str:
            return "No breweries were found."

        synthesizer = NlSynthesizer(llm_call=llm_call)
        result = await synthesizer.synthesize("what breweries?", [])

        assert result == "No breweries were found."
