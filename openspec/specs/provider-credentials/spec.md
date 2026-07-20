# Provider Credentials Specification

## Purpose

This capability has been **removed entirely**. n8n owns all provider-credential management. The backend `/provider-credentials` CRUD surface, `ProviderCredentialService`, `EncryptionService`, credential schemas, and the `cryptography`/`fernet` dependency are deleted. `ENCRYPTION_KEY` becomes dead config — CORTEXDIST-24 tracks the cleanup.

## Requirements

All requirements removed:

- **User Credential Lifecycle** — removed (Reason: n8n manages provider credentials; frontend surface deleted. Migration: None.)
- **Secure Storage and Response Privacy** — removed (Reason: same as above. Migration: None.)
- **Validation and Provider Readiness Feedback** — removed (Reason: same as above. Migration: None.)
- **Backend Provider Credential API** — removed (Reason: n8n owns all provider-credential management. The backend `/provider-credentials` CRUD endpoints, `ProviderCredentialService`, credential schemas, and Pydantic models are deleted. This completes the removal started in `remove-provider-management-frontend`. Migration: None. CORTEXDIST-23 will drop the Supabase table; CORTEXDIST-24 will remove `ENCRYPTION_KEY` from config/env.)
- **Encryption Service** — removed (Reason: `EncryptionService` (Fernet encrypt/decrypt) had zero remaining consumers after `chat.py` and provider-credential CRUD deletion. The `cryptography`/`fernet` dependency is removed. Migration: None. `ENCRYPTION_KEY` becomes dead config — CORTEXDIST-24 tracks the cleanup.)
