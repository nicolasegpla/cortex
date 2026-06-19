# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [0.1.0] - 2026-06-19

### Added

- Initial documented release for the current working Cortex codebase.
- React 19 frontend with authentication shell, role-aware routing, and dark mode support.
- Streaming chat UI with Markdown rendering and provider/model selection.
- CRUD flows in the frontend for breweries, coffee farms, wine producers, and animal feed producers.
- FastAPI backend with Supabase Auth integration and role-based access control.
- Admin user management endpoints and UI for managed users.
- Read-only SQL chat orchestration pipeline exposed through `/chat/stream`.
- LLM provider adapter registry for OpenAI, Anthropic, Google Gemini, and DeepSeek.
- Encrypted provider credential storage and provider test endpoint.
- Docker Compose local development stack for frontend and backend.
- Frontend and backend automated test suites.
- Repository-level `VERSION` file as the source of truth for project versioning.

### Notes

- This release documents the real implemented state of the project as of `v0.1.0`.
- The generic `/entities` backend route remains a placeholder and returns HTTP 501.
