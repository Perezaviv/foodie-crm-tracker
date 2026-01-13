# Frontend Testing Plan (FrontTest.md)

## Overview
This document outlines the testing strategy for the frontend of the Foodie CRM application. The frontend is built with Next.js (React 19), Tailwind CSS, and integrates Google Maps.

## Testing Stack
- **Component Testing**: Jest + React Testing Library (RTL)
- **End-to-End (E2E) Testing**: Playwright (Recommended for "production level") or Cypress.
- **Visual Regression**: Playwright or Percy (optional but recommended).
- **Environment**: jsdom (for Unit/Component), Chromium/WebKit/Firefox (for E2E).

## 1. Component Testing (Unit/Integration)
Focus on individual components rendering and responding to user interaction in isolation.

### 1.1 Shared Components
- **`components/RestaurantCard.tsx`** (Assumed existing or part of list)
    - **Test**: Renders restaurant name, rating, and address correctly.
    - **Test**: "View Details" button callback is fired on click.
- **`components/PhotoUpload.tsx`**
    - **Test**: Renders file input.
    - **Test**: selecting a file triggers state update.
    - **Test**: Displays loading state during upload.
    - **Test**: Displays error message if upload fails.

### 1.2 Complex Components
- **`components/RestaurantMap.tsx`**
    - **Test**: Renders Google Map container.
    - **Test**: Renders correct number of markers based on props.
    - **Mock**: Must mock `@react-google-maps/api` to avoid loading real script in unit tests.
- **`components/RestaurantList.tsx`**
    - **Test**: Renders list of items.
    - **Test**: Renders "Empty State" when list is empty.
    - **Test**: Filtering logic (if handled client-side): typing in search bar filters the list.

## 2. End-to-End (E2E) Testing
Focus on real user flows running in a real browser.

### 2.1 Critical User Flows
- **Add Restaurant via Text Parsing**
    1.  Navigate to Home.
    2.  Click "Add Restaurant".
    3.  Enter text "Best Pizza in Rome".
    4.  Click "Parse".
    5.  Wait for preview to populate.
    6.  Click "Save".
    7.  **Assert**: New restaurant appears in the list.
- **View Restaurant Details**
    1.  Click on a restaurant in the list.
    2.  **Assert**: URL changes to `/restaurant/[id]` (or modal opens).
    3.  **Assert**: Details (Name, Notes) are visible.
    4.  **Assert**: Map marker is present.
- **Photo Upload Flow**
    1.  Go to Restaurant Details.
    2.  Click "Upload Photo".
    3.  Select a dummy image file.
    4.  **Assert**: Toast notification "Upload Successful".
    5.  **Assert**: Image appears in the gallery.

### 2.2 UI & Responsiveness
- **Mobile View (iPhone 12 viewport)**
    - **Test**: Navigation menu is collapsible/accessible.
    - **Test**: Map view doesn't break layout.
    - **Test**: Forms are usable on small screens.
- **Dark/Light Mode**
    - **Test**: Switch to Dark Mode.
    - **Assert**: Background color changes to dark value (e.g., `bg-slate-900`).
    - **Test**: Text is readable (contrast check).

## 3. Hook Testing
Test custom hooks logic in isolation using `renderHook`.

- **`hooks/useRestaurants.ts`**
    - **Test**: Initial state is empty/loading.
    - **Test**: `fetchRestaurants` populates state on success.
    - **Test**: Error state is set on API failure.
- **`hooks/useRestaurantParser.ts`**
    - **Test**: `parse` function sets `loading` to true then `data`.

## 4. Production Readiness Checklist
- [ ] **Linting**: No ESLint errors (`npm run lint`).
- [ ] **Type Checking**: No TypeScript errors (`tsc --noEmit`).
- [ ] **Build**: `npm run build` succeeds without warnings.
- [ ] **Accessibility (a11y)**:
    - Run `axe-core` tests in Playwright.
    - Ensure all form inputs have labels.
    - Ensure images have `alt` text.

## CI/CD Integration
- Run E2E tests on staging deployment or preview environment (Vercel Preview).
- Run Component tests on every push.
