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
import { findPlace } from './find_place';
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
    googlePlaceId?: string;
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
    // English street name first (common in Israel): Dizengoff 99, Tel Aviv
    /([A-Za-z\s]{5,}\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva))/i,
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
        const query = city
            ? `${name} restaurant ${city} address`
            : `${name} restaurant Israel address`;

        // Parallel execution: Tavily Search + Google Places Search
        const [response, googlePlace] = await Promise.all([
            fetchWithRetry('https://api.tavily.com/search', {
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
            }),
            findPlace({ text: name, city })
        ]);

        if (!response.ok) {
            return { success: false, results: [], requiresSelection: false, error: `Tavily API error: ${response.status}` };
        }

        const data = await response.json() as TavilyResponse;

        // Pass googlePlace to enrichment
        const results = await parseAndEnrichResults(data, name, city, googlePlace.success ? googlePlace.data : undefined);

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

async function parseAndEnrichResults(
    data: TavilyResponse,
    restaurantName: string,
    city?: string,
    googlePlaceData?: { name: string; formattedAddress: string; placeId: string; lat: number; lng: number }
): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    let foundAddress: string | undefined;
    let rawBookingLinks: string[] = [];

    if (data.results) {
        for (const result of data.results) {
            rawBookingLinks.push(...extractUrls(result.content));
            rawBookingLinks.push(result.url);
        }
    }

    // 1.5. Robust extraction using Gemini if context is available
    // We prioritize Gemini because regex is too prone to picking up wrong addresses from lists in search results.
    const combinedContext = [
        data.answer,
        ...(data.results?.map(r => r.content) || [])
    ].filter(Boolean).join('\n\n').slice(0, 4000);

    if (combinedContext.length > 50) {
        const aiAddresses = await aiExtractAddresses(combinedContext, restaurantName, city);
        if (aiAddresses && aiAddresses.length > 0) {
            // First one is primary
            foundAddress = aiAddresses[0];
            console.log('[Search] AI found address:', foundAddress);

            // If multiple addresses found, add them as alternatives
            if (aiAddresses.length > 1) {
                for (let i = 1; i < aiAddresses.length; i++) {
                    const altResult: SearchResult = {
                        name: `${restaurantName} (${aiAddresses[i].split(',')[0]})`,
                        address: aiAddresses[i],
                        city: city,
                    };
                    // Geocode alternative
                    const cleaned = cleanAddressForGeocoding(aiAddresses[i], city);
                    const geoResult = await geocodeAddress({ address: cleaned });
                    if (geoResult.success && geoResult.data) {
                        altResult.lat = geoResult.data.lat;
                        altResult.lng = geoResult.data.lng;
                        altResult.address = geoResult.data.formattedAddress;
                        altResult.googlePlaceId = geoResult.data.placeId;
                    }
                    results.push(altResult);
                }
            }
        }
    }

    // 1.6. Fallback to regex if AI failed or wasn't used
    if (!foundAddress) {
        if (data.answer) {
            foundAddress = extractAddress(data.answer);
        }
        if (!foundAddress && data.results) {
            for (const result of data.results) {
                foundAddress = extractAddress(result.content);
                if (foundAddress) break;
            }
        }
        if (foundAddress) console.log('[Search] Regex found address:', foundAddress);
    }

    // 2. Parse booking links using the skill
    const bookingResult = await parseBookingLink({
        links: rawBookingLinks,
        restaurantName
    });

    // 3. Prepare primary result
    const primaryResult: SearchResult = {
        name: restaurantName,
        // If we have Google Place data, use it for address!
        address: googlePlaceData?.formattedAddress || foundAddress,
        city: city,
        bookingLink: bookingResult.success ? bookingResult.data?.bestLink : undefined,
        logoUrl: data.images?.[0],
    };

    // 4. Geocode if address is found
    if (googlePlaceData) {
        // Best case: We have direct Google Place match
        primaryResult.lat = googlePlaceData.lat;
        primaryResult.lng = googlePlaceData.lng;
        primaryResult.address = googlePlaceData.formattedAddress;
        primaryResult.googlePlaceId = googlePlaceData.placeId;
    } else if (foundAddress) {
        const cleaned = cleanAddressForGeocoding(foundAddress, city);
        const geoResult = await geocodeAddress({ address: cleaned });
        if (geoResult.success && geoResult.data) {
            primaryResult.lat = geoResult.data.lat;
            primaryResult.lng = geoResult.data.lng;
            primaryResult.address = geoResult.data.formattedAddress; // Use the formatted version

            // Only use placeId if it's a specific location/establishment, not a generic city
            const types = geoResult.data.types || [];
            const isGeneric = types.includes('locality') || types.includes('administrative_area_level_1') || types.includes('political');
            if (!isGeneric) {
                primaryResult.googlePlaceId = geoResult.data.placeId;
            }
        }
    } else if (city) {
        // Fallback: name + city
        const fallbackQuery = `${restaurantName}, ${city}, Israel`;
        const geoResult = await geocodeAddress({ address: fallbackQuery });
        if (geoResult.success && geoResult.data) {
            primaryResult.lat = geoResult.data.lat;
            primaryResult.lng = geoResult.data.lng;
            primaryResult.address = geoResult.data.formattedAddress;
            // Often this fallback search returns the City or Street, which is too generic.
            // But sometimes it finds the place!
            // Check types to be safe.
            const types = geoResult.data.types || [];
            const isSpecific = types.includes('establishment') || types.includes('point_of_interest') || types.includes('food') || types.includes('restaurant');

            if (isSpecific) {
                primaryResult.googlePlaceId = geoResult.data.placeId;
            }
        }
    }

    results.unshift(primaryResult); // Add primary to front
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

/**
 * Uses Gemini to extract clean address(es) from search results context.
 * Returns an array of unique address candidates.
 */
async function aiExtractAddresses(context: string, name: string, city?: string): Promise<string[]> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return [];

    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a real estate and location expert in Israel. 
Given the following search results context about the restaurant "${name}" in ${city || 'Israel'}, extract any physical street addresses mentioned for IT.

Context:
${context}

Rules:
- Identify if there are multiple branches or if the search results mention different possible addresses for "${name}".
- If the results mention OTHER restaurants/hotels (like "Rothschild 12" or hotels nearby), ignore them UNLESS they are specifically the location of "${name}".
            // First one is primary
            foundAddress = aiAddresses[0];
            console.log('[Search] AI found address:', foundAddress);
            
    // ... (rest of logic)

    } else if (foundAddress) {
        const cleaned = cleanAddressForGeocoding(foundAddress, city);
        console.log('[Search] Cleaned address:', cleaned);
        const geoResult = await geocodeAddress({ address: cleaned });

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        // Clean markdown
        if (text.startsWith('```json')) text = text.slice(7);
        if (text.startsWith('```')) text = text.slice(3);
        if (text.endsWith('```')) text = text.slice(0, -3);
        text = text.trim();

        if (text === '[]' || !text.startsWith('[')) return [];

        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('AI address extraction failed:', e);
        return [];
    }
}
