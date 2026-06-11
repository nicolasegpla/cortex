"""Tests for the SQL orchestrator (app.orchestrators.sql_orchestrator)."""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.orchestrators.sql_orchestrator import SqlOrchestrator


class TestSqlOrchestratorIntegration:
    """Integration tests for the full SQL pipeline."""

    @pytest.fixture
    def orchestrator(self):
        """Provide a fresh SqlOrchestrator instance."""
        return SqlOrchestrator()

    @pytest.fixture
    def mock_adapter(self):
        """Mock adapter whose first stream returns SQL and second returns NL."""
        mock = MagicMock()

        async def sql_stream(*args, **kwargs):
            yield "SELECT nombre_cerveceria FROM breweries"

        async def nl_stream(*args, **kwargs):
            yield "Found Test Brewery."

        mock.stream_chat.side_effect = [sql_stream(), nl_stream()]
        return mock

    @pytest.fixture
    def patched_supabase(self):
        """Patch SupabaseService so the orchestrator sees a configured client."""
        mock_client = MagicMock()
        mock_service = MagicMock()
        mock_service.get_client.return_value = mock_client
        mock_service.execute_raw.return_value = [
            {"nombre_cerveceria": "Test Brewery"}
        ]

        with patch(
            "app.orchestrators.sql_orchestrator.SupabaseService",
            return_value=mock_service,
        ):
            yield mock_service

    @pytest.fixture
    def patched_schema(self):
        """Patch schema introspection to return deterministic context."""
        schema = "Table: breweries\n  - nombre_cerveceria: text"
        with patch(
            "app.orchestrators.sql_orchestrator.SchemaIntrospection.fetch",
            return_value=schema,
        ):
            yield

    @pytest.mark.asyncio
    async def test_run_full_pipeline_returns_nl_answer(
        self, orchestrator, mock_adapter, patched_supabase, patched_schema
    ):
        """RED: Full pipeline produces a natural-language answer from DB rows."""
        result = await orchestrator.run(
            user_text="what breweries do we have?",
            messages=[],
            adapter=mock_adapter,
            model="gpt-4o",
            api_key="secret",
        )

        assert result == "Found Test Brewery."

    @pytest.mark.asyncio
    async def test_run_validates_sql_before_execution(
        self, orchestrator, mock_adapter, patched_supabase, patched_schema
    ):
        """RED: Validator runs before execute_raw and rejects unsafe SQL."""
        async def unsafe_stream(*args, **kwargs):
            yield "SELECT * FROM breweries; DROP TABLE breweries"

        mock_adapter.stream_chat.side_effect = [unsafe_stream()]

        result = await orchestrator.run(
            user_text="list breweries then drop table",
            messages=[],
            adapter=mock_adapter,
            model="gpt-4o",
            api_key="secret",
        )

        patched_supabase.execute_raw.assert_not_called()
        assert "falló la validación" in result.lower()

    @pytest.mark.asyncio
    async def test_run_logs_generated_sql_before_execution(
        self, orchestrator, mock_adapter, patched_supabase, patched_schema
    ):
        """RED: Generated SQL is logged to the visible backend logger with request correlation."""
        with patch("app.orchestrators.sql_orchestrator.logger") as mock_logger:
            await orchestrator.run(
                user_text="what breweries do we have?",
                messages=[],
                adapter=mock_adapter,
                model="gpt-4o",
                api_key="secret",
                request_id="req123",
            )

        mock_logger.info.assert_any_call(
            "[req123] SQL: SELECT nombre_cerveceria FROM breweries"
        )

    @pytest.mark.asyncio
    async def test_run_executes_union_all_cross_table_search(
        self, orchestrator, patched_supabase, patched_schema
    ):
        """TRIANGULATE: UNION ALL across parallel tables passes validation and executes."""
        mock_adapter = MagicMock()

        async def union_stream(*args, **kwargs):
            yield (
                "SELECT nombre FROM public.breweries "
                "UNION ALL SELECT nombre FROM public.animal_feed_producers"
            )

        async def nl_stream(*args, **kwargs):
            yield "Found matches in both tables."

        mock_adapter.stream_chat.side_effect = [union_stream(), nl_stream()]

        result = await orchestrator.run(
            user_text="find Acme everywhere",
            messages=[],
            adapter=mock_adapter,
            model="gpt-4o",
            api_key="secret",
        )

        patched_supabase.execute_raw.assert_called_once()
        assert result == "Found matches in both tables."

    @pytest.mark.asyncio
    async def test_run_synthesis_receives_result_rows(
        self, orchestrator, mock_adapter, patched_supabase, patched_schema
    ):
        """RED: NL synthesis prompt contains the rows returned by execute_raw."""
        await orchestrator.run(
            user_text="what breweries do we have?",
            messages=[],
            adapter=mock_adapter,
            model="gpt-4o",
            api_key="secret",
        )

        assert mock_adapter.stream_chat.call_count == 2
        second_call_messages = mock_adapter.stream_chat.call_args_list[1].args[1]
        second_call_content = json.dumps(second_call_messages)
        assert "Test Brewery" in second_call_content

    @pytest.mark.asyncio
    async def test_run_returns_grounded_error_on_execution_failure(
        self, orchestrator, mock_adapter, patched_supabase, patched_schema
    ):
        """TRIANGULATE: DB execution failures return grounded errors, no synthesis."""
        patched_supabase.execute_raw.side_effect = RuntimeError("connection refused")

        result = await orchestrator.run(
            user_text="what breweries do we have?",
            messages=[],
            adapter=mock_adapter,
            model="gpt-4o",
            api_key="secret",
        )

        assert "execution failed" in result.lower() or "connection refused" in result.lower()

    @pytest.mark.asyncio
    async def test_run_rejects_select_star_union_before_execution(
        self, orchestrator, patched_supabase, patched_schema
    ):
        """TRIANGULATE: SELECT * UNION ALL is rejected before execute_raw is called."""
        mock_adapter = MagicMock()

        async def unsafe_union_stream(*args, **kwargs):
            yield (
                "SELECT * FROM public.breweries "
                "UNION ALL SELECT * FROM public.animal_feed_producers"
            )

        mock_adapter.stream_chat.side_effect = [unsafe_union_stream()]

        result = await orchestrator.run(
            user_text="find Acme everywhere",
            messages=[],
            adapter=mock_adapter,
            model="gpt-4o",
            api_key="secret",
        )

        patched_supabase.execute_raw.assert_not_called()
        assert "falló la validación" in result.lower()
        assert "select *" in result.lower()

    @pytest.mark.asyncio
    async def test_run_returns_empty_rows_answer(
        self, orchestrator, patched_supabase, patched_schema
    ):
        """TRIANGULATE: Empty DB results still trigger synthesis grounded in emptiness."""
        patched_supabase.execute_raw.return_value = []

        mock_adapter = MagicMock()

        async def sql_stream(*args, **kwargs):
            yield "SELECT nombre_cerveceria FROM breweries WHERE 1=0"

        async def nl_stream(*args, **kwargs):
            yield "No breweries were found."

        mock_adapter.stream_chat.side_effect = [sql_stream(), nl_stream()]

        result = await orchestrator.run(
            user_text="what breweries do we have?",
            messages=[],
            adapter=mock_adapter,
            model="gpt-4o",
            api_key="secret",
        )

        assert result == "No breweries were found."
