# Agent 3: AI/Search Specialist - Launch Brief

**Agent ID:** `AGENT-3`  
**Territory:** `lib/ai/search.ts`, `lib/ai/parser.ts`, `lib/ai/index.ts`, `lib/geocoding.ts`
**Status:** 🟢 ACTIVE

---

## Your Mission

You are the **AI/Search Specialist**. Your job is to ensure AI skills are complete and to improve the search/parsing logic.

## Current File Locks (You Own)
```json
{
  "lib/ai/search.ts": { "agent": "AGENT-3", "started": "2026-01-31T10:49:00Z" },
  "lib/ai/parser.ts": { "agent": "AGENT-3", "started": "2026-01-31T10:49:00Z" },
  "lib/ai/index.ts": { "agent": "AGENT-3", "started": "2026-01-31T10:49:00Z" },
  "lib/geocoding.ts": { "agent": "AGENT-3", "started": "2026-01-31T10:49:00Z" },
  "lib/skills/ai/*": { "agent": "AGENT-3", "started": "2026-01-31T10:49:00Z" }
}
```

## Skills Already Created (You Own These)
- ✅ `lib/skills/ai/search_restaurant.ts` - Tavily search integration
- ✅ `lib/skills/ai/extract_info.ts` - Gemini-based text extraction

## Your Tasks

### Task 1: Create `geocode_address` Skill
Extract and enhance geocoding logic into:
```
lib/skills/ai/geocode_address.ts
```
- Use Google Geocoding API
- Add caching for repeated lookups
- Return structured coordinates + formatted address

### Task 2: Create `parse_booking_link` Skill
Extract booking link parsing from `search.ts` into:
```
lib/skills/ai/parse_booking_link.ts
```
- Detect Tabit, Ontopo, OpenTable, etc.
- Score and rank booking links
- Filter out generic/landing pages

### Task 3: Enhance `search_restaurant` Skill
- Add retry logic for API failures
- Add result caching (in-memory or session-based)
- Improve address pattern matching for Hebrew addresses

### Task 4: Update `lib/ai/index.ts`
Make it re-export from skills:
```typescript
// lib/ai/index.ts
export * from '../skills/ai';
```

### Task 5: Add Unit Tests
Create tests for AI skills:
```
__tests__/skills/ai/search_restaurant.test.ts
__tests__/skills/ai/extract_info.test.ts
```

## Rules
1. Follow the template in `SKILL_TEMPLATE.md`
2. Log your progress in `PROJECT_UPDATE_LOG.md` with prefix `[AGENT-3]`
3. After creating 3 skills, sync: `git add . && git commit -m "[AGENT-3] AI skills batch" && git pull --rebase`
4. Do NOT touch files outside your territory without requesting a lock

## Dependencies
- None (you are a dependency provider)
- AGENT-1 depends on your skills

---

**Start by reading:** `lib/ai/search.ts` to understand current Tavily integration
