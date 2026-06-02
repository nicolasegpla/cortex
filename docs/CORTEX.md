# CORTEX

Current system overview for the implementation we are building right now.

## Quick path

1. Frontend and backend run as separate apps
2. Supabase is the operational data platform
3. Strict TDD is mandatory
4. Phase 1 is focused on the first client slice, not the full long-term vision

## What CORTEX is in phase 1

CORTEX is a reusable single-tenant application base that will be used to deliver client-specific business flows without rebuilding the platform from scratch every time.

In this phase, the goal is not to deliver the entire long-term agent platform. The goal is to establish a clean technical base for a real client implementation.

## Phase-1 technical shape

| Layer | Current decision |
| --- | --- |
| Channel layer | Web first; Telegram later |
| Frontend | React 19 + Vite + TypeScript + SCSS |
| Backend | FastAPI modular monolith |
| Data layer | Supabase Cloud |
| Memory | Not part of the first implementation slice |
| Package manager | pnpm |
| Testing | Strict TDD |
| Local orchestration | Docker Compose |

## Phase-1 scope

### Included

- frontend shell with dashboard and login page
- backend shell with health, auth placeholder, and entity placeholder routes
- Supabase-ready configuration
- Docker-based local workflow
- frontend and backend test foundations

### Deferred

- Engram Cloud
- memory synchronization strategy
- dynamic entity builder
- advanced agent orchestration
- production hosting hardening

## Technical boundaries

### Supabase

Supabase is the source of truth for:

- operational tables
- auth
- file storage
- future vectorized document storage

### Backend

The backend is responsible for:

- API routing
- auth flow integration
- entity CRUD orchestration
- future document ingestion flow
- future AI-provider orchestration

### Frontend

The frontend is responsible for:

- user-facing forms and views
- dashboard and login experience
- API consumption
- future document and chat interfaces

## Development rules

### Rule 1

Every new feature starts with a failing test.

### Rule 2

Do not introduce platform-level abstractions before the first client slice proves the need.

### Rule 3

Prefer reusable patterns, but avoid speculative overengineering.

## Next step

Use this foundation to implement the first 4 client entities and their 4 forms with test-first delivery.
