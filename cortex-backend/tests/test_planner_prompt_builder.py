"""Tests for planner prompt builder (app.planner.prompt_builder)."""

import pytest


class TestBuildSqlPrompt:
    """Unit tests for build_sql_prompt."""

    def test_includes_schema_context(self):
        """RED: SQL prompt includes the provided schema context."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt("how many breweries?", "Table: breweries\n  - name: text")

        assert "Table: breweries" in prompt
        assert "name: text" in prompt

    def test_includes_user_question(self):
        """TRIANGULATE: SQL prompt includes the user question."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt("how many breweries?", "Table: breweries")

        assert "how many breweries?" in prompt

    def test_requires_select_only(self):
        """TRIANGULATE: SQL prompt instructs the model to emit a SELECT."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt("test", "Table: breweries")

        assert "SELECT" in prompt
        assert "single SELECT" in prompt or "one SELECT" in prompt.lower()

    def test_forbids_mutating_keywords(self):
        """TRIANGULATE: SQL prompt forbids mutating keywords."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt("test", "Table: breweries")

        assert "INSERT" in prompt
        assert "DELETE" in prompt
        assert "DROP" in prompt

    def test_requires_fully_qualified_table_names(self):
        """TRIANGULATE: SQL prompt instructs the model to use public.schema qualification."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt("test", "Table: public.breweries")

        # The instruction must explicitly tell the LLM to qualify table names
        assert "public schema" in prompt.lower() or "fully qualified" in prompt.lower()
        assert "public.table_name" in prompt.lower() or "public." in prompt.lower()

    def test_instructs_cross_table_search_with_union_all(self):
        """RED: SQL prompt tells the model to search across all relevant public.* tables."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt(
            "find Acme",
            "Table: public.breweries\nTable: public.animal_feed_producers",
        )

        assert "all relevant public." in prompt.lower() or "across all relevant" in prompt.lower()
        assert "UNION ALL" in prompt
        assert "parallel" in prompt.lower() or "multiple" in prompt.lower()

    def test_forbids_union_without_all(self):
        """TRIANGULATE: UNION ALL is required; plain UNION is not allowed."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt("find Acme", "Table: public.breweries")

        assert "UNION without ALL" in prompt

    def test_union_all_requires_common_projection(self):
        """RED: Cross-table UNION ALL must project the same columns in the same order."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt(
            "find Acme",
            "Table: public.breweries\nTable: public.animal_feed_producers",
        )

        assert "same columns" in prompt.lower()
        assert "same order" in prompt.lower()
        assert "common projection" in prompt.lower()

    def test_union_all_forbids_select_star(self):
        """RED: SELECT * is not allowed in UNION ALL branches."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt(
            "find Acme",
            "Table: public.breweries\nTable: public.animal_feed_producers",
        )

        assert "SELECT *" in prompt
        assert "UNION ALL" in prompt
        assert "not allowed" in prompt.lower() or "do not use" in prompt.lower()

    def test_union_all_prefers_null_for_missing_columns(self):
        """TRIANGULATE: Prompt instructs NULL casting for missing common columns."""
        from app.planner.prompt_builder import build_sql_prompt

        prompt = build_sql_prompt(
            "find Acme",
            "Table: public.breweries\nTable: public.animal_feed_producers",
        )

        assert "NULL" in prompt
        assert "::text" in prompt or "cast" in prompt.lower()
        assert "missing" in prompt.lower() or "lacks" in prompt.lower()
