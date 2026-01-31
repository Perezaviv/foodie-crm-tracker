import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, getRestaurants, createRestaurant } from '@/lib/skills/db';
import { geocodeAddress } from '@/lib/skills/ai';
import { cleanAddressForGeocoding } from '@/lib/geocoding';
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

        const restaurantData = body.restaurant;

        // GEOLOCATION:
        // Clean noisy addresses and geocode for map display
        if (restaurantData.address && (!restaurantData.lat || !restaurantData.lng)) {
            try {
                const cleanedAddress = cleanAddressForGeocoding(
                    restaurantData.address,
                    restaurantData.city
                );

                const { success, data: coords } = await geocodeAddress({ address: cleanedAddress });
                if (success && coords) {
                    restaurantData.lat = coords.lat;
                    restaurantData.lng = coords.lng;
                }
            } catch (geoError) {
                console.warn('[Restaurants API] Geocoding error:', geoError);
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

        const result = await createRestaurant(insertData);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            });
        }

        return NextResponse.json({
            success: true,
            restaurant: result.data,
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
        if (!isSupabaseConfigured()) {
            return NextResponse.json({
                success: true,
                demo: true,
                restaurants: [
                    {
                        id: 'demo-1',
                        name: 'Burger King',
                        cuisine: 'Fast Food',
                        city: 'New York',
                        address: '1235 Broadway, New York, NY 10001',
                        lat: 40.7484,
                        lng: -73.9857,
                        is_visited: true,
                        rating: 4,
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: 'demo-2',
                        name: 'Joe\'s Pizza',
                        cuisine: 'Pizza',
                        city: 'New York',
                        address: '7 Carmine St, New York, NY 10014',
                        lat: 40.7306,
                        lng: -74.0021,
                        is_visited: false,
                        created_at: new Date().toISOString(),
                    }
                ]
            });
        }

        const result = await getRestaurants();

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                restaurants: []
            });
        }

        return NextResponse.json({
            success: true,
            restaurants: result.data || []
        });

    } catch (error) {
        console.error('Get restaurants error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', restaurants: [] },
            { status: 500 }
        );
    }
}
