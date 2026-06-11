"""SQL validation guardrails for the read-only chat orchestrator."""

import re


class SqlValidator:
    """Validate SQL statements before execution.

    Enforces a read-only, single-statement policy by rejecting mutating
    keywords, multi-statement payloads, and comment-based injection.
    """

    FORBIDDEN = {
        "INSERT",
        "UPDATE",
        "DELETE",
        "DROP",
        "ALTER",
        "TRUNCATE",
        "CREATE",
        "GRANT",
        "REVOKE",
    }

    _COMMENT_MARKERS = ("--", "/*", "*/")

    def validate(self, sql: str) -> str | None:
        """Validate a SQL statement.

        Args:
            sql: The SQL string to validate.

        Returns:
            ``None`` if the statement is safe, otherwise a human-readable
            error message explaining why it was rejected.
        """
        if not sql or not sql.strip():
            return "La consulta SQL está vacía"

        normalized = sql.strip()

        # Reject SQL comments before any other check to prevent injection.
        upper = normalized.upper()
        if any(marker in upper for marker in self._COMMENT_MARKERS):
            return "No se permiten comentarios en SQL"

        # Reject payloads that contain more than one statement.
        trimmed = normalized.rstrip().rstrip(";")
        if ";" in trimmed:
            return "No se permiten múltiples sentencias SQL"

        # Reject SELECT * in UNION/UNION ALL branches because heterogeneous
        # table schemas make SELECT * unions fail at execution time.
        upper = normalized.upper()
        if "UNION" in upper and re.search(r"\bSELECT\s+\*", normalized, re.IGNORECASE):
            return "No se permite SELECT * en consultas con UNION/UNION ALL; proyectá explícitamente las mismas columnas"

        # Reject forbidden keywords using word boundaries.
        pattern = re.compile(
            r"\b(" + "|".join(re.escape(kw) for kw in self.FORBIDDEN) + r")\b",
            re.IGNORECASE,
        )
        match = pattern.search(normalized)
        if match:
            return f"Se detectó una palabra clave SQL no permitida: {match.group(0).upper()}"

        return None
