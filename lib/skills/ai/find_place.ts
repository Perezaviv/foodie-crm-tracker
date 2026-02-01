/**
 * Skill: FindPlace
 * @owner AGENT-3
 * @status READY
 * @created 2026-02-01
 * @dependencies none
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FindPlaceInput {
    text: string;
    city?: string;
}

export interface FindPlaceOutput {
    success: boolean;
    data?: {
        name: string;
        formattedAddress: string;
        placeId: string;
        lat: number;
        lng: number;
        rating?: number;
    };
    error?: string;
}

// =============================================================================
// CACHE
// =============================================================================

const placeCache = new Map<string, any>();

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Find a place using Google Places Text Search API.
 * This is better than Geocoding API for finding establishments by name.
 */
export async function findPlace(input: FindPlaceInput): Promise<FindPlaceOutput> {
    const { text, city } = input;

    // Construct query
    const query = city ? `${text} ${city}` : text;

    const cacheKey = `place:${query.toLowerCase().trim()}`;
    if (placeCache.has(cacheKey)) {
        return { success: true, data: placeCache.get(cacheKey) };
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return { success: false, error: 'Google Maps API key not configured' };
    }

    try {
        const encoded = encodeURIComponent(query);
        // Use Text Search (New) or Text Search (Legacy) or Find Place?
        // Text Search is most robust.
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encoded}&key=${apiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
            return { success: false, error: `Google Places API error: ${response.status}` };
        }

        const data = await response.json();

        if (data.status === 'ZERO_RESULTS') {
            return { success: false, error: 'No places found' };
        }

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            return { success: false, error: `Place search failed: ${data.status}` };
        }

        // Take the first result
        const result = data.results[0];

        const outputData = {
            name: result.name,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            rating: result.rating,
        };

        placeCache.set(cacheKey, outputData);

        return {
            success: true,
            data: outputData
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Place search failed',
        };
    }
}
