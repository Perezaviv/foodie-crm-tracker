# Agent 4: API/Infra Specialist - Launch Brief

**Agent ID:** `AGENT-4`  
**Territory:** `lib/supabase.ts`, `app/api/restaurants/*`, `app/api/photos/*`, `app/api/geocode/*`, `lib/skills/db/*`
**Status:** 🟢 ACTIVE

---

## Your Mission

You are the **API/Infra Specialist**. Your job is to unify API routes to use skills and ensure database patterns are consistent.

## Current File Locks (You Own)
```json
{
  "lib/supabase.ts": { "agent": "AGENT-4", "started": "2026-01-31T10:49:00Z" },
  "app/api/restaurants/route.ts": { "agent": "AGENT-4", "started": "2026-01-31T10:49:00Z" },
  "app/api/restaurants/[id]/route.ts": { "agent": "AGENT-4", "started": "2026-01-31T10:49:00Z" },
  "app/api/photos/route.ts": { "agent": "AGENT-4", "started": "2026-01-31T10:49:00Z" },
  "app/api/geocode/route.ts": { "agent": "AGENT-4", "started": "2026-01-31T10:49:00Z" },
  "lib/skills/db/*": { "agent": "AGENT-4", "started": "2026-01-31T10:49:00Z" }
}
```

## Skills Already Created (You Own These)
- ✅ `lib/skills/db/supabase_client.ts` - Unified client factory

## Your Tasks

### Task 1: Create `restaurant_crud` Skill
Extract DB operations into:
```
lib/skills/db/restaurant_crud.ts
```
- `getRestaurants()` - List all
- `getRestaurantById(id)` - Get single
- `createRestaurant(data)` - Create new
- `updateRestaurant(id, data)` - Update
- `deleteRestaurant(id)` - Delete

### Task 2: Create `photo_crud` Skill
Extract photo DB operations into:
```
lib/skills/db/photo_crud.ts
```
- `getPhotos(restaurantId)` - List photos
- `uploadPhoto(file, restaurantId)` - Upload to storage + DB
- `deletePhoto(photoId)` - Delete from storage + DB

### Task 3: Create `comment_crud` Skill
Extract comment operations into:
```
lib/skills/db/comment_crud.ts
```
- `getComments(restaurantId)` - List comments
- `addComment(restaurantId, text)` - Add comment

### Task 4: Refactor API Routes
Update all API routes to use the CRUD skills:
- `app/api/restaurants/route.ts` → use `restaurant_crud`
- `app/api/restaurants/[id]/route.ts` → use `restaurant_crud`
- `app/api/photos/route.ts` → use `photo_crud`

### Task 5: Update `lib/supabase.ts`
Make it re-export from skills:
```typescript
// lib/supabase.ts
export * from './skills/db';
```

## Rules
1. Follow the template in `SKILL_TEMPLATE.md`
2. Log your progress in `PROJECT_UPDATE_LOG.md` with prefix `[AGENT-4]`
3. After creating 3 skills, sync: `git add . && git commit -m "[AGENT-4] DB skills batch" && git pull --rebase`
4. Do NOT touch files outside your territory without requesting a lock

## Dependencies
- None (you are the foundation)
- ALL other agents depend on your `supabase_client` skill

---

**Start by reading:** `app/api/restaurants/route.ts` to understand current DB patterns
