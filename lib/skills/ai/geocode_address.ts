/**
 * Skill: GeocodeAddress
 * @owner AGENT-3
 * @status READY
 * @created 2026-01-31
 * @dependencies none
 */

// =============================================================================
// TYPES
// =============================================================================

export interface GeocodeAddressInput {
    address: string;
    region?: string; // default to 'il'
}

export interface GeocodeAddressOutput {
    success: boolean;
    data?: {
        lat: number;
        lng: number;
        formattedAddress: string;
        placeId?: string;
    };
    error?: string;
}

// =============================================================================
// IN-MEMORY CACHE
// =============================================================================

const geocodeCache = new Map<string, any>();

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Geocode an address using Google Geocoding API.
 * Includes in-memory caching for repeated lookups.
 * 
 * @example
 * const result = await geocodeAddress({ address: 'Dizengoff 99, Tel Aviv' });
 */
export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
    const { address, region = 'il' } = input;

    if (!address) {
        return { success: false, error: 'Address is required' };
    }

    // Check cache
    const cacheKey = `${address.toLowerCase().trim()}:${region}`;
    if (geocodeCache.has(cacheKey)) {
        return { success: true, data: geocodeCache.get(cacheKey) };
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return { success: false, error: 'Google Maps API key not configured' };
    }

    try {
        const encoded = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}&region=${region}`;

        const response = await fetch(url);

        if (!response.ok) {
            return { success: false, error: `Google API error: ${response.status}` };
        }

        const data = await response.json();

        if (data.status === 'ZERO_RESULTS') {
            return { success: false, error: 'No results found for this address' };
        }

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            return { success: false, error: `Geocoding failed: ${data.status}` };
        }

        const result = data.results[0];
        const location = result.geometry.location;

        const outputData = {
            lat: location.lat,
            lng: location.lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
        };

        // Save to cache
        geocodeCache.set(cacheKey, outputData);

        return {
            success: true,
            data: outputData,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Geocoding failed',
        };
    }
}
