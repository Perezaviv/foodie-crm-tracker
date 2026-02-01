# Agent: Happy Hour Logic & Backend

## Goal
Implement the business logic to serve Happy Hour data and toggle between modes.

## Inputs
-   `lib/happy_hour_types.ts` (Created by Agent 1)

## Territority
-   `lib/services/`
-   `lib/repositories/`
-   `app/api/`

## Execution
1.  **Repository**: Create `lib/repositories/HappyHourRepository.ts`.
    -   Must implement methods to fetch happy hours by location/filter.
2.  **Service Integration**:
    -   Refactor `LocationService` (or equivalent) to accept a `mode` parameter.
    -   If `mode === 'happy_hour'`, use `HappyHourRepository`.
    -   Else, use default `RestaurantRepository`.
3.  **API**: Update `app/api/restaurants/route.ts` (or create `app/api/locations/route.ts`).
    -   Accept `?mode=happy_hour` query param.
    -   Pass param to Service.
4.  **Verification**:
    -   Create unit test `lib/services/LocationService.test.ts`.
    -   Verify API response changes based on query param.

## Outputs
-   `lib/repositories/HappyHourRepository.ts`
-   Updated API Routes.

-   **Type Mismatch**: Ensure `HappyHour` objects map correctly to the frontend `Restaurant` interface if reusing components.

---
#### 🏁 Status: Completed (2026-02-01)
Integrated via `lib/skills/db/restaurant_crud.ts` and `app/api/restaurants/route.ts`.
