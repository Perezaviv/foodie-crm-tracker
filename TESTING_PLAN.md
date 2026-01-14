# Bug Fix Testing Plan

This plan outlines the testing procedures to verify the fixes for the mobile scrolling, photo upload, map update, and booking link issues.

## 📱 Section 1: Mobile Layout & Experience (Agent 1)
**Goal**: Verify the app feels native on mobile with no unwanted body scrolling.

### Manual Verification Steps
1.  **View on Mobile**: Open the app in Chrome DevTools "Device Mode" (e.g., iPhone 12 Pro).
2.  **Scroll List**: Go to the "List" view. Scroll up and down.
    -   [ ] **Pass Condition**: The list content scrolls smoothly.
    -   [ ] **Pass Condition**: The URL bar (address bar) does **not** expand/contract (due to `100dvh` and `fixed` body policy).
    -   [ ] **Pass Condition**: The bottom navigation bar stays strictly anchored to the bottom.
3.  **Overscroll**: Pull down hard at the top of the list.
    -   [ ] **Pass Condition**: The whole page does **not** refresh or drag down (due to `overscroll-behavior: none`).

## 📸 Section 2: Core Features - Photos & Map (Agent 2)
**Goal**: Verify critical user flows (adding content) work without errors.

### Photo Upload Test
1.  **Select Restaurant**: Open any restaurant detail view.
2.  **Upload**: Click "Photos" -> "Add Photo". Select `1.jpg`.
3.  **Verify**:
    -   [ ] **Pass Condition**: No "Storage not configured" error appears.
    -   [ ] **Pass Condition**: The image appears in the grid immediately after upload.
    -   [ ] **Pass Condition**: The image persists after a page reload.

### Map Update Test
1.  **Add New Place**: Click "+", enter "Vitrina Tel Aviv" (or similar).
2.  **Save**: Click "Save".
3.  **Check Map**: Switch to Map view.
    -   [ ] **Pass Condition**: A new marker exists for Vitrina.
    -   [ ] **Pass Condition**: Clicking the marker shows the correct address.
    -   *Note*: Previously, this would fail if the backend didn't geocode the address immediately.

## 🔗 Section 3: Intelligence - Booking Links (Agent 3)
**Goal**: Verify Tabit and other smart links are captured.

### Booking Link Extraction
1.  **Add Tabit Place**: Add a restaurant known to use Tabit (e.g., "Messa", "Shila", or just paste a Tabit link if you have one).
2.  **Check Details**:
    -   [ ] **Pass Condition**: The "Book" button appears on the card.
    -   [ ] **Pass Condition**: The link is **not** generic (e.g., `tabit.cloud/il/restaurant/specific-id`).

## 🤖 Automated Verification
Run the validation script to check the environment and API endpoints.

```bash
# Verify the build
npm run build
```
