/**
 * Skill: SearchRestaurant
 * @owner AGENT-3
 * @status READY
 * @created 2026-01-31
 * @dependencies geocode_address, parse_booking_link
 * 
 * Searches for restaurant information using Tavily API.
 * Handles address extraction, booking links, and geocoding.
 */

import { cleanAddressForGeocoding } from '../../geocoding';
import { geocodeAddress } from './geocode_address';
import { parseBookingLink } from './parse_booking_link';

// =============================================================================
// TYPES
// =============================================================================

export interface SearchRestaurantInput {
    name: string;
    city?: string;
    useCache?: boolean;
}

export interface SearchRestaurantOutput {
    success: boolean;
    results: SearchResult[];
    requiresSelection: boolean;
    error?: string;
}

export interface SearchResult {
    name: string;
    address?: string;
    city?: string;
    lat?: number;
    lng?: number;
    bookingLink?: string;
    website?: string;
    phone?: string;
    rating?: number;
    priceLevel?: string;
    socialLink?: string;
    cuisine?: string;
    logoUrl?: string;
}

// Tavily API response types
interface TavilyResponse {
    answer?: string;
    images?: string[];
    results?: TavilyResult[];
}

interface TavilyResult {
    title: string;
    url: string;
    content: string;
    score: number;
}

// =============================================================================
// CONSTANTS & CACHE
// =============================================================================

/** Address patterns for Israeli locations */
const ADDRESS_PATTERNS = [
    // Hebrew street patterns: רחוב דיזנגוף 99, תל אביב
    /(?:רחוב|רח'|ברחוב)\s+([\u0590-\u05FF\s]+\s+\d+[^,]*(?:,\s*[\u0590-\u05FF\s]+)?)/,
    // Hebrew without prefix: דיזנגוף 99, תל אביב
    /([\u0590-\u05FF]{3,}\s+\d+\s*,\s*[\u0590-\u05FF\s]+)/,
    // English street patterns with city: 99 Dizengoff St, Tel Aviv
    /(\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd)[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva))/i,
    // Generic numbered address with city
    /([A-Za-z\u0590-\u05FF]+\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva)[^.\n]*)/i,
];

const searchCache = new Map<string, SearchRestaurantOutput>();

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Search for restaurant details using Tavily API.
 * Returns enriched restaurant data including address, booking links, and coordinates.
 * 
 * @example
 * const result = await searchRestaurant({ name: 'Vitrina', city: 'Tel Aviv' });
 */
export async function searchRestaurant(input: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    const { name, city, useCache = true } = input;

    // Check cache
    const cacheKey = `${name.toLowerCase()}:${city?.toLowerCase() || ''}`;
    if (useCache && searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey)!;
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        return { success: false, results: [], requiresSelection: false, error: 'TAVILY_API_KEY not configured' };
    }

    try {
        const query = city ? `${name} restaurant ${city} Israel address booking` : `${name} restaurant Israel address booking`;

        const response = await fetchWithRetry('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                search_depth: 'advanced',
                include_answer: true,
                include_images: true,
                max_results: 8,
            }),
        });

        if (!response.ok) {
            return { success: false, results: [], requiresSelection: false, error: `Tavily API error: ${response.status}` };
        }

        const data = await response.json() as TavilyResponse;
        const results = await parseAndEnrichResults(data, name, city);

        const output = {
            success: true,
            results,
            requiresSelection: results.length > 1,
        };

        // Save to cache
        if (useCache) {
            searchCache.set(cacheKey, output);
        }

        return output;
    } catch (error) {
        return {
            success: false,
            results: [],
            requiresSelection: false,
            error: error instanceof Error ? error.message : 'Unknown search error',
        };
    }
}

// =============================================================================
// HELPERS
// =============================================================================

async function fetchWithRetry(url: string, options: any, retries = 2): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (response.status >= 500 && i < retries) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential-ish backoff
                continue;
            }
            return response;
        } catch (error) {
            if (i === retries) throw error;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    throw new Error('Fetch failed after retries');
}

async function parseAndEnrichResults(data: TavilyResponse, restaurantName: string, city?: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    let foundAddress: string | undefined;
    let rawBookingLinks: string[] = [];

    // 1. Extract raw data from answer and content
    if (data.answer) {
        foundAddress = extractAddress(data.answer);
        rawBookingLinks.push(...extractUrls(data.answer));
    }

    if (data.results) {
        for (const result of data.results) {
            if (!foundAddress) {
                foundAddress = extractAddress(result.content);
            }
            rawBookingLinks.push(...extractUrls(result.content));
            rawBookingLinks.push(result.url);
        }
    }

    // 2. Parse booking links using the skill
    const bookingResult = await parseBookingLink({
        links: rawBookingLinks,
        restaurantName
    });

    // 3. Prepare primary result
    const primaryResult: SearchResult = {
        name: restaurantName,
        address: foundAddress,
        city: city,
        bookingLink: bookingResult.success ? bookingResult.data?.bestLink : undefined,
        logoUrl: data.images?.[0],
    };

    // 4. Geocode if address is found
    if (foundAddress) {
        const cleaned = cleanAddressForGeocoding(foundAddress, city);
        const geoResult = await geocodeAddress({ address: cleaned });
        if (geoResult.success && geoResult.data) {
            primaryResult.lat = geoResult.data.lat;
            primaryResult.lng = geoResult.data.lng;
            primaryResult.address = geoResult.data.formattedAddress; // Use the formatted version
        }
    } else if (city) {
        // Fallback: name + city
        const fallbackQuery = `${restaurantName}, ${city}, Israel`;
        const geoResult = await geocodeAddress({ address: fallbackQuery });
        if (geoResult.success && geoResult.data) {
            primaryResult.lat = geoResult.data.lat;
            primaryResult.lng = geoResult.data.lng;
            primaryResult.address = geoResult.data.formattedAddress;
        }
    }

    results.push(primaryResult);
    return results;
}

function extractAddress(text: string): string | undefined {
    for (const pattern of ADDRESS_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return match[1] || match[0];
        }
    }
    return undefined;
}

function extractUrls(text: string): string[] {
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    return text.match(urlPattern) || [];
}
