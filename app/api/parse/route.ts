import { NextRequest, NextResponse } from 'next/server';
import { extractRestaurantInfo, searchRestaurant, geocodeAddress } from '@/lib/ai';
import type { RestaurantInsert } from '@/lib/types';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export interface ParseRequest {
    input: string;
}

export interface ParseResponse {
    success: boolean;
    restaurant?: Partial<RestaurantInsert>;
    requiresSelection?: boolean;
    alternatives?: Array<{
        name: string;
        address?: string;
        city?: string;
        bookingLink?: string;
    }>;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseResponse>> {
    try {
        const body: ParseRequest = await request.json();

        if (!body.input || typeof body.input !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Input is required' },
                { status: 400 }
            );
        }

        const input = body.input.trim();
        if (input.length < 2) {
            return NextResponse.json(
                { success: false, error: 'Input too short' },
                { status: 400 }
            );
        }

        // Step 1: Extract restaurant info using AI
        const parseResult = await extractRestaurantInfo(input);

        if (!parseResult.success || !parseResult.data) {
            return NextResponse.json({
                success: false,
                error: parseResult.error || 'Failed to parse input',
            });
        }

        const extracted = parseResult.data;

        // Step 2: Search for additional details (address, booking link)
        const searchResult = await searchRestaurant(extracted.name, extracted.city);

        // Step 3: Handle multiple results (ambiguity)
        if (searchResult.requiresSelection && searchResult.results.length > 1) {
            return NextResponse.json({
                success: true,
                requiresSelection: true,
                alternatives: searchResult.results.map(r => ({
                    name: extracted.name,
                    address: r.address,
                    city: extracted.city,
                    bookingLink: r.bookingLink,
                })),
            });
        }

        // Step 4: Build restaurant object
        const restaurant: Partial<RestaurantInsert> = {
            name: extracted.name,
            cuisine: extracted.cuisine,
            city: extracted.city,
            social_link: extracted.socialLink,
        };

        // Add enriched data if available
        if (searchResult.results.length > 0) {
            const enriched = searchResult.results[0];
            restaurant.address = enriched.address || restaurant.address;
            restaurant.booking_link = enriched.bookingLink;

            // Geocode the address
            if (enriched.address) {
                const coords = await geocodeAddress(enriched.address);
                if (coords) {
                    restaurant.lat = coords.lat;
                    restaurant.lng = coords.lng;
                }
            }
        }

        return NextResponse.json({
            success: true,
            restaurant,
            requiresSelection: parseResult.requiresConfirmation,
        });

    } catch (error) {
        console.error('Parse API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
