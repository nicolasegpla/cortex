# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [0.3.0] - 2026-06-24

### Added

- Admin-only user invite provisioning flow, allowing administrators to create accounts and send invitations to new users.
- Supabase `generate_link` invite integration for secure, tokenized invitation URLs.
- Resend-controlled invite email delivery so invitation emails are sent through the project's configured email provider.
- Branded invite email template matching the Cortex identity.
- Invite activation page where invited users can accept their invitation and set up their password.
- Password setup UX improvements for clearer confirmation and validation feedback.
- Refined role selection during user provisioning and activation.

### Changed

- Deployment documentation and environment-variable examples updated to support the invite flow and email provider configuration.
- `VERSION` file updated to `0.3.0`.

## [0.2.0] - 2026-06-23

### Added

- Phase 1 PWA frontend support with `manifest.json`, install icons, Apple touch icon, and a basic service worker for same-origin static asset caching.
- Browser-aware install UX in the authenticated app shell, including a native install CTA for supported browsers and a manual install hint for iPhone Safari.

### Changed

- `docs/PWA_PLAN.md` now marks Phase 1 as implemented and positions Phase 2 as the next product decision point.
- `VERSION` file updated to `0.2.0`.

## [0.1.2] - 2026-06-19

### Added

- Future-facing phased PWA plan at `docs/PWA_PLAN.md` to guide later installability, resilient connected behavior, and business-driven offline work.

### Fixed

- Mobile layout height handling now uses dynamic viewport units and safe-area-aware spacing to behave better across iPhone/Android browser chrome variations.
- Form controls now use 16px text on mobile, preventing Safari on iPhone from auto-zooming when inputs, selects, or textareas receive focus.

### Changed

- Local Docker/LAN development now relies on env-driven frontend/backend URLs instead of hardcoded `localhost` overrides, making same-network phone testing easier.
- `README.md`, frontend/backend `.env.example`, and Vite dev config now document the LAN testing flow.
- `VERSION` file updated to `0.1.2`.

## [0.1.1] - 2026-06-19

### Added

- Railway backend deployment configuration for the monorepo (`railway.json` and `cortex-backend/Dockerfile.railway`).
- Netlify frontend deployment configuration for the monorepo (`cortex-frontend/netlify.toml`).
- Practical deployment guide at `docs/DEPLOYMENT.md` covering Railway backend, Netlify frontend, Supabase integrations, environment variables, and troubleshooting.
- `docs/README.md` now references the deployment guide.
- Root `README.md` documentation section now mentions the deployment guide.

### Fixed

- Breweries router now supports both `/breweries` and `/breweries/` paths directly, eliminating the production redirect that caused mixed-content failures in hosted environments.

### Changed

- `VERSION` file updated to `0.1.1`.

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
