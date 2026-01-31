import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/skills/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { address } = await request.json();

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address required' }, { status: 400 });
        }

        const result = await geocodeAddress({ address });

        if (!result.success || !result.data) {
            return NextResponse.json({
                success: false,
                error: result.error || 'Geocoding failed',
                address: address
            });
        }

        return NextResponse.json({
            success: true,
            lat: result.data.lat,
            lng: result.data.lng
        });

    } catch (error) {
        console.error('[API/Geocode] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal error'
        }, { status: 500 });
    }
}
