"""Tests for the SQL validator (app.validators.sql_validator)."""

import pytest


class TestSqlValidator:
    """Unit tests for SqlValidator.validate."""

    @pytest.fixture
    def validator(self):
        """Provide a fresh SqlValidator instance."""
        from app.validators.sql_validator import SqlValidator

        return SqlValidator()

    @pytest.mark.parametrize(
        "sql",
        [
            "SELECT * FROM breweries",
            "select id, name from breweries",
            "SELECT COUNT(*) FROM breweries",
            "  SELECT   name   FROM   breweries  ",
            "SELECT id FROM breweries WHERE name = 'Brewery'",
            (
                "SELECT nombre_cerveceria FROM public.breweries "
                "UNION ALL SELECT nombre FROM public.animal_feed_producers"
            ),
            (
                "SELECT nombre_cerveceria FROM public.breweries "
                "UNION SELECT nombre FROM public.animal_feed_producers"
            ),
        ],
    )
    def test_safe_select_statements_pass(self, validator, sql):
        """RED/TRIANGULATE: Read-only SELECT statements are accepted."""
        result = validator.validate(sql)

        assert result is None

    @pytest.mark.parametrize(
        "sql, expected_fragment",
        [
            ("INSERT INTO breweries (name) VALUES ('New')", "INSERT"),
            ("UPDATE breweries SET name = 'Old'", "UPDATE"),
            ("DELETE FROM breweries", "DELETE"),
            ("DROP TABLE breweries", "DROP"),
            ("ALTER TABLE breweries ADD COLUMN rating int", "ALTER"),
            ("TRUNCATE TABLE breweries", "TRUNCATE"),
            ("CREATE TABLE new_table (id int)", "CREATE"),
            ("GRANT SELECT ON breweries TO public", "GRANT"),
            ("REVOKE SELECT ON breweries FROM public", "REVOKE"),
        ],
    )
    def test_mutating_statements_blocked(self, validator, sql, expected_fragment):
        """TRIANGULATE: Mutating statements are rejected; UNION stays read-only safe."""
        result = validator.validate(sql)

        assert isinstance(result, str)
        assert expected_fragment.upper() in result.upper()

    def test_multi_statement_blocked(self, validator):
        """TRIANGULATE: Semicolon-separated statements are rejected."""
        sql = "SELECT * FROM breweries; DROP TABLE breweries"

        result = validator.validate(sql)

        assert isinstance(result, str)
        assert "sentencias" in result.lower()

    def test_comment_injection_blocked(self, validator):
        """TRIANGULATE: Inline comments are rejected."""
        sql = "SELECT * FROM breweries -- hide malicious code"

        result = validator.validate(sql)

        assert isinstance(result, str)
        assert "comentarios" in result.lower()

    def test_block_comment_injection_blocked(self, validator):
        """TRIANGULATE: Block comments are rejected."""
        sql = "SELECT * FROM breweries /* hide */ WHERE id = 1"

        result = validator.validate(sql)

        assert isinstance(result, str)
        assert "comentarios" in result.lower()

    def test_union_all_select_star_blocked(self, validator):
        """RED: SELECT * is not allowed in UNION ALL branches because heterogeneous schemas fail."""
        sql = (
            "SELECT * FROM public.breweries "
            "UNION ALL SELECT * FROM public.animal_feed_producers"
        )

        result = validator.validate(sql)

        assert isinstance(result, str)
        assert "SELECT *" in result or "select *" in result.lower()

    def test_union_select_star_blocked(self, validator):
        """TRIANGULATE: SELECT * is rejected in plain UNION branches too."""
        sql = (
            "SELECT * FROM public.breweries "
            "UNION SELECT * FROM public.animal_feed_producers"
        )

        result = validator.validate(sql)

        assert isinstance(result, str)
        assert "SELECT *" in result or "select *" in result.lower()

    def test_empty_sql_blocked(self, validator):
        """TRIANGULATE: Empty or whitespace-only input is rejected."""
        assert isinstance(validator.validate(""), str)
        assert isinstance(validator.validate("   "), str)
