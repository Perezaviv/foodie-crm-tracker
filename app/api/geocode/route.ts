
import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/ai/search';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { address } = await request.json();

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address required' }, { status: 400 });
        }

        const coords = await geocodeAddress(address);

        if (!coords) {
            return NextResponse.json({ success: false, error: 'Geocoding failed' });
        }

        return NextResponse.json({ success: true, ...coords });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
