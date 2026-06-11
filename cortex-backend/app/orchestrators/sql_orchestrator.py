"""SQL orchestrator for the backend-first read-only chat pipeline."""

import logging

from app.planner.engine import SqlPlanner
from app.services.schema_introspection import SchemaIntrospection
from app.services.supabase_service import SupabaseService
from app.synthesizer.engine import NlSynthesizer
from app.validators.sql_validator import SqlValidator

logger = logging.getLogger("uvicorn.error")


class SqlOrchestrator:
    """Orchestrate the read-only SQL pipeline.

    Pipeline:
        1. Fetch schema metadata from Supabase.
        2. Ask the LLM for one read-only SELECT.
        3. Validate the generated SQL.
        4. Execute the SQL against Supabase.
        5. Ask the LLM to synthesize a natural-language answer.

    Failures at steps 3-4 return grounded error strings without calling the
    synthesis LLM.
    """

    def __init__(self) -> None:
        self._validator = SqlValidator()
        self._schema_introspection = SchemaIntrospection()

    async def run(
        self,
        user_text: str,
        messages: list[dict],
        adapter,
        model: str,
        api_key: str,
        request_id: str | None = None,
    ) -> str:
        """Run the SQL pipeline and return a response string.

        Args:
            user_text: The current user question.
            messages: Conversation history.
            adapter: LLM provider adapter.
            model: Model identifier.
            api_key: Provider API key.
            request_id: Correlation id emitted by the chat router.

        Returns:
            A natural-language answer or a grounded error message.
        """
        supabase_service = SupabaseService()
        supabase = supabase_service.get_client()
        if not supabase:
            return "Falló la introspección del esquema: Supabase no está configurado."

        # Step 1: fetch schema deterministically from the backend.
        try:
            schema_context = self._schema_introspection.fetch(supabase_service)
        except Exception as exc:  # pragma: no cover - defensive guard
            return f"Falló la introspección del esquema: {exc}"

        if not schema_context:
            return "Falló la introspección del esquema: no hay metadatos del esquema disponibles."

        # Step 2: generate one read-only SELECT via the LLM.
        async def llm_call(messages: list[dict]) -> str:
            chunks: list[str] = []
            async for chunk in adapter.stream_chat(model, messages, api_key):
                chunks.append(chunk)
            return "".join(chunks)

        planner = SqlPlanner(llm_call=llm_call)
        try:
            generated_sql = await planner.generate(user_text, schema_context)
        except Exception as exc:
            return f"Falló la generación de SQL: {exc}"

        request_prefix = request_id or "sql"
        logger.info(f"[{request_prefix}] SQL: {generated_sql}")

        # Step 3: validate before execution.
        validation_error = self._validator.validate(generated_sql)
        if validation_error:
            return f"Falló la validación de SQL: {validation_error}"

        # Step 4: execute the validated SQL.
        try:
            result_rows = supabase_service.execute_raw(generated_sql)
        except Exception as exc:
            return f"Falló la ejecución de SQL: {exc}"

        # Step 5: synthesize natural language from the result rows.
        synthesizer = NlSynthesizer(llm_call=llm_call)
        try:
            return await synthesizer.synthesize(user_text, result_rows)
        except Exception as exc:
            return f"Falló la síntesis de la respuesta: {exc}"
