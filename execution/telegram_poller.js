/**
 * Telegram Bot Poller for Foodie CRM
 * 
 * This script connects to Telegram via long polling and listens for messages.
 * When a user sends a message, it parses the content and adds a restaurant
 * to the Supabase database.
 * 
 * Usage: node execution/telegram_poller.js
 * 
 * Required environment variables:
 *   - TELEGRAM_BOT_TOKEN
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

/* eslint-disable @typescript-eslint/no-require-imports */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// Import shared logic (using require for Node script)
// Note: We need to use ts-node or compile typescript to use the shared file directly.
// Since this is a simple script, and mixing JS/TS is tricky without build step,
// I will keep the logic here for now, but formatted exactly like the shared logic
// so it matches behavior. 
// Ideally, we would run this with `npx ts-node execution/telegram_poller.ts` 
// but sticking to JS for simplicity of execution without dev deps.

// ============================================================
// CONFIGURATION
// ============================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase environment variables are not set in .env');
    process.exit(1);
}

// ============================================================
// INITIALIZE CLIENTS
// ============================================================

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// LOGIC (Mirrors lib/telegram-actions.ts)
// ============================================================

function parseRestaurantMessage(text) {
    const trimmed = text.trim();

    // Check for notes (after dash)
    let mainPart = trimmed;
    let notes = null;

    const dashIndex = trimmed.indexOf(' - ');
    if (dashIndex !== -1) {
        mainPart = trimmed.substring(0, dashIndex).trim();
        notes = trimmed.substring(dashIndex + 3).trim();
    }

    // Check for city (after comma)
    let name = mainPart;
    let city = null;

    const commaIndex = mainPart.indexOf(',');
    if (commaIndex !== -1) {
        name = mainPart.substring(0, commaIndex).trim();
        city = mainPart.substring(commaIndex + 1).trim();
    }

    return {
        name: name || null,
        city: city || null,
        notes: notes || null,
    };
}

async function addRestaurantFromText(text, supabaseClient) {
    const parsed = parseRestaurantMessage(text);

    if (!parsed.name) {
        return {
            success: false,
            message: '❌ Please send a restaurant name.',
        };
    }

    try {
        const { data, error } = await supabaseClient
            .from('restaurants')
            .insert({
                name: parsed.name,
                city: parsed.city,
                notes: parsed.notes,
                is_visited: false,
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase error:', error);
            return {
                success: false,
                error: error.message,
                message: `❌ Failed to add restaurant: ${error.message}`,
            };
        }

        let successMessage = `✅ Added *${parsed.name}*`;
        if (parsed.city) {
            successMessage += ` in ${parsed.city}`;
        }
        successMessage += ` to your list!`;

        return {
            success: true,
            restaurant: data,
            message: successMessage,
        };

    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return {
            success: false,
            error: err.message,
            message: '❌ An unexpected error occurred. Please try again.',
        };
    }
}

// ============================================================
// BOT HANDLERS
// ============================================================

// /start command
bot.start((ctx) => {
    const welcomeMessage = `
🍽️ *Welcome to Foodie CRM Bot!*

Send me a restaurant name and I'll add it to your list.

*Formats I understand:*
• \`Restaurant Name\`
• \`Restaurant Name, City\`
• \`Restaurant Name, City - notes\`

*Example:*
\`Miznon, Tel Aviv - amazing pita!\`
    `.trim();

    ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

// /help command
bot.help((ctx) => {
    const helpMessage = `
🆘 *Foodie CRM Bot Help*

*Commands:*
/start - Welcome message
/help - This help message

*To add a restaurant:*
Just send a message with the restaurant name!

*Formats:*
• \`Name\` - Just the name
• \`Name, City\` - Name with city
• \`Name, City - notes\` - Full details

*Examples:*
• \`Sushi Samba\`
• \`Carbone, New York\`
• \`Dishoom, London - try the black daal\`
    `.trim();

    ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Handle text messages
bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    // Ignore commands (they're handled separately)
    if (text.startsWith('/')) {
        return;
    }

    console.log(`📨 Received: "${text}"`);

    // Use shared logic
    const result = await addRestaurantFromText(text, supabase);

    // Reply
    ctx.reply(result.message, { parse_mode: 'Markdown' });
});

// ============================================================
// START BOT
// ============================================================

console.log('🚀 Starting Foodie CRM Telegram Bot...');
console.log(`   Supabase URL: ${SUPABASE_URL}`);

bot.launch()
    .then(() => {
        console.log('✅ Bot is running! Send a message to your Telegram bot.');
    })
    .catch((err) => {
        console.error('❌ Failed to start bot:', err);
        process.exit(1);
    });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
