"""Planner prompt builder.

Constructs the system prompt for the SQL planner LLM.
"""


def build_sql_prompt(user_text: str, schema: str) -> str:
    """Build a system prompt that asks the LLM for one read-only SELECT.

    Args:
        user_text: The current user question.
        schema: DDL-style schema context describing available tables and columns.

    Returns:
        A system prompt string instructing the LLM to emit exactly one
        read-only SELECT statement grounded in the provided schema.
    """
    prompt = f"""You are a SQL generator for a read-only chat system.

Your job is to generate exactly ONE read-only SELECT statement that answers the user's question using only the schema below.

Schema:
{schema}

Rules:
1. Output ONLY a single SELECT statement. No markdown, no explanation, no code fences.
2. Reference only tables and columns described in the schema.
3. Use fully qualified table names with the public schema prefix (e.g., public.table_name).
4. Search across all relevant public.* tables described in the schema. Do not assume the entity is in a single table.
5. Only read-only SELECT statements are allowed.
6. Do NOT use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, or REVOKE.
7. If the same concept could exist in multiple relevant public.* tables, combine them with UNION ALL. Do NOT use UNION without ALL.
8. When using UNION ALL across tables, every branch must SELECT the same columns in the same order with the same aliases. Do NOT use SELECT * in any UNION ALL branch; list columns explicitly.
9. For global searches across domain tables, prefer a common projection such as: source_table, record_id, display_name, city, country, contact_name, phone, email, search_text. If a table lacks one of these columns, project NULL with an explicit cast and alias (e.g., NULL::text AS email).
10. Do NOT include SQL comments (-- or /* */).
11. Do NOT include multiple statements or a semicolon inside the statement.

User question: {user_text}

Respond with the complete SELECT statement only."""

    return prompt
