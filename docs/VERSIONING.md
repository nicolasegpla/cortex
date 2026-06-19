# Versioning and Release Process

CORTEX uses a single source of truth for its version number, a human-readable changelog, and lightweight GitHub releases. This document describes how each artifact is used, how to choose the next version, and the exact steps to publish a release.

## Quick path

1. Update `VERSION` with the new `MAJOR.MINOR.PATCH` number.
2. Add a dated section to `CHANGELOG.md` under the new version.
3. Commit with message `release: vX.Y.Z`.
4. Tag the commit with `vX.Y.Z` and push the tag.
5. Create a GitHub Release from the tag, pasting the changelog section into the notes.

## What each artifact means

| Artifact | Purpose | Source of truth? |
|----------|---------|------------------|
| `VERSION` | The current project version as a plain string. | Yes — this file is the canonical version number. |
| `CHANGELOG.md` | Human-readable history of notable changes per release. | Yes — every release must have an entry here. |
| Git tag `vX.Y.Z` | Immutable pointer to the exact commit that was released. | No — it references the release commit. |
| GitHub Release | Published distribution point tied to the tag, with release notes. | No — it mirrors the changelog entry. |

## Versioning convention

CORTEX follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- `MAJOR` — incompatible changes that break consumers, APIs, or supported workflows.
- `MINOR` — new functionality added in a backward-compatible way.
- `PATCH` — backward-compatible bug fixes, corrections, or small improvements.

## How to choose the next version

| Bump | When to use it | CORTEX examples |
|------|----------------|-----------------|
| `PATCH` | Bug fix, correction, or small compatible improvement. | Fix auth redirect loop; correct a chat SQL guardrail; fix Docker Compose healthcheck. |
| `MINOR` | New backward-compatible feature or significant UX improvement. | Add a new LLM provider adapter; add role-based UI sections; add batch import for producers. |
| `MAJOR` | Breaking change that requires consumer action or changes the public API contract. | Rename a public API route; remove an authentication method; change the chat message schema. |

When in doubt, prefer the smaller bump. A `MAJOR` release should be a deliberate decision.

## Operational rules

- `VERSION` is the source of truth for the current version number.
- Every release must have an entry in `CHANGELOG.md`.
- Every release must have a release commit, a Git tag `vX.Y.Z`, a pushed tag, and a GitHub Release.
- Do not create a tag from a dirty working tree. Commit or stash unrelated changes first.
- Do not publish a release if the changelog entry is missing or inconsistent with `VERSION`.
- Release tags use the `v` prefix: `v0.1.0`, `v0.2.0`, `v1.0.0`.

## Release workflow

Run these steps from a clean working tree on the branch that represents the release state (usually `main`):

1. **Decide the version** using the table above.
2. **Update `VERSION`**:
   ```text
   0.2.0
   ```
3. **Update `CHANGELOG.md`**:
   - Add a new `## [0.2.0] - YYYY-MM-DD` section under the header.
   - Group changes under `Added`, `Changed`, `Fixed`, or `Removed` as needed.
   - Keep entries concise and user-facing.
4. **Review the diff**:
   ```bash
   git diff VERSION CHANGELOG.md
   ```
5. **Commit the release**:
   ```bash
   git add VERSION CHANGELOG.md
   git commit -m "release: v0.2.0"
   ```
6. **Tag the commit**:
   ```bash
   git tag -a v0.2.0 -m "release: v0.2.0"
   ```
7. **Push the commit and tag**:
   ```bash
   git push origin main
   git push origin v0.2.0
   ```
8. **Create the GitHub Release**:
   - Use the tag `v0.2.0`.
   - Title: `v0.2.0`.
   - Copy the changelog section for this version into the release notes.

## Release checklist

- [ ] `VERSION` contains the intended `MAJOR.MINOR.PATCH` value.
- [ ] `CHANGELOG.md` has a dated section for the new version.
- [ ] Working tree is clean before tagging.
- [ ] Release commit is pushed.
- [ ] Tag `vX.Y.Z` is pushed.
- [ ] GitHub Release is published with the changelog section.

## Naming conventions

- Version file: plain `X.Y.Z`, no prefix.
- Git tags and GitHub Releases: `vX.Y.Z`.
- Release commit message: `release: vX.Y.Z`.
- Changelog header: `## [X.Y.Z] - YYYY-MM-DD`.

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
