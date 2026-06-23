# CORTEX v0.2.0

Reusable single-tenant foundation for client deployments. This release documents the state of the codebase as it works today.

## Quick start

1. Start the stack with Docker: `docker compose up --build`
2. Run frontend tests: `cd cortex-frontend && pnpm test`
3. Run backend tests: `cd cortex-backend && pytest`

## What works in v0.2.0

### Frontend

- React 19 + Vite + TypeScript + SCSS, managed with pnpm.
- Auth shell: login, session restore, logout, role-aware routing (`super_admin` / `operativo`).
- Chat interface with streaming answers via Server-Sent Events, Markdown rendering, and model selector.
- Configuration screen for LLM provider API keys (OpenAI, Anthropic, Google Gemini, DeepSeek).
- User management screen (super_admin only) to create and delete managed users.
- Database hub and full CRUD lists/forms for four entity tables: breweries, coffee farms, wine producers, and animal feed producers.
- Phase 1 PWA support: installable app manifest, service worker for same-origin static asset caching, native install prompt on supported browsers, and manual install guidance for iPhone Safari.

### Backend

- FastAPI modular monolith with CORS configured for the frontend origin.
- Supabase integration: Auth JWT verification, service-role data access, and a dedicated RPC for schema introspection.
- Auth endpoints: `/auth/login`, `/auth/me`, `/auth/logout`.
- Admin user endpoints: `/admin/users` (create, list, delete) with a guard against deleting the last super_admin.
- Four entity routers with full CRUD: `/breweries`, `/coffee-farms`, `/animal-feed-producers`, `/wine-producers`.
- Chat pipeline: `/chat/stream` orchestrates a read-only SQL flow (schema introspection → LLM-generated SELECT → SQL validation → execution → natural-language synthesis) and streams the result via SSE.
- Provider credential router: `/provider-credentials` stores API keys encrypted at rest and supports a test endpoint.
- LLM adapter registry supporting OpenAI, Anthropic, Google Gemini, and DeepSeek.
- Generic `/entities` router is currently a placeholder (returns HTTP 501).

### Infrastructure

- Docker Compose dev stack with dedicated frontend and backend images.
- Source code is mounted for live reload; dependencies are installed during the image build.
- Supabase Cloud is the operational data platform for auth, operational tables, and storage.

## Architecture at a glance

| Area | Decision |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, SCSS, pnpm, Zustand, React Router |
| Backend | FastAPI modular monolith, Python 3.12 |
| Data platform | Supabase Cloud (PostgreSQL + Auth + storage) |
| Chat DB access | Backend-first read-only SQL orchestration with schema introspection, SQL validation, and bounded result sets |
| LLM providers | OpenAI, Anthropic, Google Gemini, DeepSeek via adapter registry |
| Auth | Supabase Auth JWT, Bearer tokens, role-based access control |
| Encryption | Fernet encryption for stored provider API keys |
| Package manager | pnpm for frontend, pip for backend |
| Testing | Vitest + Testing Library (frontend), pytest (backend) |
| Local orchestration | Docker Compose |

## Repository map

```text
.
├── cortex-backend/
│   ├── app/
│   │   ├── adapters/          # LLM provider adapters
│   │   ├── core/              # Config, security, dependencies
│   │   ├── orchestrators/     # Chat SQL orchestrator
│   │   ├── planner/           # SQL generation from schema + question
│   │   ├── routers/           # API routes
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── services/          # Business logic and Supabase access
│   │   ├── synthesizer/       # Natural-language answer synthesis
│   │   ├── utils/             # Text normalization and matching helpers
│   │   └── validators/        # SQL whitelist validator
│   ├── sql/                   # DDL migration scripts for client tables
│   ├── tests/                 # pytest suite
│   ├── Dockerfile
│   └── requirements.txt
├── cortex-frontend/
│   ├── src/
│   │   ├── app/               # Router
│   │   ├── features/          # Domain features (auth, chat, entity CRUD)
│   │   ├── hooks/             # Shared hooks
│   │   ├── presentation/      # Pages, layouts, design-system components, styles
│   │   ├── services/          # API and Supabase clients
│   │   ├── shared/            # Utility modules
│   │   └── store/             # Shared Zustand stores
│   ├── tests/                 # Vitest + Testing Library suite
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── docs/
│   ├── CORTEX.md              # System overview
│   ├── chat-db-readonly-access.md  # Chat DB access guardrails
│   └── CORTEX_VISION.md       # Product vision
└── VERSION                    # Single source of truth: 0.2.0
```

## Commands

### Frontend

```bash
cd cortex-frontend
pnpm install
pnpm run dev
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm run build
```

### Backend

```bash
cd cortex-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest
pytest -v
pytest --tb=short
```

### Docker

```bash
docker compose up --build
```

To test from a phone on the same LAN, update both `.env` files with the host
machine's LAN IP instead of `localhost`, then restart the stack:

- `cortex-frontend/.env`: `VITE_API_BASE_URL=http://<lan-ip>:8000`
- `cortex-backend/.env`: `CORS_ORIGINS=http://<lan-ip>:5173,http://localhost:5173`

Leave `VITE_DEV_HOST` empty unless HMR fails from the mobile browser.

## Environment variables

### Frontend

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Backend

- `APP_ENV`
- `CORS_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_ANON_KEY`
- `ENCRYPTION_KEY`

See the `.env.example` files inside `cortex-frontend/` and `cortex-backend/`.

## Documentation

- `docs/CORTEX.md` — current system overview
- `docs/chat-db-readonly-access.md` — chat database access architecture and read-only guardrails
- `docs/CORTEX_VISION.md` — product vision and single-tenant model
- `docs/DEPLOYMENT.md` — practical deployment guide for Railway, Netlify, and Supabase

## Next steps

- Harden the chat orchestrator by moving from LLM-generated SQL to backend-assembled deterministic queries for common entity lookups.
- Add backend-built global search across the four entity tables with a fixed cross-table result contract.
- Flesh out the generic `/entities` router or remove it once the entity-specific routers prove sufficient.
- Add production infrastructure hardening, observability, and deployment automation.
- Introduce document ingestion and vector search when a client needs it.

## Version

This release is `v0.2.0`. The `VERSION` file at the repository root is the source of truth.
