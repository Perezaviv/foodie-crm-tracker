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
            ? `${name} restaurant ${city} address booking tabit`
            : `${name} restaurant Israel address booking tabit`;

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

        // Auto-geocode results if they have address but missing coordinates
        for (const result of results) {
            if (result.address && (!result.lat || !result.lng)) {
                const coords = await geocodeAddress(result.address);
                if (coords) {
                    result.lat = coords.lat;
                    result.lng = coords.lng;
                }
            }
        }

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
export function parseSearchResults(data: TavilyResponse, restaurantName: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Pools of collected info
    let bestAddress: string | undefined;
    const bookingLinks: string[] = [];
    let bestWebsite: string | undefined;

    const seenAddresses = new Set<string>();

    // 1. Check direct answer for address
    if (data.answer) {
        const addressMatch = data.answer.match(/(?:located at|address[:\s]+)([^,\n]+(?:,[^,\n]+)?)/i);
        if (addressMatch) {
            bestAddress = addressMatch[1].trim();
        }
    }
    if (bestAddress) seenAddresses.add(bestAddress.toLowerCase());

    // 2. Iterate through all results to gather info
    for (const result of data.results || []) {
        const url = result.url;
        const content = result.content || '';

        // --- Booking Link Extraction ---

        // Strategy 1: Check the main URL of the result
        if (isBookingPlatform(url)) {
            if (!isGenericBookingLink(url)) {
                bookingLinks.push(url);
            }
        }

        // Strategy 2: Hunt for Tabit/Ontopo links inside the text content
        // (Sometimes the search result is an aggregator or review site that mentions the booking link)
        const tabitMatch = content.match(/https:\/\/(?:www\.)?(?:tabit\.cloud|tabitisrael\.co\.il)\/[^\s"']+/g);
        if (tabitMatch) {
            tabitMatch.forEach(link => {
                // Clean trailing punctuation
                const cleanLink = link.replace(/[.,)]+$/, '');
                if (!isGenericBookingLink(cleanLink)) {
                    bookingLinks.push(cleanLink);
                }
            });
        }

        // --- Website Extraction ---
        if (!bestWebsite && !isBookingPlatform(url) && !url.includes('tripadvisor') && !url.includes('easy.co.il')) {
            // Simple heuristic: if it's not a booking platform or aggregator, might be the site
            // We verify it's not a huge global platform
            const skipDomains = ['instagram.com', 'facebook.com', 'tiktok.com', 'wikipedia.org'];
            try {
                const hostname = new URL(url).hostname;
                if (!skipDomains.some(d => hostname.includes(d))) {
                    // bestWebsite = url; // Still tentative/commented out in original, keeping it that way unless verified
                }
            } catch (e) { }
        }

        // --- Address Extraction ---
        if (!bestAddress) {
            const addressPatterns = [
                /(\d+\s+[A-Za-z\u0590-\u05FF]+\s+(?:Street|St|Road|Rd|Ave|Avenue|Blvd|Boulevard)[^,]*(?:,\s*[A-Za-z\u0590-\u05FF\s]+)?)/i,
                /(?:רחוב|רח')\s+([^\d,]+\s*\d+[^,]*)/,
            ];

            for (const pattern of addressPatterns) {
                const match = content.match(pattern);
                if (match) {
                    bestAddress = match[1].trim();
                    seenAddresses.add(bestAddress.toLowerCase());
                    break;
                }
            }
        }
    }

    // 3. Select the best booking link
    // Priority: Tabit > Ontopo > Others
    // Also favor links specifically mentioning the restaurant name if possible (fuzzy match)
    const bestBookingLink = selectBestBookingLink(bookingLinks, restaurantName);

    // 4. Construct the primary result
    // If we found anything useful, create a result
    if (bestAddress || bestBookingLink) {
        results.push({
            name: restaurantName,
            address: bestAddress,
            bookingLink: bestBookingLink,
        });
    }

    return results;
}

/**
 * Check if URL is a known booking platform
 */
function isBookingPlatform(url: string): boolean {
    const bookingDomains = [
        'tabit.cloud',
        'tabitisrael.co.il',
        'ontopo.co.il',
        'ontopo.com',
        'opentable.com',
        'resy.com',
        'sevenrooms.com',
        'yelp.com/reservations',
    ];

    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return bookingDomains.some(domain => hostname.includes(domain));
    } catch (e) {
        return false;
    }
}

/**
 * Check if a booking URL is just a generic landing page
 */
export function isGenericBookingLink(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname.toLowerCase();

        // Exact homepage match
        if (path === '/' || path === '') return true;

        // Generic terms that don't represent a specific restaurant
        const pathSegments = path.split('/').filter(Boolean);
        const genericTerms = [
            'search', 'explore', 'il', 'en', 'he', 'login', 'signup',
            'restaurant', 'restaurants', 'cities', 'regions', 'area', 'zone',
            'home', 'main', 'index', 'about', 'contact', 'terms', 'privacy',
            'tel-aviv', 'jerusalem', 'haifa', 'herzliya', 'netanya', 'jaffa',
            'eilat', 'telaviv', 'collection', 'collections', 'category', 'categories',
            'restaurant-collection', 'restaurant-collections', 'best-restaurants'
        ];

        // 1. If every segment in the path is a generic term (e.g., /en/il/tel-aviv), reject it
        if (pathSegments.length > 0 && pathSegments.every(seg => genericTerms.includes(seg))) {
            return true;
        }

        return false;
    } catch (e) {
        return true; // Invalid URL is considered generic/unusable
    }
}

/**
 * Prioritize booking links
 */
function selectBestBookingLink(links: string[], restaurantName: string): string | undefined {
    if (links.length === 0) return undefined;

    // Remove duplicates
    const uniqueLinks = Array.from(new Set(links));

    return uniqueLinks.sort((a, b) => {
        const aScore = getLinkScore(a, restaurantName);
        const bScore = getLinkScore(b, restaurantName);
        return bScore - aScore;
    })[0];
}

function getLinkScore(link: string, name: string): number {
    let score = 0;
    const lowerLink = link.toLowerCase();

    // Domain priority
    if (lowerLink.includes('tabit.cloud')) score += 10;
    else if (lowerLink.includes('ontopo')) score += 8;
    else score += 1;

    // Name match bonus (simple inclusion check)
    // Strip non-alphanumeric from name for looser matching
    const simpleName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (simpleName.length > 3 && lowerLink.replace(/[^a-z0-9]/g, '').includes(simpleName)) {
        score += 5;
    }

    return score;
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
            console.warn(`[Geocode] Failed for address "${address}". Status: ${data.status}`);
            return null;
        }

        const location = data.results[0].geometry.location;
        console.log(`[Geocode] Success for "${address}": ${location.lat}, ${location.lng}`);
        return {
            lat: location.lat,
            lng: location.lng,
        };
    } catch (error) {
        console.error('[Geocode] Error for address:', address, error);
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
