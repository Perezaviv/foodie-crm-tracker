# Bug Discovery Report - Foodie CRM

**Date:** 2026-01-14
**Version:** 0.1.0
**Tester:** AntiGravity Agent

## 📊 Summary
A comprehensive manual testing session was conducted on the "Testing App Functionality" plan. The core application flows (listing, searching, adding restaurants) are functional. The primary issues found were related to Google Maps API configuration in the local environment and minor accessibility warnings (which have since been fixed).

## 🟢 Passed Tests
| Test Case | Status | Notes |
| :--- | :--- | :--- |
| **Page Load** | PASS | Header, "12 places" count, and list visible. |
| **Empty/List State** | PASS | List view renders correctly with mock data. |
| **Navigation** | PASS | Switching between Map, List, and Add tabs works smoothly. |
| **Search** | PASS | Real-time filtering (e.g., "Claro") works as expected. |
| **Add Restaurant** | PASS | "Test Restaurant" was successfully added via the drawer flow. |
| **Responsiveness** | PASS | Bottom navigation remains fixed; layout adapts to mobile view. |
| **Unit Tests** | PASS | All 37 unit tests passed after fixing mocks. |
| **E2E Tests** | PASS | All 4 E2E tests passed via Playwright. |

## 🔴 Failed / Action Required
| Issue ID | Severity | Description | Status |
| :--- | :--- | :--- | :--- |
| **BUG-001** | High | **Map API Error**: `RefererNotAllowedMapError` in console. Map shows blank beige screen. <br> **Root Cause**: `localhost:3000` is not authorized in Google Cloud Console for the API key. | ⚠️ **Config Required** |
| **BUG-002** | Low | **Accessibility**: `Drawer.Content` (vaul) missing `Title` and `Description`. <br> **Impact**: Screen readers cannot properly announce the dialog. | ✅ **Fixed** |
| **BUG-003** | Medium | **Address Fetching**: Some restaurants (A.K.A, Sid and Nancy) were failing to geocode or returning incorrect addresses due to regex limitations and noisy search results. | ✅ **Fixed** |

## 📝 Observations & Notes
1.  **Geolocation**: A timeout occurred during testing in the headless environment. This is expected behavior for the test runner and not necessarily a bug in the app, but worth noting for manual verification on a real device.
2.  **Demo Mode**: The application correctly identifies it is running without Supabase and enables "Demo Mode", returning mock data and a demo banner.

## 🛠️ Fixes Implemented During Session
-   **Tests**:
    -   Excluded E2E/Playwright tests from Jest config to prevent `TransformStream` errors.
    -   Updated `RestaurantList` tests to fix `framer-motion` prop warnings.
    -   Updated `RestaurantMap` tests to align with the new `MarkerClusterer` implementation.
    -   Updated `api/restaurants` integration tests to expect "Demo Mode" responses (200 OK) instead of 503s.
-   **Code**:
    -   Added `isDemoMode` to `useRestaurants` hook return type.
    -   Added `sr-only` (screen-reader only) `Drawer.Title` and `Description` to `page.tsx` (Add Drawer) and `RestaurantDetail.tsx` to resolve accessibility warnings.
