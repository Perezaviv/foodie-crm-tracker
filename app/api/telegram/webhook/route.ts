import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/lib/telegram-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.error('[Telegram Webhook] BOT_TOKEN not configured');
        return NextResponse.json({ error: 'Telegram token not configured' }, { status: 503 });
    }

    try {
        const body = await request.json();

        // Debug logging to diagnose photo handling issues
        console.log('[Telegram Webhook] Received update:', JSON.stringify({
            update_id: body.update_id,
            has_message: !!body.message,
            has_callback: !!body.callback_query,
            chat_type: body.message?.chat?.type,
            has_photo: !!(body.message?.photo),
            has_text: !!(body.message?.text),
            photo_count: body.message?.photo?.length,
            text_preview: body.message?.text?.substring(0, 50),
        }));

        // Pass the entire update object (message or callback_query)
        await handleTelegramUpdate(body);

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[Telegram Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
