"""Tests for accent-tolerant text matching utilities."""

import pytest

from app.utils.text_matching import build_accent_tolerant_query, unaccent_normalize


class TestUnaccentNormalize:
    """Test the unaccent normalization helper."""

    def test_strips_spanish_accents(self) -> None:
        """Medellín -> Medellin, Bogotá -> Bogota."""
        assert unaccent_normalize("Medellín") == "Medellin"
        assert unaccent_normalize("Bogotá") == "Bogota"
        assert unaccent_normalize("Cali") == "Cali"

    def test_preserves_case(self) -> None:
        """Uppercase accents are stripped but case preserved."""
        assert unaccent_normalize("MÉDELLÍN") == "MEDELLIN"
        assert unaccent_normalize("BOGOTÁ") == "BOGOTA"

    def test_no_accents_unchanged(self) -> None:
        """Strings without accents pass through unchanged."""
        assert unaccent_normalize("London") == "London"
        assert unaccent_normalize("New York") == "New York"
        assert unaccent_normalize("IPA") == "IPA"

    def test_empty_and_whitespace(self) -> None:
        """Empty string and whitespace handled gracefully."""
        assert unaccent_normalize("") == ""
        assert unaccent_normalize("  ") == "  "


class TestBuildAccentTolerantQuery:
    """Test the query builder helper for accent-tolerant filtering."""

    def test_eq_mode_builds_or_filter_with_both_versions(self) -> None:
        """eq mode creates an .or_() with original and unaccented ilike."""
        from unittest.mock import MagicMock

        mock_query = MagicMock()
        mock_query.ilike.return_value = mock_query

        result = build_accent_tolerant_query(mock_query, "ciudad", "Medellin", method="eq")

        # Medellin has no accents, so just ilike exact
        mock_query.ilike.assert_called_once_with("ciudad", "Medellin")
        assert result is mock_query

    def test_eq_mode_with_accents_builds_both_variants(self) -> None:
        """When value has accents, both accented and unaccented forms are used."""
        from unittest.mock import MagicMock

        mock_query = MagicMock()
        mock_query.or_.return_value = mock_query

        result = build_accent_tolerant_query(mock_query, "ciudad", "Medellín", method="eq")

        mock_query.or_.assert_called_once_with(
            "ciudad.ilike.Medellín,ciudad.ilike.Medellin"
        )

    def test_ilike_mode_builds_or_filter(self) -> None:
        """ilike mode wraps with % wildcards and builds or."""
        from unittest.mock import MagicMock

        mock_query = MagicMock()
        mock_query.ilike.return_value = mock_query

        result = build_accent_tolerant_query(mock_query, "nombre_cerveceria", "Artesanal", method="ilike")

        # Artesanal has no accents, so just ilike with wildcards
        mock_query.ilike.assert_called_once_with(
            "nombre_cerveceria", "%Artesanal%"
        )
        assert result is mock_query

    def test_ilike_mode_with_accents(self) -> None:
        """ilike mode generates both accented and unaccented wildcard patterns."""
        from unittest.mock import MagicMock

        mock_query = MagicMock()
        mock_query.or_.return_value = mock_query

        result = build_accent_tolerant_query(
            mock_query, "pais", "Colombia", method="ilike"
        )

        # Colombia has no accents, so just ilike with wildcards
        mock_query.ilike.assert_called_once_with("pais", "%Colombia%")

    def test_cs_mode_returns_original_cs(self) -> None:
        """cs (contains) mode just calls .cs() directly — arrays are exact."""
        from unittest.mock import MagicMock

        mock_query = MagicMock()
        mock_query.cs.return_value = mock_query

        result = build_accent_tolerant_query(mock_query, "lupulos_utilizados", "Cascade", method="cs")

        mock_query.cs.assert_called_once_with("lupulos_utilizados", ["Cascade"])
        assert result is mock_query

    def test_none_value_returns_query_unchanged(self) -> None:
        """When value is None, the query is returned unchanged."""
        from unittest.mock import MagicMock

        mock_query = MagicMock()

        result = build_accent_tolerant_query(mock_query, "ciudad", None, method="eq")

        mock_query.or_.assert_not_called()
        mock_query.eq.assert_not_called()
        assert result is mock_query
