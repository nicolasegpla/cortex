# Delta for coffee-farms-crud

## MODIFIED Requirements

### Requirement: Manual coffee farm list access

The system MUST expose an authenticated `/coffee-farms` page and mark the coffee farms card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with no more than eight visible data columns using `nombre_finca`, `razon_social`, and `ciudad`, and open the shared `row-detail-modal` with full record data plus Edit and Delete actions after explicit row activation.
(Previously: The list only had to load records and show feedback states for the full-width table.)

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects “Fincas de café”
- THEN the card behaves as an active link to `/coffee-farms`

#### Scenario: Empty or failed load surfaces usable feedback
- GIVEN the list page requests coffee farm data
- WHEN the API returns no rows or the request fails
- THEN the page shows an empty state or an error state instead of a broken table

#### Scenario: Row activation opens coffee farm details
- GIVEN the coffee farm list shows a compact summary row
- WHEN the user explicitly activates that row
- THEN the shared detail modal opens with the full record and Edit/Delete actions

#### Scenario: Hover alone does not open coffee farm details
- GIVEN the coffee farm list is visible
- WHEN the user only hovers or focuses a row without activation
- THEN no detail modal opens
