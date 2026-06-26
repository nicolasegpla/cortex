# Delta for breweries-crud

## MODIFIED Requirements

### Requirement: Authenticated brewery CRUD API

The system MUST expose authenticated `POST /breweries`, `GET /breweries`, `GET /breweries/{id}`, `PUT /breweries/{id}`, and `DELETE /breweries/{id}` operations backed by `public.breweries`. The `POST` and `PUT` operations MUST schedule a best-effort background embedding refresh as a side effect after the primary write succeeds, MUST NOT block the HTTP response on embedding generation, and MUST return successfully even when embedding generation fails. The brewery response model MUST include the `embedding_status` and `embedding_updated_at` metadata fields.

(Previously: Requirement only described the CRUD operations and status codes, with no embedding side effect and no embedding metadata in the response.)

#### Scenario: Create and retrieve a brewery
- GIVEN an authenticated user and a valid brewery payload
- WHEN the user creates a record and then requests it by id
- THEN the API returns `201 Created` and `200 OK`

#### Scenario: Create schedules background embedding refresh
- GIVEN an authenticated user and a valid brewery payload
- WHEN the user creates a brewery
- THEN the API returns `201 Created` immediately and a background embedding refresh is scheduled for the new record

#### Scenario: Update schedules background embedding refresh
- GIVEN an authenticated user and an existing brewery
- WHEN the user updates the brewery
- THEN the API returns `200 OK` immediately and a background embedding refresh is scheduled for the record

#### Scenario: CRUD succeeds when embedding generation fails
- GIVEN an authenticated user, embeddings enabled, and the OpenAI embedding call fails
- WHEN the user creates or updates the brewery
- THEN the API still returns `201 Created` or `200 OK` and the record's `embedding_status` becomes `error`

#### Scenario: Response includes embedding metadata
- GIVEN a brewery record exists
- WHEN the user requests the brewery by id or lists breweries
- THEN the response includes `embedding_status` and `embedding_updated_at` fields
