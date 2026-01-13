/**
 * Search service for restaurant enrichment
 * Uses Tavily API for web search to find addresses, booking links, and geocoding
 */

export interface SearchResult {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
    bookingLink?: string;
    website?: string;
    phone?: string;
    rating?: number;
    priceLevel?: string;
}

export interface EnrichmentResult {
    success: boolean;
    results: SearchResult[];
    requiresSelection: boolean;
    error?: string;
}

/**
 * Search for restaurant details using Tavily API
 */
export async function searchRestaurant(
    name: string,
    city?: string
): Promise<EnrichmentResult> {
    const tavilyApiKey = process.env.TAVILY_API_KEY;

    if (!tavilyApiKey) {
        return {
            success: false,
            results: [],
            requiresSelection: false,
            error: 'Tavily API key not configured',
        };
    }

    try {
        const query = city
            ? `${name} restaurant ${city} address booking`
            : `${name} restaurant Israel address booking`;

        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: tavilyApiKey,
                query,
                search_depth: 'advanced',
                include_answer: true,
                include_raw_content: false,
                max_results: 5,
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        const data = await response.json();

        // Parse search results to extract restaurant info
        const results = parseSearchResults(data, name);

        return {
            success: true,
            results,
            requiresSelection: results.length > 1,
        };
    } catch (error) {
        console.error('Error searching for restaurant:', error);
        return {
            success: false,
            results: [],
            requiresSelection: false,
            error: error instanceof Error ? error.message : 'Search failed',
        };
    }
}

/**
 * Parse Tavily search results into structured restaurant data
 */
function parseSearchResults(data: TavilyResponse, restaurantName: string): SearchResult[] {
    const results: SearchResult[] = [];
    const seen = new Set<string>();

    // Check if we have an answer with specific location info
    if (data.answer) {
        const addressMatch = data.answer.match(/(?:located at|address[:\s]+)([^,\n]+(?:,[^,\n]+)?)/i);
        if (addressMatch) {
            results.push({
                name: restaurantName,
                address: addressMatch[1].trim(),
            });
        }
    }

    // Parse individual search results
    for (const result of data.results || []) {
        const url = result.url;

        // Skip if we've seen this domain
        const domain = new URL(url).hostname;
        if (seen.has(domain)) continue;
        seen.add(domain);

        const parsed: SearchResult = {
            name: restaurantName,
        };

        // Detect booking platforms
        if (isBookingPlatform(url)) {
            parsed.bookingLink = url;
        }

        // Extract address from content if available
        const content = result.content || '';
        const addressPatterns = [
            /(\d+\s+[A-Za-z\u0590-\u05FF]+\s+(?:Street|St|Road|Rd|Ave|Avenue|Blvd|Boulevard)[^,]*(?:,\s*[A-Za-z\u0590-\u05FF\s]+)?)/i,
            /(?:רחוב|רח')\s+([^\d,]+\s*\d+[^,]*)/,
        ];

        for (const pattern of addressPatterns) {
            const match = content.match(pattern);
            if (match) {
                parsed.address = match[1].trim();
                break;
            }
        }

        if (parsed.bookingLink || parsed.address) {
            results.push(parsed);
        }
    }

    // Deduplicate by address
    const uniqueResults: SearchResult[] = [];
    const seenAddresses = new Set<string>();

    for (const result of results) {
        const key = result.address?.toLowerCase() || Math.random().toString();
        if (!seenAddresses.has(key)) {
            seenAddresses.add(key);
            uniqueResults.push(result);
        }
    }

    return uniqueResults;
}

/**
 * Check if URL is a known booking platform
 */
function isBookingPlatform(url: string): boolean {
    const bookingDomains = [
        'tabit.cloud',
        'ontopo.co.il',
        'ontopo.com',
        'opentable.com',
        'resy.com',
        'sevenrooms.com',
        'yelp.com/reservations',
    ];

    const hostname = new URL(url).hostname.toLowerCase();
    return bookingDomains.some(domain => hostname.includes(domain));
}

/**
 * Geocode an address using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error('Google Maps API key not configured');
        return null;
    }

    try {
        const encoded = encodeURIComponent(address);
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`
        );

        if (!response.ok) return null;

        const data = await response.json();

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            return null;
        }

        const location = data.results[0].geometry.location;
        return {
            lat: location.lat,
            lng: location.lng,
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Type definitions for Tavily API response
interface TavilyResponse {
    answer?: string;
    results?: Array<{
        title: string;
        url: string;
        content: string;
        score: number;
    }>;
}
