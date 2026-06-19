# CORTEX PWA Plan

This document captures the recommended phased approach for turning CORTEX into a Progressive Web App in a future iteration.

## Goal

Improve daily operational usability without overcommitting to full offline behavior too early.

## Recommended position

- Start with a lightweight PWA.
- Focus first on installability, static asset caching, and mobile UX.
- Do **not** promise full offline CRUD or offline chat unless the business explicitly needs it.

## Phase 1 — Lightweight PWA

Scope:

- Web app manifest
- App icons
- Install prompt support
- Basic service worker
- Static asset caching
- Faster repeat loads

Why:

- Low implementation risk
- Good UX improvement for frequent users
- Better mobile and desktop “installed app” experience

Out of scope:

- Offline write operations
- Background sync queues
- Offline chat behavior

## Phase 2 — Resilient connected experience

Scope:

- Online/offline status UI
- Controlled caching for selected read-only views
- Reconnection messaging
- Safer refresh/update flow for cached frontend assets

Why:

- Improves real-world reliability for unstable connections
- Helps users understand when the app is disconnected

Risks:

- Serving stale data
- Cache invalidation complexity
- Harder debugging if service worker rules are too aggressive

## Phase 3 — Business-driven offline workflows

Scope:

- Offline-first read flows where justified
- Deferred action queue for selected mutations
- Sync/retry conflict handling
- Explicit user-facing sync state

Why:

- Only worth the complexity if field users truly need offline work

Risks:

- Conflict resolution complexity
- Auth/session edge cases
- Higher maintenance cost

## Guidance for future implementation

- Prefer a minimal PWA first.
- Treat service worker caching as infrastructure, not magic.
- Never cache authenticated API responses broadly without a clear invalidation strategy.
- Validate the business need before implementing offline writes.

## Recommended next step

When the product is more stable, implement **Phase 1 only** as the first PWA milestone.
