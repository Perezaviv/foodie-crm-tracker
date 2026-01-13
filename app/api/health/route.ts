import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const checks = {
        supabase: isSupabaseConfigured(),
        gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
        telegram: !!process.env.TELEGRAM_BOT_TOKEN,
        maps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    };

    const allConfigured = Object.values(checks).every(Boolean);

    return NextResponse.json({
        status: allConfigured ? 'ok' : 'misconfigured',
        checks,
    }, { status: allConfigured ? 200 : 503 });
}
