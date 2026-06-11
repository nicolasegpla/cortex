# Delta for chat-tool-calling

## REMOVED Requirements

### Requirement: Server-Side Tool Loop

(Reason: Backend-first SQL orchestration is now the sole production chat path, so approved tool execution is no longer part of chat answering.)

### Requirement: Tool Calling Fallback

(Reason: Old planner/direct/tool fallback behavior and runtime feature-flag gating were removed; rollback is by code revert, not runtime toggle.)
