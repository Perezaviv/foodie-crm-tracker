# Agent: Happy Hour Frontend Experience

## Goal
Create a UI toggle for "Happy Hour Mode" and update the map/list view.

## Inputs
-   API Endpoint: `/api/restaurants?mode=happy_hour`

## Territority
-   `components/`
-   `app/(frontend)/`

## Execution
1.  **Switch Component**: Create `components/HappyHourSwitch.tsx`.
    -   Simple boolean toggle.
2.  **State Management**:
    -   In `app/(frontend)/page.tsx` (or main layout), add `mode` state.
    -   Pass `mode` to the data fetching hook.
3.  **Map Updates**:
    -   Update `RestaurantMap.tsx` to handle visual distinction (e.g., distinct pin color for Happy Hours).
4.  **List View**:
    -   Ensure the list renders the specific "Happy Hour" details (discount info) when in that mode.
5.  **Verification**:
    -   Manual verification: Toggle switch -> Map pins change -> Clicking pin shows HH details.

## Outputs
-   `components/HappyHourSwitch.tsx`
-   Updated `RestaurantMap.tsx`
-   Working Toggle UI.

-   **Loading States**: Ensure smooth transition when toggling (show skeleton or loading spinner).

---
#### 🏁 Status: Completed (2026-02-01)
Created `HappyHourSwitch.tsx`, updated `useRestaurants` hook, and integrated mode selection into `app/page.tsx`. Map and List views updated for HH branding.
