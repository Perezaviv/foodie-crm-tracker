import { cleanAddressForGeocoding } from '../geocoding';

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
    socialLink?: string;
    cuisine?: string;
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
        const results = parseSearchResults(data, name, city);

        // Auto-geocode results if they have address but missing coordinates
        // Also attempt fallback geocoding if no address but we have city
        for (const result of results) {
            if (result.address && (!result.lat || !result.lng)) {
                const cleanedAddress = cleanAddressForGeocoding(result.address, city);
                console.log(`[Search] Geocoding address: "${cleanedAddress}"`);
                const coords = await geocodeAddress(cleanedAddress);
                if (coords) {
                    result.lat = coords.lat;
                    result.lng = coords.lng;
                }
            } else if (!result.address && city && (!result.lat || !result.lng)) {
                // Fallback: try geocoding with restaurant name + city
                const fallbackQuery = `${name}, ${city}, Israel`;
                console.log(`[Search] No address found, trying fallback geocoding: "${fallbackQuery}"`);
                const coords = await geocodeAddress(fallbackQuery);
                if (coords) {
                    result.lat = coords.lat;
                    result.lng = coords.lng;
                    // Set a constructed address for display
                    result.address = `${city}, Israel`;
                    console.log(`[Search] Fallback geocoding succeeded for "${name}"`);
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
export function parseSearchResults(data: TavilyResponse, restaurantName: string, city?: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Pools of collected info
    let bestAddress: string | undefined;
    const bookingLinks: string[] = [];
    let bestWebsite: string | undefined;

    const seenAddresses = new Set<string>();

    // 1. Check direct answer for address - Enhanced with more patterns
    if (data.answer) {
        const answerPatterns = [
            /(?:located at|address[:\s]+|found at|situated at)([^.\n]+)/i,
            /(\d+\s+[A-Za-z\u0590-\u05FF\s]+,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva)[^.\n]*)/i,
            /([A-Za-z\u0590-\u05FF]+\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan)[^.\n]*)/i,
        ];
        for (const pattern of answerPatterns) {
            const match = data.answer.match(pattern);
            if (match) {
                bestAddress = match[1].trim();
                break;
            }
        }
    }
    if (bestAddress) seenAddresses.add(bestAddress.toLowerCase());

    // 2. Iterate through all results to gather info
    for (const result of data.results || []) {
        const url = result.url;
        const content = result.content || '';
        const title = result.title || '';

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

        // --- Address Extraction (Enhanced) ---
        if (!bestAddress) {
            const addressPatterns = [
                // Classic format: 123 Main Street, City
                /(\d+\s+[A-Za-z\u0590-\u05FF]+\s+(?:Street|St|Road|Rd|Ave|Avenue|Blvd|Boulevard)[^,]*(?:,\s*[A-Za-z\u0590-\u05FF\s]+)?)/i,
                // Hebrew with prefix: רחוב דיזנגוף 99
                /(?:רחוב|רח')\s+([^\d,]+\s*\d+[^,]*)/,
                // Street Name + Number + City: "Montefiore 12, Tel Aviv"
                /([A-Za-z\u0590-\u05FF]+\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon LeZion|Petah Tikva|Beer Sheva|Bat Yam)[^.]*)/i,
                // Number + Street Name: "12 Rothschild Blvd"
                /(\d+\s+[A-Za-z\u0590-\u05FF][A-Za-z\u0590-\u05FF\s]+(?:,\s*[A-Za-z\u0590-\u05FF\s]+)?)/i,
                // Hebrew street without prefix: "דיזנגוף 99, תל אביב"
                /([א-ת]+\s+\d+[^,]*,\s*[א-ת\s]+)/,
                // City mention in content near restaurant name
                new RegExp(`${restaurantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*?(\\d+[^,]+,\\s*(?:Tel Aviv|Jerusalem|Haifa)[^.]*)`, 'i'),
            ];

            // Search in both content and title
            const searchText = `${title} ${content}`;

            for (const pattern of addressPatterns) {
                const match = searchText.match(pattern);
                if (match && match[1]) {
                    const candidate = match[1].trim();
                    // Validate it looks like an address (has a number or city name)
                    if (/\d/.test(candidate) || /Tel Aviv|Jerusalem|Haifa|תל אביב|ירושלים|חיפה/i.test(candidate)) {
                        bestAddress = candidate;
                        seenAddresses.add(bestAddress.toLowerCase());
                        console.log(`[Search] Found address: "${bestAddress}" from pattern`);
                        break;
                    }
                }
            }
        }
    }

    // 3. Select the best booking link
    // Priority: Tabit > Ontopo > Others
    // Also favor links specifically mentioning the restaurant name if possible (fuzzy match)
    const bestBookingLink = selectBestBookingLink(bookingLinks, restaurantName);

    // 4. Construct the primary result
    // Always create a result so geocoding can still be attempted with name+city
    // Even if no address found, we can try geocoding with restaurant name + city
    if (bestAddress || bestBookingLink || city) {
        results.push({
            name: restaurantName,
            address: bestAddress,
            bookingLink: bestBookingLink,
        });
    }

    // 5. If no address but we have city, log for debugging
    if (!bestAddress && city) {
        console.log(`[Search] No address extracted for "${restaurantName}" in "${city}" - will attempt name-based geocoding`);
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
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}&region=il`
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
