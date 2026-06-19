# CORTEX v0.1.0

Current system overview. This document reflects the state of the codebase as of release `v0.1.0`.

## Quick path

1. The frontend and backend run as separate Docker services.
2. Supabase Cloud is the operational data platform for auth and data.
3. The chat path is backend-first, read-only, and SQL-backed.
4. Four entity tables are fully wired: breweries, coffee farms, wine producers, and animal feed producers.

## What CORTEX is today

CORTEX is a reusable single-tenant application base for delivering client-specific business flows. In `v0.1.0` it provides a working web shell, a working backend, Supabase-backed auth and data, and a chat interface that can answer questions over the existing entity tables without exposing unrestricted database access.

## Technical shape

| Layer | Current decision |
| --- | --- |
| Channel | Web first |
| Frontend | React 19 + Vite + TypeScript + SCSS |
| State management | Zustand |
| Routing | React Router |
| Backend | FastAPI modular monolith, Python 3.12 |
| Data layer | Supabase Cloud (PostgreSQL + Auth) |
| Chat pipeline | Backend-first read-only SQL orchestration |
| LLM providers | OpenAI, Anthropic, Google Gemini, DeepSeek |
| Encryption | Fernet for stored provider API keys |
| Package manager | pnpm (frontend), pip (backend) |
| Testing | Vitest + Testing Library (frontend), pytest (backend) |
| Local orchestration | Docker Compose |

## Scope in v0.1.0

### Included

- Supabase Auth login/logout/me with JWT validation and role extraction (`super_admin`, `operativo`).
- Role-based access control on backend routes and frontend navigation.
- Super_admin user management: create, list, and delete managed users with guards against deleting the last super_admin.
- Four entity domains with full backend CRUD and frontend list/form/detail views:
  - Breweries
  - Coffee farms
  - Wine producers
  - Animal feed producers
- Chat interface with SSE streaming, Markdown rendering, and provider/model selection.
- Backend chat orchestrator that introspects the Supabase schema, asks an LLM for a read-only SELECT, validates the SQL, executes it, and synthesizes a natural-language answer.
- Encrypted storage of per-user LLM provider API keys with a test endpoint.
- Adapter registry for OpenAI, Anthropic, Google Gemini, and DeepSeek.
- Docker-based local workflow with dedicated frontend and backend images.
- Test foundations on both sides.

### Deferred

- Engram Cloud integration.
- Document ingestion and vector search.
- Dynamic table or form builder.
- Telegram or additional channels.
- Production hosting hardening.
- Advanced agent orchestration beyond the read-only SQL chat path.

## Technical boundaries

### Supabase

Supabase is the source of truth for:

- Operational entity tables.
- Auth users, sessions, and JWTs.
- File storage (prepared, not yet used in v0.1.0).
- Schema introspection via a dedicated RPC used by the chat orchestrator.

### Backend

The backend owns:

- API routing and CORS.
- Supabase Auth flow integration.
- Entity CRUD orchestration.
- Server-side chat SQL generation, validation, execution, and response synthesis.
- Encryption of provider API keys before storage.
- Role enforcement for super_admin vs operativo.

### Chat database access

Chat-to-database access is backend-first and read-only.

- The LLM receives schema metadata from a backend RPC, not direct database access.
- Generated SQL is validated against a whitelist before execution.
- Only `SELECT` statements are allowed; mutating statements are rejected.
- Unrestricted SQL from the model is forbidden.

See `chat-db-readonly-access.md` for the detailed architecture and extension checklist.

### Frontend

The frontend owns:

- Auth shell, login page, and session recovery.
- Chat page with streaming messages and model selection.
- Configuration page for provider credentials and user management.
- Database hub and CRUD views for the four entity domains.
- API consumption with automatic logout on 401.

## Development rules

1. Every new feature starts with a failing test.
2. Do not introduce platform-level abstractions before the first client slice proves the need.
3. Prefer reusable patterns, but avoid speculative overengineering.

## Repository map

```text
cortex-backend/
  app/
    adapters/          # LLM provider adapters
    core/              # Config, security, dependencies
    orchestrators/     # SqlOrchestrator
    planner/           # SQL generation from schema + question
    routers/           # API routes
    schemas/           # Pydantic models
    services/          # Business logic and Supabase access
    synthesizer/       # Natural-language synthesis
    utils/             # Text helpers
    validators/        # SQL whitelist validator
  sql/                 # DDL scripts
  tests/               # pytest suite

cortex-frontend/
  src/
    app/               # Router
    features/          # Domain features
    hooks/             # Shared hooks
    presentation/      # Pages, layouts, components, styles
    services/          # API and Supabase clients
    shared/            # Utilities
    store/             # Shared Zustand stores
  tests/               # Vitest suite
```

## Documentation

- `README.md` — setup, commands, and release notes
- `chat-db-readonly-access.md` — chat DB access architecture and read-only guardrails
- `CORTEX_VISION.md` — product vision and single-tenant model

## Next step

Harden the chat path by moving from LLM-generated SQL to backend-assembled deterministic queries for common entity lookups, then add a cross-table global search with a fixed result contract.
