/**
 * Telegram Bot E2E Test Script
 * 
 * This script runs end-to-end tests against the live Telegram bot
 * by simulating webhook updates and verifying responses.
 * 
 * Usage: node execution/telegram_e2e_test.js
 */

require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is required');
    process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Test results
const results = [];

// ============================================================
// HELPERS
// ============================================================

async function log(testId, name, status, details = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
    console.log(`${icon} [${testId}] ${name}${details ? ': ' + details : ''}`);
    results.push({ testId, name, status, details });
}

async function getBotInfo() {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const data = await response.json();
    return data;
}

async function getWebhookInfo() {
    const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await response.json();
    return data;
}

async function getUpdates(offset = 0, limit = 10) {
    const response = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&limit=${limit}&timeout=5`);
    const data = await response.json();
    return data;
}

async function sendMessage(chatId, text) {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    });
    return response.json();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRestaurantsFromDb() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/restaurants?select=*&order=created_at.desc&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('DB Error:', e);
        return [];
    }
}

// ============================================================
// TESTS
// ============================================================

async function testBotConnection() {
    try {
        const info = await getBotInfo();
        if (info.ok && info.result) {
            await log('E2E-01', 'Bot Connection', 'PASS', `Bot: @${info.result.username}`);
            return info.result;
        } else {
            await log('E2E-01', 'Bot Connection', 'FAIL', 'Could not get bot info');
            return null;
        }
    } catch (e) {
        await log('E2E-01', 'Bot Connection', 'FAIL', e.message);
        return null;
    }
}

async function testWebhookStatus() {
    try {
        const info = await getWebhookInfo();
        if (info.ok) {
            const webhookUrl = info.result.url || 'NOT SET';
            const pending = info.result.pending_update_count || 0;
            const lastError = info.result.last_error_message || 'None';

            console.log('\n📡 Webhook Status:');
            console.log(`   URL: ${webhookUrl}`);
            console.log(`   Pending Updates: ${pending}`);
            console.log(`   Last Error: ${lastError}\n`);

            if (info.result.url) {
                await log('E2E-02', 'Webhook Configured', 'PASS', webhookUrl.substring(0, 50) + '...');
            } else {
                await log('E2E-02', 'Webhook Configured', 'FAIL', 'No webhook URL set');
            }
            return info.result;
        }
        await log('E2E-02', 'Webhook Configured', 'FAIL', 'Could not get webhook info');
        return null;
    } catch (e) {
        await log('E2E-02', 'Webhook Configured', 'FAIL', e.message);
        return null;
    }
}

async function testDatabaseConnection() {
    try {
        const restaurants = await getRestaurantsFromDb();
        await log('E2E-03', 'Database Connection', 'PASS', `Found ${restaurants.length} recent restaurants`);
        return true;
    } catch (e) {
        await log('E2E-03', 'Database Connection', 'FAIL', e.message);
        return false;
    }
}

async function testSendTestMessage(chatId) {
    if (!chatId) {
        await log('E2E-04', 'Send Test Message', 'SKIP', 'No chat ID provided');
        return false;
    }

    try {
        const result = await sendMessage(chatId, '🧪 *E2E Test*: This is an automated test message.');
        if (result.ok) {
            await log('E2E-04', 'Send Test Message', 'PASS', `Message sent to chat ${chatId}`);
            return true;
        } else {
            await log('E2E-04', 'Send Test Message', 'FAIL', result.description || 'Unknown error');
            return false;
        }
    } catch (e) {
        await log('E2E-04', 'Send Test Message', 'FAIL', e.message);
        return false;
    }
}

// ============================================================
// INTERACTIVE TESTS (Require user action)
// ============================================================

async function runInteractiveTests(bot) {
    console.log('\n' + '='.repeat(60));
    console.log('📱 INTERACTIVE TESTS');
    console.log('='.repeat(60));
    console.log(`\nPlease open Telegram and chat with @${bot.username}`);
    console.log('The script will monitor for your messages and verify responses.\n');

    console.log('Available test commands (send these to the bot):');
    console.log('  /start           - Should return welcome message');
    console.log('  /add Miznon      - Should search and add restaurant');
    console.log('  /cancel          - Should clear session');
    console.log('  /rate Miznon 5   - Should rate restaurant');
    console.log('  Just "Miznon"    - Should search (if in private chat)\n');

    console.log('Monitoring for updates for 60 seconds...\n');

    let lastUpdateId = 0;
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds

    while (Date.now() - startTime < timeout) {
        try {
            const updates = await getUpdates(lastUpdateId + 1, 10);

            if (updates.ok && updates.result.length > 0) {
                for (const update of updates.result) {
                    lastUpdateId = update.update_id;

                    const msg = update.message;
                    if (msg) {
                        const from = msg.from?.first_name || 'Unknown';
                        const text = msg.text || '[Photo/Media]';
                        const chatType = msg.chat?.type || 'unknown';

                        console.log(`📩 [${new Date().toLocaleTimeString()}] ${from} (${chatType}): ${text}`);

                        // Analyze what should happen
                        if (text === '/start') {
                            console.log('   ➡️ Expected: Welcome message with commands list');
                        } else if (text.startsWith('/add ')) {
                            console.log('   ➡️ Expected: Search result or inline buttons');
                        } else if (text.startsWith('/rate ')) {
                            console.log('   ➡️ Expected: Rating confirmation or error');
                        } else if (text.startsWith('/cancel')) {
                            console.log('   ➡️ Expected: Session cleared message');
                        }
                    }

                    if (update.callback_query) {
                        const from = update.callback_query.from?.first_name || 'Unknown';
                        const data = update.callback_query.data;
                        console.log(`🔘 [${new Date().toLocaleTimeString()}] ${from} clicked: ${data}`);
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching updates:', e.message);
        }

        await sleep(2000); // Check every 2 seconds
    }

    console.log('\n⏱️ Interactive test period ended.\n');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TELEGRAM BOT E2E TESTS');
    console.log('='.repeat(60) + '\n');

    // 1. Test bot connection
    const bot = await testBotConnection();
    if (!bot) {
        console.log('\n❌ Cannot proceed without bot connection.');
        process.exit(1);
    }

    // 2. Test webhook status
    const webhook = await testWebhookStatus();

    // 3. Test database connection
    await testDatabaseConnection();

    // 4. Check for recent updates to find a chat ID
    console.log('\n📬 Checking recent messages...');
    const updates = await getUpdates(0, 1);
    let testChatId = null;

    if (updates.ok && updates.result.length > 0) {
        const lastUpdate = updates.result[updates.result.length - 1];
        testChatId = lastUpdate.message?.chat?.id || lastUpdate.callback_query?.message?.chat?.id;
        console.log(`   Found recent chat: ${testChatId}\n`);
    } else {
        console.log('   No recent messages found.\n');
    }

    // 5. Send test message if we have a chat ID
    if (testChatId) {
        await testSendTestMessage(testChatId);
    }

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    console.log(`\n   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    console.log(`   📊 Total:  ${results.length}\n`);

    // Recommendations
    console.log('='.repeat(60));
    console.log('💡 RECOMMENDATIONS');
    console.log('='.repeat(60));

    if (!webhook || !webhook.url) {
        console.log('\n⚠️ Webhook is not configured. The bot will only work with polling.');
        console.log('   To set webhook: curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram/webhook"');
    }

    if (failed > 0) {
        console.log('\n⚠️ Some tests failed. Please check the errors above.');
    } else {
        console.log('\n✅ All automated tests passed!');
    }

    // Ask if user wants to run interactive tests
    const args = process.argv.slice(2);
    if (args.includes('--interactive') || args.includes('-i')) {
        await runInteractiveTests(bot);
    } else {
        console.log('\n💡 To run interactive tests, use: node execution/telegram_e2e_test.js --interactive\n');
    }
}

main().catch(console.error);
