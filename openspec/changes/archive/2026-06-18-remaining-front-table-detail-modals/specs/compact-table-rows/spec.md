# Delta for compact-table-rows

## MODIFIED Requirements

### Requirement: Supported producer lists MUST render compact summary columns

The system MUST render supported producer lists with no more than eight visible data columns. Wine producer rows SHALL include `nombre_comercial` and a primary identifier, animal feed producer rows SHALL include `razon_social` and a primary identifier, brewery rows SHALL include `nombre_cerveceria`, `razon_social`, and `ciudad`, and coffee farm rows SHALL include `nombre_finca`, `razon_social`, and `ciudad`. Full record data SHALL remain available through explicit row detail interaction, not the table surface.
(Previously: Only wine producer and animal feed producer compact rows were defined.)

#### Scenario: Wine producer list stays compact
- GIVEN wine producer records are loaded
- WHEN the `/wine-producers` table renders
- THEN the table shows only compact summary columns for each row

#### Scenario: Animal feed producer list stays compact
- GIVEN animal feed producer records are loaded
- WHEN the `/animal-feed-producers` table renders
- THEN the table shows only compact summary columns for each row

#### Scenario: Brewery list stays compact
- GIVEN brewery records are loaded
- WHEN the `/breweries` table renders
- THEN the table shows only `nombre_cerveceria`, `razon_social`, and `ciudad`

#### Scenario: Coffee farm list stays compact
- GIVEN coffee farm records are loaded
- WHEN the `/coffee-farms` table renders
- THEN the table shows only `nombre_finca`, `razon_social`, and `ciudad`
