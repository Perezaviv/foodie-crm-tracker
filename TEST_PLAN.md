# Test Plan - Smart Restaurant Tracker (Foodie CRM)

## Overview
This document outlines the verification strategy for Phases 1 & 2 of the Foodie CRM application.

---

## Phase 1: Foundation Tests

### 1.1 Build Verification
- **Test**: Run `npm run build` successfully
- **Expected**: No TypeScript errors, successful compilation
- **Status**: ✅ Passing

### 1.2 Dev Server
- **Test**: Run `npm run dev` and access http://localhost:3000
- **Expected**: App loads with bottom navigation (Map, List, Add, Profile)
- **Verification**: Manual browser check

### 1.3 Database Schema
- **Test**: Execute `supabase/schema.sql` in Supabase SQL Editor
- **Expected**: Tables created: `profiles`, `restaurants`, `photos`
- **Verification**: Check Supabase dashboard > Table Editor

### 1.4 Directory Structure
- **Test**: Verify all required directories exist
- **Expected**:
  - `app/` - Next.js pages
  - `lib/` - Utilities and Supabase client
  - `directives/` - SOPs folder
  - `execution/` - Python scripts folder
  - `.tmp/` - Temp files (gitignored)

---

## Phase 2: Intelligence Layer Tests

### 2.1 Parse API - Basic Input
- **Endpoint**: `POST /api/parse`
- **Test Input**: `{ "input": "Vitrina Tel Aviv" }`
- **Expected Response**:
```json
{
  "success": true,
  "restaurant": {
    "name": "Vitrina",
    "city": "Tel Aviv"
  }
}
```
- **Curl Command**:
```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"input": "Vitrina Tel Aviv"}'
```

### 2.2 Parse API - Without AI (Fallback)
- **Test**: Call `/api/parse` without GEMINI_API_KEY configured
- **Expected**: Returns input as restaurant name with medium confidence
- **Status**: ✅ Implemented fallback

### 2.3 Parse API - Social Link Detection
- **Test Input**: `{ "input": "https://instagram.com/vitrina_tlv" }`
- **Expected**: Extracts name from handle, includes socialLink field

### 2.4 Restaurants API - Save
- **Endpoint**: `POST /api/restaurants`
- **Test Input**:
```json
{
  "restaurant": {
    "name": "Test Restaurant",
    "city": "Tel Aviv",
    "cuisine": "Italian"
  }
}
```
- **Expected**: Restaurant saved to Supabase, returns saved record with ID
- **Prerequisite**: Supabase configured in .env.local

### 2.5 Restaurants API - List
- **Endpoint**: `GET /api/restaurants`
- **Expected**: Returns array of all saved restaurants
- **Curl Command**:
```bash
curl http://localhost:3000/api/restaurants
```

### 2.6 Geocoding
- **Test**: Address geocoding via OpenStreetMap Nominatim
- **Function**: `geocodeAddress("Rothschild Blvd, Tel Aviv")`
- **Expected**: Returns `{ lat: number, lng: number }`

---

## Manual UI Tests

### UI-1: Navigation
- [ ] Tap Map icon → Shows Map placeholder
- [ ] Tap List icon → Shows restaurant list (or empty state)
- [ ] Tap + button → Shows Add Restaurant form
- [ ] Tap Profile icon → Shows sign-in prompt

### UI-2: Add Restaurant Flow
- [ ] Enter restaurant name in input
- [ ] Tap "Search & Add" button
- [ ] See loading spinner during search
- [ ] See parsed result confirmation screen
- [ ] Tap "Save Restaurant" button
- [ ] Redirect to List view with new restaurant shown

### UI-3: Ambiguity Handling
- [ ] Enter ambiguous input (e.g., "Moses")
- [ ] See multiple location options
- [ ] Tap correct location
- [ ] See confirmation screen with selected data

### UI-4: Error States
- [ ] Submit empty input → Shows validation error
- [ ] API fails → Shows error message in red box
- [ ] Cancel button → Resets form

---

## Responsive & Mobile Testing
### R-1: Viewport Sizes
- [ ] Mobile Portrait (375px) - Verify stacked layout, readable text
- [ ] Tablet (768px) - Verify grid adjustments
- [ ] Desktop (1024px+) - Verify max-width constraints

### R-2: Touch Interactions
- [ ] Tap targets are at least 44x44px
- [ ] Inputs are accessible without zooming
- [ ] Bottom navigation safe area handling on iOS

---

## Security & Performance Checks
- [ ] **API Keys**: Verify no secret keys (Supabase Service Key, OpenAI/Gemini keys) are exposed in client bundles (check Network tab for `_next/static` files or `main.js`).
- [ ] **RLS**: Verify unauthenticated users cannot delete restaurants (try curl DELETE).
- [ ] **Lighthouse**: Run audit, aim for >90 Accessibility and SEO.

---

## Integration Test Script

Run `python execution/test_api.py` to execute these tests.

```python
# execution/test_api.py
import requests
import sys

BASE_URL = "http://localhost:3000"

def log(msg, success=True):
    icon = "✅" if success else "❌"
    print(f"{icon} {msg}")

def test_parse_simple():
    """Test basic restaurant name parsing"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/parse",
            json={"input": "Vitrina Tel Aviv"}
        )
        data = response.json()
        if data.get("success") and data["restaurant"]["name"] == "Vitrina":
            log("Parse simple: PASSED")
        else:
            log(f"Parse simple: FAILED - {data}", False)
    except Exception as e:
        log(f"Parse simple: ERROR - {e}", False)

def test_parse_social():
    """Test social link extraction"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/parse",
            json={"input": "https://instagram.com/vitrina_tlv"}
        )
        data = response.json()
        # Note: Depending on AI/Regex fallback, name might vary, but success should be true
        if data.get("success"):
            log("Parse social link: PASSED")
        else:
            log(f"Parse social link: FAILED - {data}", False)
    except Exception as e:
        log(f"Parse social link: ERROR - {e}", False)

def test_parse_negative():
    """Test invalid input"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/parse",
            json={"input": "a"} # Too short
        )
        if response.status_code == 400:
            log("Parse negative (short input): PASSED")
        else:
            log(f"Parse negative: FAILED - Status {response.status_code}", False)
    except Exception as e:
        log(f"Parse negative: ERROR - {e}", False)

def test_restaurants_list():
    """Test fetching restaurant list"""
    try:
        response = requests.get(f"{BASE_URL}/api/restaurants")
        data = response.json()
        if data.get("success"):
            count = len(data.get('restaurants', []))
            log(f"List restaurants: PASSED ({count} found)")
        else:
            log(f"List restaurants: FAILED - {data}", False)
    except Exception as e:
        log(f"List restaurants: ERROR - {e}", False)

if __name__ == "__main__":
    print(f"Testing against {BASE_URL}...\n")
    test_parse_simple()
    test_parse_social()
    test_parse_negative()
    test_restaurants_list()
    print("\nTest run complete.")
```

---

## Environment Setup Checklist

Before running tests, ensure:

1. [ ] Copy `.env.example` to `.env.local`
2. [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. [ ] Run `supabase/schema.sql` in Supabase
4. [ ] (Optional) Set `GEMINI_API_KEY` for AI extraction
5. [ ] (Optional) Set `TAVILY_API_KEY` for search enrichment

---

## Next Steps

After Phase 2 verification:
- **Phase 3**: Build Map View with Mapbox integration
- **Phase 4**: Implement photo upload with Supabase Storage
