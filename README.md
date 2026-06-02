# CORTEX

Reusable single-tenant foundation for client deployments. Phase 1 is focused on a real client slice: a frontend shell, a backend shell, strict TDD, and Supabase-ready integration points.

## Quick path

1. Start the stack with Docker: `docker compose up --build`
2. Run frontend tests: `cd cortex-frontend && pnpm test`
3. Run backend tests: `cd cortex-backend && pytest`
4. Implement each new feature with strict TDD: `RED -> GREEN -> REFACTOR`

## Current phase

Phase 1 intentionally includes only the reusable base needed to start the first client implementation.

### In scope now

- React 19 + Vite + TypeScript + SCSS frontend shell
- FastAPI modular monolith backend shell
- External Supabase integration points for auth, data, and storage
- Strict TDD setup for frontend and backend
- Docker development workflow with dedicated images

### Out of scope now

- Engram Cloud
- Dynamic table or form builder
- Production infrastructure hardening
- Full agent orchestration

## Architecture at a glance

| Area | Decision |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, SCSS, pnpm |
| Backend | FastAPI modular monolith |
| Data platform | Supabase Cloud |
| Package manager | pnpm for frontend |
| Testing rule | Strict TDD |
| Local orchestration | Docker Compose |

## Strict TDD

This project follows strict Test-Driven Development.

`RED -> GREEN -> REFACTOR`

Expected workflow:

1. Write the test first
2. Run the test and watch it fail
3. Implement the minimum code to make it pass
4. Refactor without breaking the tests

## Local setup

### Docker

```bash
docker compose up --build
```

The development stack uses dedicated images for frontend and backend. Dependencies are installed during image build, while source code is mounted for live reload.

### Frontend

```bash
cd cortex-frontend
pnpm install
pnpm run dev
```

### Backend

```bash
cd cortex-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Test commands

### Frontend

```bash
cd cortex-frontend
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm run build
```

### Backend

```bash
cd cortex-backend
pytest
pytest -v
pytest --tb=short
```

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

See the `.env.example` files inside `cortex-frontend/` and `cortex-backend/`.

## Repository map

```text
.
|-- cortex-backend/
|   |-- app/
|   |   |-- core/
|   |   |-- models/
|   |   |-- routers/
|   |   |-- schemas/
|   |   `-- services/
|   `-- tests/
|-- cortex-frontend/
|   `-- src/
|       |-- app/
|       |-- features/
|       |-- presentation/
|       `-- services/
|-- docker-compose.yml
`-- docs/
```

## Documentation

- `docs/README.md` — documentation map
- `docs/CORTEX.md` — current system overview and phase-1 architecture
- `docs/CORTEX_VISION.md` — product vision and positioning

## Next step

Define the first 4 client entities and implement them test-first.
