# Design: Coffee Farms First Connection

## Technical Approach

Clone-adapt from breweries pattern: Pydantic schemas with `Decimal` for NUMERIC columns + `Literal` for CHECK-constrained text fields, Supabase-backed CRUD service, FastAPI router with auth. React 19 components (no `useMemo`/`useCallback`), comma-separated array inputs, redirect on create. `stacked-to-main` chained PRs under 400-line review budget.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| NUMERIC precision | `Decimal` in Pydantic | Extra import, exact precision | `Decimal` — avoids IEEE 754 rounding on `hectareas_totales`, `hectareas_cafe`, `puntaje_cafe` |
| Constrained fields | `Literal["Productor", ...]` | Adds Pydantic import | `Literal` — compile-time OpenAPI schema + runtime validation; mirrors breweries' `tipo_operacion` |
| Array normalization | Comma-separated text → `string[]` | Requires frontend `parseArray` | Comma-separated — mirrors breweries pattern; simple for first connection |
| Service scope | CRUD only (5 methods) | No search/inspect/count parity | CRUD only — spec defers advanced helpers to chat-db integration |
| PR split | 2 chained PRs (backend + frontend) | Router tests may overflow backend PR | 2 PRs — router tests spill to frontend PR if backend code+tests exceeds 400 lines |

## Data Flow

```
Browser → React Router → CoffeeFarmList / CoffeeFarmCreate
                │
                ▼
          apiClient (fetch wrapper with auth header)
                │
                ▼
    FastAPI /coffee-farms (auth via JWT → Depends)
                │
                ▼
         CoffeeFarmService (Supabase Python client)
                │
                ▼
          Supabase → public.coffee_farms
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/coffee_farms.py` | Create | `CoffeeFarmCreate`, `CoffeeFarmUpdate`, `CoffeeFarmResponse` — `Decimal` for hectareas/puntaje, `Literal` for tipo_actividad/tipo_proceso/nivel_tecnificacion |
| `cortex-backend/app/services/coffee_farm_service.py` | Create | CRUD service: `create`, `list_all`, `get_by_id`, `update`, `delete` (no search/inspect/count) |
| `cortex-backend/app/routers/coffee_farms.py` | Create | 5 endpoints under `/coffee-farms`, auth via `get_current_user`, delete restricted to `super_admin` |
| `cortex-backend/app/main.py` | Modify | Add `from app.routers import coffee_farms` + `include_router` |
| `cortex-backend/tests/test_coffee_farm_service.py` | Create | 8 tests: CRUD with mocked Supabase |
| `cortex-backend/tests/test_coffee_farms_router.py` | Create | 9 tests: 201/200/404/401 coverage, mocked service + auth |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` | Create | List with loading/empty/error states, delete button, table |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmCreate.tsx` | Create | Form with fieldset sections, `parseArray` for variedades_sembradas/equipos, redirect on success |
| `cortex-frontend/src/features/coffee-farms/index.ts` | Create | Barrel export |
| `cortex-frontend/src/app/router.tsx` | Modify | Add `/coffee-farms` and `/coffee-farms/new` routes under `ProtectedRoute` |
| `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` | Modify | Flip `coffee-farms` card `status` from `coming-soon` to `active` |

## Interfaces / Contracts

```python
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field

class CoffeeFarmCreate(BaseModel):
    nombre_finca: str = Field(..., description="Farm name")
    razon_social: str | None = None
    nit: str | None = None
    direccion: str | None = None
    departamento: str | None = None
    ciudad: str | None = None
    pais: str | None = None
    nombre_contacto: str | None = None
    celular: str | None = None
    correo: str | None = None
    tipo_actividad: Literal[
        "Productor", "Cooperativa", "Asociacion", "Exportador", "Tostador"
    ] | None = None
    hectareas_totales: Decimal | None = None
    hectareas_cafe: Decimal | None = None
    numero_arboles: int | None = None
    variedades_sembradas: list[str] | None = None
    tipo_proceso: Literal[
        "Lavado", "Natural", "Honey", "Anaerobico", "Maceracion carbonica"
    ] | None = None
    puntaje_cafe: Decimal | None = None
    nivel_tecnificacion: Literal[
        "Manual", "Semi automatizado", "Tecnificado"
    ] | None = None
    equipos: list[str] | None = None
    observaciones: str | None = None
    oportunidades: str | None = None
```

Frontend payload normalization mirrors `BreweryCreate`: `parseArray` splits comma-separated strings for `variedades_sembradas` and `equipos`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Service | CRUD with mocked Supabase | pytest + MagicMock, 8 tests (create/list/get×2/update×2/delete×2) |
| Router | HTTP status codes + auth | TestClient + monkeypatch, 9 tests (201/200×2/404×3/204/401) |
| Frontend | List render states, form submit + redirect | vitest + @testing-library/react |

## Chained PR Plan (stacked-to-main)

### PR #1: Backend Core + Service Tests (~370 lines)
Schemas, service, router, `main.py` wiring, service tests. Router tests deferred if budget exceeded.

### PR #2: Frontend + Router Tests (~390 lines)
CoffeeFarmList, CoffeeFarmCreate, router entries, DatabasesPage flip, router tests.

## Open Questions

- [ ] Can router tests (~175 lines) fit within PR #1? If not, move to PR #2.
- [ ] How many CoffeeFarmCreate form fields? Full parity with all columns (as breweries does) or minimal subset?
