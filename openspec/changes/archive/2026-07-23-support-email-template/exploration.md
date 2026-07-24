# Exploration: support-email-template (CORTEXDIST-30)

## Current State

The `POST /support/feedback` endpoint (CORTEXDIST-29, shipped and archived) delivers feedback via `EmailService.send_support_feedback(feedback_type, subject, message)`. The seam is intentionally thin — the HTML body is a bare `<pre>{safe_message}</pre>` with the comment `CORTEXDIST-30 owns the rich template`.

### Current seam signature

```python
# app/services/email_service.py:167
def send_support_feedback(self, feedback_type: str, subject: str, message: str) -> dict:
```

Key details:
- **Recipient**: resolved internally from `settings.support_to_email` (default `stalloy@stalloy.io`, alias `SUPPORT_TO_EMAIL`). Router does NOT pass `to_email`.
- **From**: `self._from_email` (resolved from `settings.resend_from_email`, alias `RESEND_FROM_EMAIL`, default `noreply@cortex.local`).
- **No `reply_to`**: the current Resend payload has `from` and `to` only — no `reply_to` field.
- **No user context**: the seam does NOT receive the submitting user's email or ID.
- **Escaping**: `html.escape(message)` and CRLF sanitize on subject — already done (CORTEXDIST-29).

### Router current state

```python
# app/routers/support.py:38
email_service.send_support_feedback(
    feedback_type=payload.type,
    subject=payload.subject,
    message=payload.message,
)
```

- `current_user: User` is available (`Depends(get_current_user)`) but the router does NOT pass `current_user.email` or `current_user.id` to the seam. The user identity is only used for logging (`SUPPORT-FEEDBACK: start ... user_id=...`).

### Resend SDK support for `reply_to`

Resend Python SDK v2.32.2 (installed) supports `reply_to` in `Emails.SendParams`:

```python
class SendParams(TypedDict):
    from: NotRequired[str]
    to: Union[str, List[str]]
    subject: NotRequired[str]
    reply_to: NotRequired[Union[List[str], str]]  # ← fully supported
    html: NotRequired[str]
    text: NotRequired[str]
    # ...
```

This is a NOTREQUIRED field — passing it is optional. The existing `send_invite_email` does NOT use `reply_to` (it uses only `from`, `to`, `subject`, `html`).

### User model

```python
# app/core/security.py:16
class User(BaseModel):
    id: UUID
    email: str
    role: str = "operativo"
```

Both `current_user.email` and `current_user.id` are available in the router at the point where `send_support_feedback` is called.

### Config settings

| Setting | Env alias | Default | Shipped in |
|---------|-----------|---------|------------|
| `resend_from_email` | `RESEND_FROM_EMAIL` | `noreply@cortex.local` | Original |
| `support_to_email` | `SUPPORT_TO_EMAIL` | `stalloy@stalloy.io` | CORTEXDIST-29 |

No `RESEND_SUPPORT_EMAIL` exists. The naming note from the design's risks section is satisfied: `SUPPORT_TO_EMAIL` is the shipped name — keep it.

## Affected Areas

- `cortex-backend/app/services/email_service.py` — **modify**: change `send_support_feedback` signature to accept `user_email: str` and `user_id: str`; add `reply_to` to the Resend payload; replace bare `<pre>` template with rich HTML.
- `cortex-backend/app/routers/support.py` — **modify**: pass `current_user.email` and `current_user.id` to the seam.
- `cortex-backend/tests/test_support_feedback.py` — **modify**: tests R4, R5, R6, R7, R8 need updates for the new seam signature; R5 specifically asserts `assert_called_once_with(feedback_type=..., subject=..., message=...)` WITHOUT user args — this WILL break.
- `cortex-backend/tests/test_email_service.py` — **modify**: existing `send_support_feedback` tests need signature update; new tests for template content, `reply_to`, and `from` assertions.
- `openspec/specs/support-feedback/spec.md` — **modify**: the spec's "User email from session, not payload" scenario explicitly says the seam is called with NO `to_email` argument; this needs a MODIFIED requirement that adds `user_email` and `user_id` as seam arguments and `reply_to` wiring. The "Valid feedback returns 200" and "Seam called with correct args" scenarios need updating.
- `openspec/changes/support-email-template/` — **create**: exploration.md (this file) plus downstream artifact directories.
- `cortex-backend/app/core/config.py` — **NO CHANGE**: `SUPPORT_TO_EMAIL` already shipped. No new config needed for this change.

## Approaches

### 1. Extend seam signature + rich template (Recommended)

Add `user_email: str` and `user_id: str` to `send_support_feedback`, wire `reply_to=user_email` in the Resend payload, build a rich HTML template with feedback type, subject, message, user email, user ID, and a server-generated timestamp.

```python
def send_support_feedback(
    self,
    feedback_type: str,
    subject: str,
    message: str,
    user_email: str,      # NEW
    user_id: str,          # NEW
) -> dict:
    safe_subject = subject.replace("\r", " ").replace("\n", " ")
    safe_message = html.escape(message)
    safe_user_email = html.escape(user_email)
    safe_user_id = html.escape(str(user_id))

    return resend.Emails.send({
        "from": self._from_email,
        "to": self.settings.support_to_email,
        "reply_to": safe_user_email,          # NEW
        "subject": f"[Cortex Feedback - {feedback_type}] {safe_subject}",
        "html": _render_support_template(
            feedback_type=feedback_type,
            subject=safe_subject,
            message=safe_message,
            user_email=safe_user_email,
            user_id=safe_user_id,
            timestamp=datetime.utcnow().isoformat(),
        ),
    })
```

- **Pros**: follows the existing pattern; minimal signature change; one mock point; preserves all existing escaping; `reply_to` is a single Resend field addition (not a breaking SDK change); timestamp provides useful "contexto básico" without new dependencies.
- **Cons**: `send_support_feedback` signature change is breaking for callers (router + all tests); tests R4-R8 need updates; spec needs delta.
- **Effort**: Medium (template work + test updates + spec delta).

### 2. Keep thin seam, add rich template via module-level function

Keep the seam signature unchanged (`feedback_type, subject, message`), extract template rendering to a module-level `_render_support_template(...)` function, add `reply_to` and user context by reading `current_user` via an optional injectable dependency in `EmailService`.

- **Pros**: router signature unchanged; no test breakage in router tests (R4-R7 unaffected); separation of concerns between delivery and formatting.
- **Cons**: couples `EmailService` to a user dependency or forces awkward parameter passing; `reply_to` requires the user email to reach the seam — either through the service having access to the request context (anti-pattern) or by passing it as an optional kwarg (which is effectively the same as Approach 1).
- **Effort**: Medium-High (introduces coupling or indirection).

### 3. Minimal change: only `reply_to` + preserved `<pre>` template

Add `user_email` to the seam, wire `reply_to`, keep the thin `<pre>{safe_message}</pre>` body. Defer the rich HTML template to a follow-up.

- **Pros**: smallest diff; lowest test breakage; `reply_to` delivered now; template richness deferred.
- **Cons**: the Plane task explicitly says "template con tipo, asunto, mensaje, usuario y contexto básico" — this approach doesn't deliver what's asked; the thin `<pre>` template was explicitly marked as CORTEXDIST-30's work.
- **Effort**: Low (but doesn't fulfill the task scope).

## Recommendation

**Approach 1 — Extend seam signature + rich template.**

The Plane task explicitly requires a rich template. The `reply_to` wiring is a direct consequence of passing user context into the seam. The spec delta and test updates are surface-level (signature changes, new assertions), not architectural changes. The rich HTML template should follow the visual style of `send_invite_email` (dark theme, Cortex branding, same font stack) for consistency.

### Rich HTML template structure

Following the invite email's visual language (dark background `#030303`, card `#0d0d0d`, green accent `#00FF88`, same font stack):

```
┌─────────────────────────────────────────┐
│  Green gradient accent bar              │
├─────────────────────────────────────────┤
│  Cortex logo + "cortex" wordmark       │
├─────────────────────────────────────────┤
│  FEEDBACK TYPE: [bug|mejora|...] label  │
│  Subject line (escaped, user-provided)  │
│  Timestamp: 2026-07-24T...              │
│                                         │
│  Message (escaped, in a styled block)   │
│                                         │
├─────────────────────────────────────────┤
│  User: email (id)                       │
├─────────────────────────────────────────┤
│  From: {from_email}                     │
│  © 2025 Cortex                          │
└─────────────────────────────────────────┘
```

**"Contexto básico" definition**: I recommend including:
- `timestamp` (UTC ISO, server-generated via `datetime.utcnow()`) — available, zero-cost, useful for debugging.
- `user_email` and `user_id` — available from the JWT session.
- NOT including `app_version` — no such setting exists in the backend; adding a version constant would be scope creep.

### `reply_to` wiring

```python
"reply_to": safe_user_email,   # user's email from the JWT session
```

The Resend `reply_to` field accepts a string or list. A single string is sufficient. This means: when Nicolás (the support inbox reader) clicks "Reply" in his email client, the reply goes to the user who submitted the feedback — NOT to `noreply@cortex.local`.

Note: `from` MUST remain `RESEND_FROM_EMAIL` (the verified sender). Resend requires the `from` address to be a domain you own and have verified. The user's email is NOT verified by Resend and CANNOT be used as `from`.

## Test Plan (Strict TDD)

### Router tests that WILL break (need updates)

| Test | Current assertion | Why it breaks | Fix |
|------|-------------------|---------------|-----|
| R4 | `assert response.json() == ...` | Unchanged — valid payload still returns 200/`{success: true}` | No fix needed (but re-verify) |
| R5 | `assert_called_once_with(feedback_type="bug", subject=..., message=...)` | Signature now requires `user_email` + `user_id` | Add `user_email="user@example.com", user_id=...` to the assertion |
| R6 | `mock.send_support_feedback.return_value = {"id": "email-123"}` | Mock return unchanged, but call signature differs | Update signature in assertion |
| R7 | `send_support_feedback.side_effect = Exception(...)` | Same as R5 | Update call assertion |
| R8 | Direct `send_support_feedback("bug","s","m")` call | Signature changed | Pass `user_email` and `user_id` |

### New/updated tests for `test_email_service.py`

| # | Test | Assertion |
|---|------|-----------|
| E1 | `reply_to` is set to user_email | Monkeypatch `resend.Emails.send`, capture payload, assert `captured["reply_to"] == "user@example.com"` |
| E2 | `from` is `RESEND_FROM_EMAIL`, NOT user email | Same capture — assert `captured["from"] == settings.resend_from_email` |
| E3 | Template contains feedback type label | Assert `captured["html"]` contains the translated type label (e.g., "Bug", "Mejora") |
| E4 | Template contains escaped subject | Assert subject text is HTML-escaped in the template |
| E5 | Template contains escaped message | Assert message text is HTML-escaped in the template |
| E6 | Template contains user email | Assert `captured["html"]` contains the user's email |
| E7 | Template contains user ID | Assert `captured["html"]` contains the user's UUID |
| E8 | Template contains timestamp | Assert `captured["html"]` contains an ISO-8601 timestamp (regex match) |
| E9 | Template does NOT contain raw HTML injection | Existing test — preserves `<div>injected</div>` escaping |
| E10 | CRLF sanitization preserved | Existing test — preserves `\r\n` stripping |
| E11 | Unconfigured raises RuntimeError | Existing test — unchanged (`is_configured()` guard) |

### Escaping regression

The existing escaping (CORTEXDIST-29) must be preserved:
- `html.escape(message)` — prevents HTML injection in the message body.
- CRLF sanitize on `subject` — prevents header injection.
- These are already tested in E9 and E10. No regression risk if the template uses the already-escaped values.

### Template content assertions (TDD approach)

Since the template is an inline string (not a Jinja2/file template), assertions should:
1. **Structural**: assert key sections exist (feedback type label, subject, message block, user info, footer).
2. **Safety**: assert HTML entities, not raw markup, for user-provided content.
3. **Not over-specified**: do NOT assert exact pixel values or CSS class names — those are implementation details. Assert semantic content presence (the user's message text escaped and visible, the feedback type label).

## Spec Impact

`openspec/specs/support-feedback/spec.md` needs a **MODIFIED** delta:

### MODIFIED Requirements

1. **Requirement: Email Service Seam** — the seam signature changes from `(feedback_type, subject, message)` to `(feedback_type, subject, message, user_email, user_id)`. The `from` address MUST be `settings.resend_from_email`. The Resend payload MUST include `reply_to = user_email`. The HTML body MUST be a rich template (not bare `<pre>`).

2. **Requirement: Successful Feedback Submission** — the "Seam called with correct arguments" scenario MUST assert the new signature including `user_email` and `user_id`.

3. **Requirement: Authentication** — the "User email from session, not payload" scenario MUST be updated to reflect that `user_email` IS passed to the seam (from the session), but the recipient (`to`) remains resolved internally.

### ADDED Requirements (recommended)

4. **Requirement: Reply-To Header** — the Resend payload MUST set `reply_to` to the authenticated user's email so the support inbox reader can reply directly to the submitter. The `from` address MUST remain `RESEND_FROM_EMAIL` (the verified Resend sender).

5. **Requirement: Rich HTML Template** — the email body MUST include: feedback type label, user-provided subject (escaped), user-provided message (escaped), submitting user's email and ID, and a server-generated timestamp. All user-provided content MUST be HTML-escaped.

## Risks

- **Test breakage is surface-level, not architectural**: R4-R8 need assertion updates for the new seam signature. No new router error paths. Risk: LOW.
- **`reply_to` domain verification**: Resend does NOT require the `reply_to` domain to be verified — only `from`. Verified in Resend docs. Risk: NONE.
- **Template escaping regression**: the new template rendering must use the already-escaped values (`safe_message`, `safe_subject`, `safe_user_email`) — never raw user input in HTML context. The existing escape tests cover this, but a new test should verify the template itself doesn't re-introduce raw values. Risk: LOW (existing tests + new E4/E5/E9 cover this).
- **`SUPPORT_TO_EMAIL` naming**: the archived design.md's risks section mentions `RESEND_SUPPORT_EMAIL` as a potential future config name. The shipped name is `SUPPORT_TO_EMAIL` (CORTEXDIST-29). This change does NOT rename or add a new config field — it consumes the existing `SUPPORT_TO_EMAIL` for the `to` field and uses `RESEND_FROM_EMAIL` for `from`. Risk: NONE (no config change needed).
- **400-line budget**: the email_service.py change (~60 lines of template + 15 lines of signature), router update (~5 lines), test updates (~80 lines net new assertions), spec delta (~50 lines). Total estimate: ~210 lines. Risk: LOW.

## Ready for Proposal

**Yes.** The exploration is complete — Resend SDK `reply_to` support confirmed (v2.32.2, `NotRequired[Union[List[str], str]]`), all affected files identified, test breakage mapped, spec delta scoped. The orchestrator should proceed to `sdd-propose` with Approach 1 (extend seam signature + rich HTML template using the existing invite email visual language).
