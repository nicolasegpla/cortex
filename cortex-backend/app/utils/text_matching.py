"""Accent-tolerant text matching utilities.

Provides helpers to normalize accents and build Supabase queries that match
regardless of accent differences (e.g. Medellin vs Medellín).
"""

import unicodedata


def unaccent_normalize(text: str) -> str:
    """Strip accents from text while preserving case and non-accented characters.

    Examples:
        >>> unaccent_normalize("Medellín")
        'Medellin'
        >>> unaccent_normalize("Bogotá")
        'Bogota'
        >>> unaccent_normalize("MÉDELLÍN")
        'MEDELLIN'
    """
    return "".join(
        c
        for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def build_accent_tolerant_query(
    query_builder, column: str, value: str | None, method: str = "eq"
):
    """Build an accent-tolerant filter on a Supabase query builder.

    For ``method="eq"`` (exact-ish matching), generates an ``.or_()`` with
    ``ilike`` for both the original value and its unaccented variant.
    For ``method="ilike"`` (partial matching), wraps both variants with ``%``.
    For ``method="cs"`` (array contains), passes through unchanged.

    Args:
        query_builder: Supabase query builder object.
        column: Database column name to filter.
        value: Filter value. If None, returns query_builder unchanged.
        method: One of "eq", "ilike", or "cs".

    Returns:
        The query_builder (or its chained result) with the filter applied.
    """
    if value is None:
        return query_builder

    unaccented = unaccent_normalize(value)

    if method == "eq":
        # Exact-ish: use ilike for case-insensitive, accent-tolerant matching
        if value == unaccented:
            return query_builder.ilike(column, value)
        return query_builder.or_(
            f"{column}.ilike.{value},{column}.ilike.{unaccented}"
        )

    if method == "ilike":
        # Partial: wildcards + both variants
        if value == unaccented:
            return query_builder.ilike(column, f"%{value}%")
        return query_builder.or_(
            f"{column}.ilike.%{value}%,{column}.ilike.%{unaccented}%"
        )

    if method == "cs":
        return query_builder.cs(column, [value])

    return query_builder
