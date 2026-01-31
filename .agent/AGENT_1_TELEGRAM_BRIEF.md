# Agent 1: Telegram Specialist - Launch Brief

**Agent ID:** `AGENT-1`  
**Territory:** `lib/telegram-actions.ts`, `lib/telegram-session.ts`, `lib/telegram-messages.ts`, `app/api/telegram/`
**Status:** 🟢 ACTIVE

---

## Your Mission

You are the **Telegram Specialist**. Your job is to refactor the monolithic `lib/telegram-actions.ts` (668 lines) into modular skills.

## Current File Locks (You Own)
```json
{
  "lib/telegram-actions.ts": { "agent": "AGENT-1", "started": "2026-01-31T10:49:00Z" },
  "lib/telegram-session.ts": { "agent": "AGENT-1", "started": "2026-01-31T10:49:00Z" },
  "lib/telegram-messages.ts": { "agent": "AGENT-1", "started": "2026-01-31T10:49:00Z" },
  "app/api/telegram/route.ts": { "agent": "AGENT-1", "started": "2026-01-31T10:49:00Z" }
}
```

## Skills Already Created (Use These)
- ✅ `lib/skills/telegram/send_message.ts` - Send messages to Telegram
- ✅ `lib/skills/telegram/handle_callback.ts` - Route callback queries
- ✅ `lib/skills/ai/search_restaurant.ts` - Search for restaurant info
- ✅ `lib/skills/ai/extract_info.ts` - Extract restaurant info from text

## Your Tasks

### Task 1: Create `add_restaurant` Skill
Extract `addRestaurantToDb()` function (L400-L452) into:
```
lib/skills/telegram/add_restaurant.ts
```

### Task 2: Create `process_photos` Skill
Extract `processPendingPhotos()` function (L454-L526) into:
```
lib/skills/telegram/process_photos.ts
```

### Task 3: Create `rate_restaurant` Skill
Extract `handleRateRestaurant()` function (L528-L558) into:
```
lib/skills/telegram/rate_restaurant.ts
```

### Task 4: Create `add_comment` Skill
Extract `handleAddComment()` function (L560-L602) into:
```
lib/skills/telegram/add_comment.ts
```

### Task 5: Refactor Main Handler
Update `handleTelegramUpdate()` to use the new skills instead of inline code.

## Rules
1. Follow the template in `SKILL_TEMPLATE.md`
2. Log your progress in `PROJECT_UPDATE_LOG.md` with prefix `[AGENT-1]`
3. After creating 3 skills, sync: `git add . && git commit -m "[AGENT-1] Skills batch" && git pull --rebase`
4. Do NOT touch files outside your territory without requesting a lock

## Dependencies
- You depend on `lib/skills/db/supabase_client.ts` (READY)
- You depend on `lib/skills/ai/search_restaurant.ts` (READY)

---

**Start by reading:** `lib/telegram-actions.ts` lines 400-602
