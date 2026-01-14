
import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/ai/search';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { address } = await request.json();

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address required' }, { status: 400 });
        }

        console.log(`[API/Geocode] Request for: "${address}"`);

        const coords = await geocodeAddress(address);

        if (!coords) {
            console.log(`[API/Geocode] Failed for: "${address}"`);
            return NextResponse.json({
                success: false,
                error: 'Geocoding failed - check server logs for details',
                address: address
            });
        }

        console.log(`[API/Geocode] Success: ${coords.lat}, ${coords.lng}`);
        return NextResponse.json({ success: true, ...coords });

    } catch (error) {
        console.error('[API/Geocode] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal error'
        }, { status: 500 });
    }
}
