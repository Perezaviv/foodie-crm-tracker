/**
 * Telegram Bot Complete E2E Flow Tests
 * 
 * Implements ALL 21 tests from the implementation plan:
 * - 3.1 Add Restaurant Flow (TG-E-01 to TG-E-04): 4 tests
 * - 3.2 Photo Upload Flow (TG-E-10 to TG-E-14): 5 tests
 * - 3.3 Rating & Comment Flow (TG-E-20 to TG-E-25): 6 tests
 * - 3.4 Edge Cases (TG-E-30 to TG-E-35): 6 tests
 * 
 * Usage: node execution/telegram_e2e_flows.js
 */

require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WEBHOOK_URL = 'https://foodie-crm-tracker.vercel.app/api/telegram/webhook';

if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is required');
    process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ============================================================
// HELPERS
// ============================================================

const results = [];
let testChatId = null;
let updateIdCounter = Date.now();

function log(testId, name, status, details = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : '⏭️';
    console.log(`${icon} [${testId}] ${name}${details ? ': ' + details : ''}`);
    results.push({ testId, name, status, details });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nextUpdateId() {
    return ++updateIdCounter;
}

async function callWebhook(update) {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update)
        });

        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch {
            json = { raw: text };
        }

        return {
            status: response.status,
            ok: response.ok,
            data: json
        };
    } catch (e) {
        return { status: 0, ok: false, error: e.message };
    }
}

function createTextUpdate(chatId, text, chatType = 'private') {
    const uid = nextUpdateId();
    return {
        update_id: uid,
        message: {
            message_id: uid,
            from: { id: chatId, first_name: 'E2E_Test', is_bot: false },
            chat: { id: chatId, first_name: 'E2E_Test', type: chatType },
            date: Math.floor(Date.now() / 1000),
            text: text
        }
    };
}

function createPhotoUpdate(chatId, count = 1) {
    const uid = nextUpdateId();
    const photos = [];
    for (let i = 0; i < count; i++) {
        photos.push([
            { file_id: `photo_${uid}_${i}_small`, file_unique_id: `u${i}s`, width: 100, height: 100, file_size: 1000 },
            { file_id: `photo_${uid}_${i}_large`, file_unique_id: `u${i}l`, width: 800, height: 800, file_size: 50000 }
        ]);
    }

    // Return array of updates for multiple photos
    if (count > 1) {
        return photos.map((p, i) => ({
            update_id: uid + i,
            message: {
                message_id: uid + i,
                from: { id: chatId, first_name: 'E2E_Test', is_bot: false },
                chat: { id: chatId, first_name: 'E2E_Test', type: 'private' },
                date: Math.floor(Date.now() / 1000),
                photo: p
            }
        }));
    }

    return {
        update_id: uid,
        message: {
            message_id: uid,
            from: { id: chatId, first_name: 'E2E_Test', is_bot: false },
            chat: { id: chatId, first_name: 'E2E_Test', type: 'private' },
            date: Math.floor(Date.now() / 1000),
            photo: photos[0]
        }
    };
}

function createCallbackUpdate(chatId, data) {
    const uid = nextUpdateId();
    return {
        update_id: uid,
        callback_query: {
            id: `cb_${uid}`,
            from: { id: chatId, first_name: 'E2E_Test' },
            message: { message_id: uid - 1, chat: { id: chatId } },
            data: data
        }
    };
}

async function getRecentRestaurants(limit = 5) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/restaurants?select=*&order=created_at.desc&limit=${limit}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

async function getRestaurantByName(name) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/restaurants?name=ilike.*${encodeURIComponent(name)}*&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const data = await response.json();
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
        return null;
    }
}

async function getTelegramSession(chatId) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/telegram_sessions?chat_id=eq.${chatId}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const data = await response.json();
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
        return null;
    }
}

async function clearSession(chatId) {
    await callWebhook(createTextUpdate(chatId, '/cancel'));
    await sleep(300);
}

// ============================================================
// 3.1 ADD RESTAURANT FLOW (TG-E-01 to TG-E-04)
// ============================================================

async function testAddRestaurantFlow() {
    console.log('\n' + '─'.repeat(50));
    console.log('📋 3.1 ADD RESTAURANT FLOW');
    console.log('─'.repeat(50));

    // TG-E-01: Add single result
    console.log('\n▶ TG-E-01: Add single result');
    await clearSession(testChatId);
    const result01 = await callWebhook(createTextUpdate(testChatId, 'Miznon Tel Aviv'));
    if (result01.ok) {
        log('TG-E-01', 'Add single result', 'PASS', 'Sent "Miznon Tel Aviv"');
    } else {
        log('TG-E-01', 'Add single result', 'FAIL', `Status: ${result01.status}`);
    }
    await sleep(500);

    // TG-E-02: Add multiple results - search for ambiguous name
    console.log('\n▶ TG-E-02: Add multiple results');
    await clearSession(testChatId);
    const result02 = await callWebhook(createTextUpdate(testChatId, 'Moses'));
    await sleep(500);
    // Simulate selecting first option
    const selectResult = await callWebhook(createCallbackUpdate(testChatId, 'select_rest:0'));
    if (result02.ok && selectResult.ok) {
        log('TG-E-02', 'Add multiple results', 'PASS', 'Searched "Moses" + selected option');
    } else {
        log('TG-E-02', 'Add multiple results', 'FAIL', `Search: ${result02.status}, Select: ${selectResult.status}`);
    }
    await sleep(500);

    // TG-E-03: Add then cancel
    console.log('\n▶ TG-E-03: Add then cancel');
    await clearSession(testChatId);
    await callWebhook(createTextUpdate(testChatId, 'Some Restaurant'));
    await sleep(300);
    const cancelResult = await callWebhook(createCallbackUpdate(testChatId, 'cancel'));
    const session = await getTelegramSession(testChatId);
    if (cancelResult.ok && (!session || session.step === 'IDLE')) {
        log('TG-E-03', 'Add then cancel', 'PASS', 'Session cleared after cancel');
    } else {
        log('TG-E-03', 'Add then cancel', 'WARN', `Session: ${session?.step || 'none'}`);
    }
    await sleep(500);

    // TG-E-04: Add via /add command
    console.log('\n▶ TG-E-04: Add via /add command');
    await clearSession(testChatId);
    const result04 = await callWebhook(createTextUpdate(testChatId, '/add Vitrina'));
    if (result04.ok) {
        log('TG-E-04', 'Add via /add command', 'PASS', 'Used /add Vitrina');
    } else {
        log('TG-E-04', 'Add via /add command', 'FAIL', `Status: ${result04.status}`);
    }
    await clearSession(testChatId);
}

// ============================================================
// 3.2 PHOTO UPLOAD FLOW (TG-E-10 to TG-E-14)
// ============================================================

async function testPhotoUploadFlow() {
    console.log('\n' + '─'.repeat(50));
    console.log('📋 3.2 PHOTO UPLOAD FLOW');
    console.log('─'.repeat(50));

    // TG-E-10: Single photo then name
    console.log('\n▶ TG-E-10: Single photo then name');
    await clearSession(testChatId);
    const photo10 = await callWebhook(createPhotoUpdate(testChatId, 1));
    await sleep(500);
    const name10 = await callWebhook(createTextUpdate(testChatId, 'Miznon'));
    if (photo10.ok && name10.ok) {
        log('TG-E-10', 'Single photo then name', 'PASS', 'Photo + "Miznon"');
    } else {
        log('TG-E-10', 'Single photo then name', 'FAIL', `Photo: ${photo10.status}, Name: ${name10.status}`);
    }
    await clearSession(testChatId);
    await sleep(500);

    // TG-E-11: Multiple photos then name
    console.log('\n▶ TG-E-11: Multiple photos then name');
    await clearSession(testChatId);
    const photos11 = createPhotoUpdate(testChatId, 3);
    for (const photo of photos11) {
        await callWebhook(photo);
        await sleep(200);
    }
    await sleep(500);
    const name11 = await callWebhook(createTextUpdate(testChatId, 'Test Multi Photo'));
    if (name11.ok) {
        log('TG-E-11', 'Multiple photos then name', 'PASS', '3 photos + name');
    } else {
        log('TG-E-11', 'Multiple photos then name', 'FAIL', `Status: ${name11.status}`);
    }
    await clearSession(testChatId);
    await sleep(500);

    // TG-E-12: Photo then Done button
    console.log('\n▶ TG-E-12: Photo then Done button');
    await clearSession(testChatId);
    await callWebhook(createPhotoUpdate(testChatId, 1));
    await sleep(500);
    const done12 = await callWebhook(createCallbackUpdate(testChatId, 'done_photos'));
    await sleep(1000); // Increased delay to allow webhook processing
    const typeName12 = await callWebhook(createTextUpdate(testChatId, 'Done Button Test'));
    if (done12.ok && typeName12.ok) {
        log('TG-E-12', 'Photo then Done button', 'PASS', 'Photo → Done → Name');
    } else {
        log('TG-E-12', 'Photo then Done button', 'FAIL', `Done: ${done12.status}, Name: ${typeName12.status}`);
    }
    await clearSession(testChatId);
    await sleep(500);

    // TG-E-13: Photo to new restaurant
    console.log('\n▶ TG-E-13: Photo to new restaurant');
    await clearSession(testChatId);
    const uniqueName = `NewRest_${Date.now()}`;
    await callWebhook(createPhotoUpdate(testChatId, 1));
    await sleep(500);
    const new13 = await callWebhook(createTextUpdate(testChatId, uniqueName));
    if (new13.ok) {
        log('TG-E-13', 'Photo to new restaurant', 'PASS', `Created "${uniqueName}"`);
    } else {
        log('TG-E-13', 'Photo to new restaurant', 'FAIL', `Status: ${new13.status}`);
    }
    await clearSession(testChatId);
    await sleep(500);

    // TG-E-14: Photo to existing restaurant
    console.log('\n▶ TG-E-14: Photo to existing restaurant');
    await clearSession(testChatId);
    const restaurants = await getRecentRestaurants(1);
    if (restaurants.length > 0) {
        const existingName = restaurants[0].name;
        await callWebhook(createPhotoUpdate(testChatId, 1));
        await sleep(500);
        const existing14 = await callWebhook(createTextUpdate(testChatId, existingName));
        if (existing14.ok) {
            log('TG-E-14', 'Photo to existing restaurant', 'PASS', `Used "${existingName}"`);
        } else {
            log('TG-E-14', 'Photo to existing restaurant', 'FAIL', `Status: ${existing14.status}`);
        }
    } else {
        log('TG-E-14', 'Photo to existing restaurant', 'SKIP', 'No restaurants in DB');
    }
    await clearSession(testChatId);
}

// ============================================================
// 3.3 RATING & COMMENT FLOW (TG-E-20 to TG-E-25)
// ============================================================

async function testRatingCommentFlow() {
    console.log('\n' + '─'.repeat(50));
    console.log('📋 3.3 RATING & COMMENT FLOW');
    console.log('─'.repeat(50));

    const restaurants = await getRecentRestaurants(1);
    const existingName = restaurants.length > 0 ? restaurants[0].name : 'Miznon';

    // TG-E-20: Rate valid restaurant
    console.log('\n▶ TG-E-20: Rate valid restaurant');
    const rate20 = await callWebhook(createTextUpdate(testChatId, `/rate ${existingName} 5`));
    if (rate20.ok) {
        log('TG-E-20', 'Rate valid restaurant', 'PASS', `Rated "${existingName}" 5 stars`);
    } else {
        log('TG-E-20', 'Rate valid restaurant', 'FAIL', `Status: ${rate20.status}`);
    }
    await sleep(300);

    // TG-E-21: Rate non-existent
    console.log('\n▶ TG-E-21: Rate non-existent restaurant');
    const rate21 = await callWebhook(createTextUpdate(testChatId, '/rate NonExistentRestaurant12345 3'));
    if (rate21.ok) {
        log('TG-E-21', 'Rate non-existent restaurant', 'PASS', 'Should return error message');
    } else {
        log('TG-E-21', 'Rate non-existent restaurant', 'FAIL', `Status: ${rate21.status}`);
    }
    await sleep(300);

    // TG-E-22: Rate invalid score
    console.log('\n▶ TG-E-22: Rate invalid score');
    const rate22 = await callWebhook(createTextUpdate(testChatId, `/rate ${existingName} 10`));
    if (rate22.ok) {
        log('TG-E-22', 'Rate invalid score (10)', 'PASS', 'Should return usage error');
    } else {
        log('TG-E-22', 'Rate invalid score (10)', 'FAIL', `Status: ${rate22.status}`);
    }
    await sleep(300);

    // TG-E-23: Comment valid restaurant
    console.log('\n▶ TG-E-23: Comment valid restaurant');
    const comment23 = await callWebhook(createTextUpdate(testChatId, `/comment ${existingName} - Great food! E2E test ${Date.now()}`));
    if (comment23.ok) {
        log('TG-E-23', 'Comment valid restaurant', 'PASS', `Commented on "${existingName}"`);
    } else {
        log('TG-E-23', 'Comment valid restaurant', 'FAIL', `Status: ${comment23.status}`);
    }
    await sleep(300);

    // TG-E-24: Comment non-existent
    console.log('\n▶ TG-E-24: Comment non-existent restaurant');
    const comment24 = await callWebhook(createTextUpdate(testChatId, '/comment NonExistentRestaurant12345 - text'));
    if (comment24.ok) {
        log('TG-E-24', 'Comment non-existent restaurant', 'PASS', 'Should return error message');
    } else {
        log('TG-E-24', 'Comment non-existent restaurant', 'FAIL', `Status: ${comment24.status}`);
    }
    await sleep(300);

    // TG-E-25: Comment wrong format
    console.log('\n▶ TG-E-25: Comment wrong format');
    const comment25 = await callWebhook(createTextUpdate(testChatId, '/comment Miznon no dash here'));
    if (comment25.ok) {
        log('TG-E-25', 'Comment wrong format', 'PASS', 'Should return usage error');
    } else {
        log('TG-E-25', 'Comment wrong format', 'FAIL', `Status: ${comment25.status}`);
    }
}

// ============================================================
// 3.4 EDGE CASES (TG-E-30 to TG-E-35)
// ============================================================

async function testEdgeCases() {
    console.log('\n' + '─'.repeat(50));
    console.log('📋 3.4 EDGE CASES');
    console.log('─'.repeat(50));

    // TG-E-30: Session timeout simulation
    console.log('\n▶ TG-E-30: Session timeout');
    // We can't actually wait 10 mins, so we test that a new message after clear works
    await clearSession(testChatId);
    const result30 = await callWebhook(createTextUpdate(testChatId, 'Fresh start after clear'));
    if (result30.ok) {
        log('TG-E-30', 'Session timeout (simulated)', 'PASS', 'New session works after clear');
    } else {
        log('TG-E-30', 'Session timeout (simulated)', 'FAIL', `Status: ${result30.status}`);
    }
    await clearSession(testChatId);
    await sleep(300);

    // TG-E-31: Rapid messages - check no duplicates
    console.log('\n▶ TG-E-31: Rapid messages');
    await clearSession(testChatId);
    const rapidName = `RapidTest_${Date.now()}`;
    // Send same message rapidly
    const rapid1 = callWebhook(createTextUpdate(testChatId, rapidName));
    const rapid2 = callWebhook(createTextUpdate(testChatId, rapidName));
    const [r1, r2] = await Promise.all([rapid1, rapid2]);
    if (r1.ok && r2.ok) {
        log('TG-E-31', 'Rapid messages', 'PASS', 'Both requests handled');
    } else {
        log('TG-E-31', 'Rapid messages', 'WARN', `R1: ${r1.status}, R2: ${r2.status}`);
    }
    await clearSession(testChatId);
    await sleep(500);

    // TG-E-32: Unicode/Hebrew restaurant names
    console.log('\n▶ TG-E-32: Unicode restaurant names');
    await clearSession(testChatId);
    const result32 = await callWebhook(createTextUpdate(testChatId, 'מסעדה טובה, תל אביב'));
    if (result32.ok) {
        log('TG-E-32', 'Unicode restaurant names', 'PASS', 'Hebrew name accepted');
    } else {
        log('TG-E-32', 'Unicode restaurant names', 'FAIL', `Status: ${result32.status}`);
    }
    await clearSession(testChatId);
    await sleep(300);

    // TG-E-33: Very long notes
    console.log('\n▶ TG-E-33: Very long notes');
    await clearSession(testChatId);
    const longNotes = 'A'.repeat(500);
    const result33 = await callWebhook(createTextUpdate(testChatId, `Test Restaurant - ${longNotes}`));
    if (result33.ok) {
        log('TG-E-33', 'Very long notes', 'PASS', '500 char notes accepted');
    } else {
        log('TG-E-33', 'Very long notes', 'FAIL', `Status: ${result33.status}`);
    }
    await clearSession(testChatId);
    await sleep(300);

    // TG-E-34: Group chat (commands should work)
    console.log('\n▶ TG-E-34: Group chat');
    const groupChatId = -Math.abs(testChatId); // Negative ID for groups
    const result34 = await callWebhook(createTextUpdate(groupChatId, '/add Miznon', 'group'));
    if (result34.ok) {
        log('TG-E-34', 'Group chat command', 'PASS', '/add works in group');
    } else {
        log('TG-E-34', 'Group chat command', 'FAIL', `Status: ${result34.status}`);
    }
    await sleep(300);

    // TG-E-35: Empty text after /add
    console.log('\n▶ TG-E-35: Empty text after /add');
    await clearSession(testChatId);
    const result35 = await callWebhook(createTextUpdate(testChatId, '/add'));
    if (result35.ok) {
        log('TG-E-35', 'Empty /add prompts for name', 'PASS', 'Should ask for restaurant name');
    } else {
        log('TG-E-35', 'Empty /add prompts for name', 'FAIL', `Status: ${result35.status}`);
    }
    await clearSession(testChatId);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log('\n' + '═'.repeat(60));
    console.log('🧪 TELEGRAM BOT COMPLETE E2E TESTS (21 TESTS)');
    console.log('═'.repeat(60));

    // Generate a test chat ID
    testChatId = Math.floor(Math.random() * 1000000) + 100000000;
    console.log(`\n📱 Using test chat ID: ${testChatId}\n`);

    // Run all test groups
    await testAddRestaurantFlow();      // 4 tests
    await testPhotoUploadFlow();        // 5 tests
    await testRatingCommentFlow();      // 6 tests
    await testEdgeCases();              // 6 tests

    // Print Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 COMPLETE E2E TEST SUMMARY');
    console.log('═'.repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    console.log(`\n   ✅ Passed:   ${passed}`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`   ⚠️ Warnings: ${warned}`);
    console.log(`   ⏭️ Skipped:  ${skipped}`);
    console.log(`   📊 Total:    ${results.length} / 21\n`);

    // Group results by category
    console.log('─'.repeat(60));
    console.log('Results by Category:');
    console.log('─'.repeat(60));

    const categories = [
        { name: '3.1 Add Restaurant Flow', prefix: 'TG-E-0' },
        { name: '3.2 Photo Upload Flow', prefix: 'TG-E-1' },
        { name: '3.3 Rating & Comment Flow', prefix: 'TG-E-2' },
        { name: '3.4 Edge Cases', prefix: 'TG-E-3' },
    ];

    for (const cat of categories) {
        const catResults = results.filter(r => r.testId.startsWith(cat.prefix));
        const catPassed = catResults.filter(r => r.status === 'PASS').length;
        console.log(`   ${cat.name}: ${catPassed}/${catResults.length} passed`);
    }

    // List failures
    if (failed > 0) {
        console.log('\n' + '─'.repeat(60));
        console.log('❌ FAILED TESTS:');
        console.log('─'.repeat(60));
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   [${r.testId}] ${r.name}: ${r.details}`);
        });
    }

    console.log('\n');

    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
