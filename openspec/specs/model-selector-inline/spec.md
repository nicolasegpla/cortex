# Model Selector Inline Specification

## Purpose

Inline, ChatGPT-style model selector rendered as a badge in the chat input bar. The user selects a model; the provider is derived from it. No provider selector and no intelligence-level selector are included.

> **Scope note:** This selector is part of the legacy SSE `/chat/stream` chat path. The active n8n chat page intentionally does not render a model/provider selector; the only chat controls are the message input and send button.

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
