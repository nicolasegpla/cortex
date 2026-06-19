# Spec: reorganizar-vista-chat-selector-modelos

Concatenated spec artifact for this change. Per-domain deltas live under `specs/{domain}/spec.md`.

---

# Domain: model-selector-inline (NEW)

## Purpose

Inline, ChatGPT-style model selector rendered as a badge in the chat input bar. The user selects a model; the provider is derived from it. No provider selector and no intelligence-level selector are included.

## Requirements

### Requirement: Inline Model Selector Badge

The system MUST render a single model-selector badge inside the chat input bar, adjacent to the textarea, showing the active model's display name and a chevron. The input bar MUST NOT contain a provider or intelligence-level selector.

#### Scenario: Badge shows active model

- GIVEN a chat workspace with a valid active model
- WHEN the input bar renders
- THEN a badge shows the model's display name and a chevron
- AND no provider or intelligence selector is present

#### Scenario: No valid credentials

- GIVEN no provider has valid credentials
- WHEN the input bar renders
- THEN the badge indicates no model is selectable without throwing

### Requirement: Model Selection Popover

The system SHALL open a popover of selectable models when the badge is activated. Selecting a model MUST close the popover and update the active selection. The popover MUST also close on outside click and on Escape (returning focus to the badge).

#### Scenario: Open and choose a model

- GIVEN the badge is visible
- WHEN the user activates it
- THEN a popover lists selectable models
- WHEN the user selects a model
- THEN the popover closes and the badge reflects the new model

#### Scenario: Dismiss without changing selection

- GIVEN the popover is open
- WHEN the user clicks outside or presses Escape
- THEN the popover closes without changing the selection

### Requirement: Validated-Provider Gating

The popover MUST only offer models whose provider has valid credentials. Models of unvalidated providers MUST NOT appear.

#### Scenario: Only validated models shown

- GIVEN providers A and B are validated and C is not
- WHEN the popover opens
- THEN only models of A and B are listed

### Requirement: Keyboard Accessibility

The badge and popover MUST be fully keyboard operable with ARIA menu semantics: Enter/Space opens, Arrow keys move between options, Enter selects, Escape closes and returns focus to the badge.

#### Scenario: Keyboard-only selection

- GIVEN the popover is open and an option is highlighted
- WHEN the user presses Arrow Down then Enter
- THEN the highlighted model is selected and the popover closes

### Requirement: Responsive Layout

The badge and popover MUST fit within the input bar across supported viewport widths without overlapping the textarea or the send button.

#### Scenario: Narrow viewport

- GIVEN a narrow viewport
- WHEN the popover opens
- THEN the popover stays within the viewport and the input bar remains usable

### Requirement: Persisted Selection

The selector MUST persist the chosen model via the chat store so the same model is active after a full reload.

#### Scenario: Selection survives reload

- GIVEN the user selected a model
- WHEN the workspace is reloaded
- THEN the same model is active in the badge

## Out of Scope

- Intelligence-level (Instant/Medium/High) selector
- Backend, API, or routing changes
- Provider credential management UI
- Chat history or session persistence beyond the active model

---

# Domain: chat-session (DELTA)

## MODIFIED Requirements

### Requirement: Backend-Mediated Multi-Provider Chat

The system MUST send all chat traffic through the Cortex backend and SHALL support multi-provider chat where the user selects a model and the provider is derived from that model. Provider selection is no longer a direct user action; the active provider is implied by the active model. The chat request MAY ask for tool-backed answers, and database-backed behavior MUST be available for any registered entity through approved server-side tools and the generic response engine.

(Previously: V1 provider selection was a direct user action via a separate top-bar provider select, alongside a separate model select.)

#### Scenario: Stream a provider response

- GIVEN the user has a valid credential for the provider of the selected model
- WHEN the user sends a message
- THEN Cortex routes the request through the derived provider adapter
- AND the assistant response is streamed back incrementally to the workspace

#### Scenario: Provider derived from selected model

- GIVEN the user selects a model belonging to provider P
- WHEN the selection is applied
- THEN the active provider becomes P without a separate provider action

#### Scenario: Prevent direct provider access from browser

- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser never sends the provider credential or vendor-bound request directly to an external LLM provider

#### Scenario: Use registered-entity database-backed answers

- GIVEN a user asks a factual question for a registered entity in a tool-enabled session
- WHEN tool-backed behavior is available
- THEN Cortex may answer using that entity's approved tools and registry metadata
- AND the request does not expand to unrestricted SQL or unregistered entities

## ADDED Requirements

### Requirement: Active Model as Single Source of Truth

The system MUST treat the active model as the authoritative selection. The active provider MUST be a derived value of the active model, not an independently user-settable state. Persisted selections MUST be sanitized on rehydration: an invalid persisted model MUST resolve to a valid model/provider pair.

#### Scenario: Invalid persisted model is sanitized

- GIVEN a persisted model no longer exists in any validated provider's model list
- WHEN the store rehydrates
- THEN a valid default model/provider pair is restored

#### Scenario: Model belonging to unvalidated provider

- GIVEN the active model belongs to a provider without valid credentials
- WHEN the chat workspace loads
- THEN the selection is sanitized to a validated provider's default model
