# Provider Credentials Specification

## Purpose

This capability has been **removed from the frontend**. n8n now manages provider credentials. The backend `/provider-credentials` endpoint is preserved for rollback but has no frontend consumer.

## Requirements

All requirements removed in change `remove-provider-management-frontend`:

- **User Credential Lifecycle** — removed (Reason: n8n manages provider credentials; frontend surface deleted. Migration: None — consuming components and stores deleted.)
- **Secure Storage and Response Privacy** — removed (Reason: same as above. Migration: None.)
- **Validation and Provider Readiness Feedback** — removed (Reason: same as above. Migration: None.)
