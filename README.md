# CORTEX Phase 1 Bootstrap

## Overview

This repository contains the phase-1 bootstrap for CORTEX, a reusable single-tenant base for client deployments.

Phase 1 focuses on a minimal but production-minded foundation:

- `cortex-frontend/`: React 19 + Vite + TypeScript + SCSS application shell
- `cortex-backend/`: FastAPI modular monolith with placeholder routers and services
- External Supabase integration for auth, operational data, and storage

Engram is part of the broader product vision, but it is intentionally out of scope for this first implementation slice.

## Architecture

### Frontend

- React 19
- Vite
- TypeScript
- React Router DOM
- Zustand
- SCSS design tokens and layout primitives

### Backend

- FastAPI
- Pydantic Settings
- Lazy Supabase client initialization
- Modular monolith structure with routers, schemas, services, and core configuration

### Data Platform

- Supabase is external to this repository
- No local database container is included in `docker-compose.yml`
- Backend startup does not require a live Supabase connection

## Current Scope

This bootstrap prepares the codebase for the first real client implementation.

Included now:

- frontend routing for dashboard and login
- reusable button and input atoms
- shared SCSS tokens, reset, base styles, and mixins
- backend health endpoint
- backend placeholder auth and entity modules
- backend test setup with pytest

Planned next:

- 4 operational tables
- 4 forms
- real Supabase auth flows
- entity CRUD implementation

## Local Setup

### Frontend

```bash
cd cortex-frontend
npm install
npm run dev
```

### Backend

```bash
cd cortex-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Compose

```bash
docker compose up --build
```

## Environment Files

Frontend variables:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend variables:

- `APP_ENV`
- `CORS_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Project Structure

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
`-- docker-compose.yml
```
