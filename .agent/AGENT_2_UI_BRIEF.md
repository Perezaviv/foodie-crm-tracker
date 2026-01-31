# Agent 2: UI/Client Specialist - Launch Brief

**Agent ID:** `AGENT-2`  
**Territory:** `components/RestaurantMap.tsx`, `components/RestaurantDetail.tsx`, `components/PhotoGallery.tsx`, `hooks/`
**Status:** 🟢 ACTIVE

---

## Your Mission

You are the **UI/Client Specialist**. Your job is to refactor the large React components into smaller, reusable pieces and extract API calls into hooks/skills.

## Current File Locks (You Own)
```json
{
  "components/RestaurantMap.tsx": { "agent": "AGENT-2", "started": "2026-01-31T10:49:00Z" },
  "components/RestaurantDetail.tsx": { "agent": "AGENT-2", "started": "2026-01-31T10:49:00Z" },
  "components/PhotoGallery.tsx": { "agent": "AGENT-2", "started": "2026-01-31T10:49:00Z" },
  "components/PhotoUpload.tsx": { "agent": "AGENT-2", "started": "2026-01-31T10:49:00Z" },
  "hooks/*": { "agent": "AGENT-2", "started": "2026-01-31T10:49:00Z" }
}
```

## Skills Already Created (Use These)
- ✅ `lib/skills/ui/use_restaurants.ts` - CRUD hook for restaurants
- ✅ `lib/skills/ui/use_photos.ts` - Photo management hook
- ✅ `lib/skills/db/supabase_client.ts` - Supabase client factory

## Your Tasks

### Task 1: Create `use_geocoding` Hook
Extract the geocoding logic from `RestaurantMap.tsx` into:
```
lib/skills/ui/use_geocoding.ts
```
- Handle "Auto-Fix Locations" functionality
- Use Google Geocoding API

### Task 2: Create `use_comments` Hook
Extract comment fetching/posting from `RestaurantDetail.tsx` into:
```
lib/skills/ui/use_comments.ts
```

### Task 3: Refactor RestaurantDetail.tsx
- Replace inline API calls with `useRestaurants()` hook
- Replace inline comment logic with `useComments()` hook
- Split into smaller components if >300 lines after refactor

### Task 4: Refactor RestaurantMap.tsx (686 lines)
- Extract marker clustering logic into a utility
- Extract the side panel into a separate component
- Use the geocoding hook for auto-fix

### Task 5: Create MapSidePanel Component
Extract the slide-out panel from `RestaurantMap.tsx` into:
```
components/MapSidePanel.tsx
```

## Rules
1. Follow the template in `SKILL_TEMPLATE.md` for hooks
2. Log your progress in `PROJECT_UPDATE_LOG.md` with prefix `[AGENT-2]`
3. After creating 3 hooks/components, sync: `git add . && git commit -m "[AGENT-2] UI batch" && git pull --rebase`
4. Do NOT touch files outside your territory without requesting a lock

## Dependencies
- You depend on `lib/skills/db/supabase_client.ts` (READY)
- Components depend on `lib/types.ts` (shared, read-only unless you coordinate)

---

**Start by reading:** `components/RestaurantDetail.tsx` to identify API call patterns
