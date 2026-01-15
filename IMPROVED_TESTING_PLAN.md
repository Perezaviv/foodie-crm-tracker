# Improved Testing Strategy for Telegram Bot Features

## Why Previous Tests Didn't Catch These Issues

### Test Coverage Gap Analysis

| Issue | What Tests Did | Why They Missed It |
|-------|---------------|-------------------|
| Photo RLS Error | Mock `supabase.storage.upload()` to return `{ error: null }` | Never tested real storage RLS policies |
| Comments RLS Error | Mock `supabase.from('comments').insert()` to succeed | Never tested real database RLS policies |
| Telegram API Errors | Mock `global.fetch` to always return `{ ok: true }` | Never tested real Telegram file API |

### Core Problem
All unit tests **mock external dependencies completely**, which means:
- ✅ They test business logic in isolation
- ❌ They never verify real API behavior
- ❌ They never verify real RLS policies
- ❌ They never catch environment configuration issues

---

## Recommended Testing Improvements

### 1. Smoke Tests with Real Services (Gated)

Create tests that can optionally run against real services when environment variables are present:

```javascript
// __tests__/smoke/database.smoke.test.ts
describe('Database Smoke Tests', () => {
    const hasRealDb = process.env.SMOKE_TEST_ENABLED && 
                     process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    const itIfReal = hasRealDb ? it : it.skip;
    
    itIfReal('can insert and read comments', async () => {
        const supabase = createAdminClient();
        const testComment = {
            restaurant_id: 'TEST-UUID',
            content: 'Smoke test comment',
            author_name: 'Test',
        };
        
        const { error: insertError } = await supabase
            .from('comments')
            .insert(testComment);
        
        expect(insertError).toBeNull(); // Will fail if RLS blocks it
        
        // Cleanup
        await supabase
            .from('comments')
            .delete()
            .eq('content', 'Smoke test comment');
    });
});
```

### 2. Error Message Validation Tests

Test that error messages provide useful debugging info:

```javascript
describe('Error Handling', () => {
    it('photo error includes chatId for debugging', async () => {
        const consoleSpy = jest.spyOn(console, 'error');
        
        // Mock to cause error
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));
        
        await handleTelegramUpdate(photoUpdateFixture);
        
        expect(consoleSpy).toHaveBeenCalledWith(
            '[TG] Error handling photo - Full details:',
            expect.objectContaining({ chatId: expect.any(Number) })
        );
    });
});
```

### 3. RLS Policy Verification Checklist

Before any RLS-dependent feature is considered "tested":

- [ ] Policy SQL file exists in `supabase/` directory
- [ ] Policy covers `anon` role if feature is used without auth
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is documented in `.env.example`
- [ ] Manual test performed against live Supabase

### 4. Telegram API Integration Test Script

Extend `execution/telegram_e2e_test.js` to include:

```javascript
// Add these tests to telegram_e2e_test.js

async function testPhotoUpload() {
    // This test requires a real chat ID and manual photo send
    console.log('📸 Photo Upload Test');
    console.log('   1. Send a photo to the bot');
    console.log('   2. Check Vercel logs for [TG] prefixed messages');
    console.log('   3. Verify photo appears in Supabase storage');
    
    // Could be automated with:
    // - A test image file
    // - sendPhoto API call to bot's chat
    // - Database verification after delay
}

async function testCommentViaBot() {
    const testChatId = /* from config or env */;
    
    // Simulate /comment command via webhook
    const webhookPayload = {
        update_id: Date.now(),
        message: {
            message_id: 1,
            from: { id: 123, first_name: 'Test', is_bot: false },
            chat: { id: testChatId, first_name: 'Test', type: 'private' },
            date: Date.now() / 1000,
            text: '/comment TestRestaurant - E2E test comment'
        }
    };
    
    const response = await fetch(`${WEBHOOK_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
    });
    
    if (response.ok) {
        // Verify comment was created in DB
        const comments = await getCommentsFromDb('TestRestaurant');
        const found = comments.some(c => c.content.includes('E2E test'));
        log('E2E-Comment', 'Add comment via Telegram', found ? 'PASS' : 'FAIL');
    }
}
```

---

## Testing Checklist for New Features

When adding features that interact with:

### External APIs (Telegram, AI, etc.)
- [ ] Add logging at each API call point
- [ ] Log full error details, not just generic messages
- [ ] Include request IDs or identifiers in logs
- [ ] Test with intentionally wrong API keys to verify error handling

### Supabase RLS-Protected Tables  
- [ ] Create SQL policy file in `supabase/`
- [ ] Document required roles (anon, authenticated, service)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` if server-side access needed
- [ ] Test locally with and without service role key

### Environment Variables
- [ ] Document all new env vars in `.env.example`
- [ ] Log warnings when optional vars are missing
- [ ] Provide clear error messages for required vars

---

## Quick Reference: Test Locations

| Component | Unit Tests | Integration Tests | Smoke Tests |
|-----------|-----------|------------------|-------------|
| `telegram-actions.ts` | `__tests__/unit/telegram.test.ts` | `__tests__/integration/telegram-webhook.test.ts` | Manual + E2E script |
| Comments API | - | - | **NEEDS CREATION** |
| Photo Storage | - | - | **NEEDS CREATION** |
| RLS Policies | - | - | **NEEDS CREATION** |
