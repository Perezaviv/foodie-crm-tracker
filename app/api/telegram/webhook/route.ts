import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/lib/telegram-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        return NextResponse.json({ error: 'Telegram token not configured' }, { status: 503 });
    }

    try {
        const body = await request.json();

        // Pass the entire update object (message or callback_query)
        await handleTelegramUpdate(body);

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
