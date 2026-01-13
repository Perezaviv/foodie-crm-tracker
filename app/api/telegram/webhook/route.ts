import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { addRestaurantFromText } from '@/lib/telegram-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        return NextResponse.json({ error: 'Telegram token not configured' }, { status: 503 });
    }

    try {
        const body = await request.json();

        // Telegram Webhook payload structure
        const message = body.message;

        if (!message || !message.text) {
            return NextResponse.json({ ok: true }); // Acknowledge non-text updates
        }

        // Only handle text messages, ignore commands if handled elsewhere or just process them
        if (message.text.startsWith('/')) {
            // Echo help if needed, or just ignore. 
            // For now, let's keep it simple and ignore commands to avoid conflict with other command handlers if we had them.
            if (message.text === '/start' || message.text === '/help') {
                await sendTelegramMessage(message.chat.id,
                    `🍽️ *Welcome to Foodie CRM Bot!*

Send me a restaurant name to add it.
Examples:
• \`Miznon\`
• \`Miznon, Tel Aviv\`
• \`Miznon, Tel Aviv - great pita\``
                );
            }
            return NextResponse.json({ ok: true });
        }

        const supabase = createServerClient();
        const result = await addRestaurantFromText(message.text, supabase);

        // Reply to user
        await sendTelegramMessage(message.chat.id, result.message);

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function sendTelegramMessage(chatId: number, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
            }),
        });
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}
