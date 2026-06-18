# Delta for animal-feed-producers-crud

## MODIFIED Requirements

### Requirement: Manual animal feed producer list access

The system MUST expose an authenticated `/animal-feed-producers` page and mark the animal-feed card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with no more than eight visible data columns, and open the shared `row-detail-modal` with full record data plus Edit and Delete actions after explicit row activation.
(Previously: The list only had to load records and show feedback states for the full-width table.)

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects “Alimentos para animales”
- THEN the card behaves as an active link to `/animal-feed-producers`

#### Scenario: Empty or failed load surfaces usable feedback
- GIVEN the list page requests producer data
- WHEN the API returns no rows or the request fails
- THEN the page shows an empty state or an error state instead of a broken table

#### Scenario: Row activation opens animal feed producer details
- GIVEN the animal feed producer list shows a compact summary row
- WHEN the user explicitly activates that row
- THEN the shared detail modal opens with the full record and Edit/Delete actions
