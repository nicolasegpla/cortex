# Delta for Provider Credentials

## REMOVED Requirements

### Requirement: Backend Provider Credential API

(Reason: n8n owns all provider-credential management. The backend `/provider-credentials` CRUD endpoints, `ProviderCredentialService`, credential schemas, and Pydantic models are deleted. This completes the removal started in `remove-provider-management-frontend` — the backend surface that was "preserved for rollback" is now gone.)
(Migration: None. CORTEXDIST-23 will drop the Supabase table; CORTEXDIST-24 will remove `ENCRYPTION_KEY` from config/env.)

### Requirement: Encryption Service

(Reason: `EncryptionService` (Fernet encrypt/decrypt) had zero remaining consumers after `chat.py` and provider-credential CRUD deletion. The `cryptography`/`fernet` dependency is removed.)
(Migration: None. `ENCRYPTION_KEY` becomes dead config — CORTEXDIST-24 tracks the cleanup.)

#### Scenario: No provider-credentials routes registered

- GIVEN the application starts after this change
- WHEN the router list is inspected
- THEN no `/provider-credentials` prefix route is registered
- AND `GET`, `POST`, and `DELETE` under that prefix return `404`

#### Scenario: EncryptionService is not importable

- GIVEN the application is deployed after this change
- WHEN any module attempts `from app.services.encryption_service import EncryptionService`
- THEN the import fails at module-load time
