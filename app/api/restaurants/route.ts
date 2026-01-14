import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/ai';
import type { Restaurant } from '@/lib/types';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export interface SaveRequest {
    restaurant: {
        name: string;
        cuisine?: string | null;
        city?: string | null;
        address?: string | null;
        lat?: number | null;
        lng?: number | null;
        booking_link?: string | null;
        social_link?: string | null;
        notes?: string | null;
        is_visited?: boolean;
        rating?: number | null;
    };
}

export interface SaveResponse {
    success: boolean;
    restaurant?: Restaurant;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SaveResponse>> {
    try {
        const body: SaveRequest = await request.json();

        if (!body.restaurant || !body.restaurant.name) {
            return NextResponse.json(
                { success: false, error: 'Restaurant data is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();
        const restaurantData = body.restaurant;

        // GEOLOCATION FALLBACK:
        // If we have an address but no coordinates (common when selecting from ambiguity list),
        // fetch them now so the map works.
        if (restaurantData.address && (!restaurantData.lat || !restaurantData.lng)) {
            try {
                const coords = await geocodeAddress(restaurantData.address);
                if (coords) {
                    restaurantData.lat = coords.lat;
                    restaurantData.lng = coords.lng;
                }
            } catch (geoError) {
                console.warn('Geocoding fallback failed:', geoError);
                // Proceed without coords
            }
        }

        const insertData = {
            name: restaurantData.name,
            cuisine: restaurantData.cuisine ?? null,
            city: restaurantData.city ?? null,
            address: restaurantData.address ?? null,
            lat: restaurantData.lat ?? null,
            lng: restaurantData.lng ?? null,
            booking_link: restaurantData.booking_link ?? null,
            social_link: restaurantData.social_link ?? null,
            notes: restaurantData.notes ?? null,
            is_visited: restaurantData.is_visited ?? false,
            rating: restaurantData.rating ?? null,
        };

        const { data, error } = await supabase
            .from('restaurants')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({
                success: false,
                error: error.message,
            });
        }

        return NextResponse.json({
            success: true,
            restaurant: data as Restaurant,
        });

    } catch (error) {
        console.error('Save API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(): Promise<NextResponse> {
    try {
        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message, restaurants: [] });
        }

        return NextResponse.json({ success: true, restaurants: data });

    } catch (error) {
        console.error('Get restaurants error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', restaurants: [] },
            { status: 500 }
        );
    }
}
