"""Chat streaming router — SSE endpoint for LLM provider chat."""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.adapters import registry
from app.core.config import get_settings
from app.core.security import User, get_current_user
from app.schemas.chat import ChatRequest, ToolCallResult
from app.services.brewery_service import BreweryService
from app.services.encryption_service import EncryptionService
from app.services.provider_credential_service import ProviderCredentialService
from app.services.supabase_service import SupabaseService
from app.tools.breweries import register_brewery_tools
from app.tools.registry import ToolRegistry

router = APIRouter(prefix="/chat", tags=["chat"])


def _stream_sse(event: str, data: str) -> str:
    """Format a single SSE event."""
    return f"event: {event}\ndata: {data}\n\n"


def get_credential_service() -> ProviderCredentialService:
    """Factory for ProviderCredentialService with configured dependencies."""
    settings = get_settings()
    supabase = SupabaseService(settings).get_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured",
        )
    encryption = EncryptionService()
    return ProviderCredentialService(supabase=supabase, encryption=encryption)


def get_brewery_service() -> BreweryService:
    """Factory for BreweryService with configured Supabase client."""
    settings = get_settings()
    supabase = SupabaseService(settings).get_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured",
        )
    return BreweryService(supabase)


def get_tool_registry(brewery_service: BreweryService = Depends(get_brewery_service)) -> ToolRegistry:
    """Factory for ToolRegistry with brewery tools registered."""
    registry = ToolRegistry()
    register_brewery_tools(registry, brewery_service)
    return registry


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    credential_service: ProviderCredentialService = Depends(get_credential_service),
    tool_registry: ToolRegistry = Depends(get_tool_registry),
):
    """Stream chat completions via SSE.

    Accepts a chat request, resolves the provider adapter, decrypts the user's
    credential, and streams back text deltas as Server-Sent Events.

    When ``enable_tools`` is True and the adapter supports tool calling, the
    server executes approved brewery tools server-side and re-streams the
    final grounded answer.

    Events:
        - event: delta  — text chunk from the provider
        - event: done   — streaming complete
        - event: error  — an error occurred
    """
    # Resolve and decrypt the user's credential for this provider
    api_key = credential_service.get_decrypted_key(
        str(current_user.id), request.provider
    )
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No credential found for provider '{request.provider}'. Please add one in settings.",
        )

    # Resolve provider adapter via registry
    try:
        adapter = registry.get_adapter(request.provider)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Convert Pydantic messages to dicts for the adapter
    messages = [msg.model_dump() for msg in request.messages]

    # Determine whether to use the tool-enabled streaming path
    use_tools = request.enable_tools and adapter.supports_tools()

    async def event_generator():
        try:
            if use_tools:
                tools = tool_registry.list_definitions()

                # First stream: model may return text or request tool calls
                tool_calls: list[ToolCallResult] = []
                async for chunk in adapter.stream_chat_with_tools(
                    request.model, messages, tools, api_key
                ):
                    if isinstance(chunk, ToolCallResult):
                        tool_calls.append(chunk)
                    else:
                        yield _stream_sse("delta", chunk)

                # If the model requested tool calls, execute them and re-stream
                if tool_calls:
                    # Append assistant message with tool_calls
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": tc.tool_call_id,
                                "type": "function",
                                "function": {
                                    "name": tc.name,
                                    "arguments": json.dumps(tc.arguments),
                                },
                            }
                            for tc in tool_calls
                        ],
                    })

                    # Execute each tool and append tool result messages
                    for tc in tool_calls:
                        result = tool_registry.execute(tc.name, tc.arguments)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.tool_call_id,
                            "content": result,
                        })

                    # Second stream: final answer grounded in tool results
                    async for chunk in adapter.stream_chat_with_tools(
                        request.model, messages, tools, api_key
                    ):
                        yield _stream_sse("delta", chunk)
            else:
                async for chunk in adapter.stream_chat(request.model, messages, api_key):
                    yield _stream_sse("delta", chunk)

            yield _stream_sse("done", "")
        except Exception as exc:
            yield _stream_sse("error", str(exc))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )
