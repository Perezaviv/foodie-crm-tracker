import { cleanAddressForGeocoding } from '../geocoding';

/**
 * Search service for restaurant enrichment
 * Uses Tavily API for web search to find addresses, booking links, and geocoding
 */

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

export interface EnrichmentResult {
    success: boolean;
    results: SearchResult[];
    requiresSelection: boolean;
    error?: string;
}

// Type definitions for Tavily API response
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
// MAIN SEARCH FUNCTION
// =============================================================================

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: tavilyApiKey,
                query,
                search_depth: 'advanced',
                include_answer: true,
                include_raw_content: false,
                include_images: true,
                max_results: 5,
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        const data = await response.json();
        const results = parseSearchResults(data, name, city);

        // Auto-geocode results
        await geocodeResults(results, name, city);

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

// =============================================================================
// PARSING HELPERS
// =============================================================================

/** Address patterns for Israeli locations */
const ADDRESS_PATTERNS = [
    // Classic format: 123 Main Street, City
    /(\d+\s+[A-Za-z\u0590-\u05FF]+\s+(?:Street|St|Road|Rd|Ave|Avenue|Blvd|Boulevard)[^,]*(?:,\s*[A-Za-z\u0590-\u05FF\s]+)?)/i,
    // Hebrew with prefix: רחוב דיזנגוף 99
    /(?:רחוב|רח')\s+([^\d,]+\s*\d+[^,]*)/,
    // Street Name + Number + City
    /([A-Za-z\u0590-\u05FF]+\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon LeZion|Petah Tikva|Beer Sheva|Bat Yam)[^.]*)/i,
    // Number + Street Name
    /(\d+\s+[A-Za-z\u0590-\u05FF][A-Za-z\u0590-\u05FF\s]+(?:,\s*[A-Za-z\u0590-\u05FF\s]+)?)/i,
    // Hebrew street: "דיזנגוף 99, תל אביב"
    /([א-ת]+\s+\d+[^,]*,\s*[א-ת\s]+)/,
];

/** Patterns to extract address from Tavily's answer field */
const ANSWER_ADDRESS_PATTERNS = [
    /(?:located at|address[:\s]+|found at|situated at)([^.\n]+)/i,
    /(\d+\s+[A-Za-z\u0590-\u05FF\s]+,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva)[^.\n]*)/i,
    /([A-Za-z\u0590-\u05FF]+\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan)[^.\n]*)/i,
];

/**
 * Extract address from Tavily's answer field
 */
function extractAddressFromAnswer(answer: string): string | undefined {
    for (const pattern of ANSWER_ADDRESS_PATTERNS) {
        const match = answer.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    return undefined;
}

/**
 * Extract address from search result content
 */
function extractAddressFromContent(text: string, restaurantName: string): string | undefined {
    // Add restaurant-specific pattern
    const patterns = [
        ...ADDRESS_PATTERNS,
        new RegExp(`${restaurantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*?(\\d+[^,]+,\\s*(?:Tel Aviv|Jerusalem|Haifa)[^.]*)`, 'i'),
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const candidate = match[1].trim();
            // Validate it looks like an address
            if (/\d/.test(candidate) || /Tel Aviv|Jerusalem|Haifa|תל אביב|ירושלים|חיפה/i.test(candidate)) {
                return candidate;
            }
        }
    }
    return undefined;
}

/**
 * Extract booking links from content (Tabit/Ontopo)
 */
function extractBookingLinksFromContent(content: string): string[] {
    const links: string[] = [];
    const tabitMatch = content.match(/https:\/\/(?:www\.)?(?:tabit\.cloud|tabitisrael\.co\.il)\/[^\s"']+/g);

    if (tabitMatch) {
        tabitMatch.forEach(link => {
            const cleanLink = link.replace(/[.,)]+$/, '');
            if (!isGenericBookingLink(cleanLink)) {
                links.push(cleanLink);
            }
        });
    }

    return links;
}

/**
 * Parse Tavily search results into structured restaurant data
 */
export function parseSearchResults(data: TavilyResponse, restaurantName: string, city?: string): SearchResult[] {
    const bookingLinks: string[] = [];

    // 1. Try to extract address from answer
    let bestAddress = data.answer ? extractAddressFromAnswer(data.answer) : undefined;

    // 2. Process each result
    for (const result of data.results || []) {
        const { url, content = '', title = '' } = result;

        // Collect booking links
        if (isBookingPlatform(url) && !isGenericBookingLink(url)) {
            bookingLinks.push(url);
        }
        bookingLinks.push(...extractBookingLinksFromContent(content));

        // Try to extract address if not found yet
        if (!bestAddress) {
            bestAddress = extractAddressFromContent(`${title} ${content}`, restaurantName);
        }
    }

    // 3. Select best booking link
    const bestBookingLink = selectBestBookingLink(bookingLinks, restaurantName);

    // 4. Extract logo from images (first image is typically the most relevant)
    const logoUrl = data.images && data.images.length > 0 ? data.images[0] : undefined;

    // 5. Build result
    if (bestAddress || bestBookingLink || city) {
        return [{
            name: restaurantName,
            address: bestAddress,
            city: city,
            bookingLink: bestBookingLink,
            logoUrl: logoUrl,
        }];
    }

    return [];
}

// =============================================================================
// BOOKING LINK HELPERS
// =============================================================================

const BOOKING_DOMAINS = [
    'tabit.cloud',
    'tabitisrael.co.il',
    'ontopo.co.il',
    'ontopo.com',
    'opentable.com',
    'resy.com',
    'sevenrooms.com',
    'yelp.com/reservations',
];

const GENERIC_PATH_TERMS = [
    'search', 'explore', 'il', 'en', 'he', 'login', 'signup',
    'restaurant', 'restaurants', 'cities', 'regions', 'area', 'zone',
    'home', 'main', 'index', 'about', 'contact', 'terms', 'privacy',
    'tel-aviv', 'jerusalem', 'haifa', 'herzliya', 'netanya', 'jaffa',
    'eilat', 'telaviv', 'collection', 'collections', 'category', 'categories',
    'restaurant-collection', 'restaurant-collections', 'best-restaurants'
];

/**
 * Check if URL is a known booking platform
 */
function isBookingPlatform(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return BOOKING_DOMAINS.some(domain => hostname.includes(domain));
    } catch {
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

        if (path === '/' || path === '') return true;

        const pathSegments = path.split('/').filter(Boolean);
        if (pathSegments.length > 0 && pathSegments.every(seg => GENERIC_PATH_TERMS.includes(seg))) {
            return true;
        }

        return false;
    } catch {
        return true;
    }
}

/**
 * Select the best booking link from candidates
 */
function selectBestBookingLink(links: string[], restaurantName: string): string | undefined {
    if (links.length === 0) return undefined;

    const uniqueLinks = Array.from(new Set(links));
    return uniqueLinks.sort((a, b) => getLinkScore(b, restaurantName) - getLinkScore(a, restaurantName))[0];
}

/**
 * Score a booking link for prioritization
 */
function getLinkScore(link: string, name: string): number {
    let score = 0;
    const lowerLink = link.toLowerCase();

    // Domain priority
    if (lowerLink.includes('tabit.cloud')) score += 10;
    else if (lowerLink.includes('ontopo')) score += 8;
    else score += 1;

    // Name match bonus
    const simpleName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (simpleName.length > 3 && lowerLink.replace(/[^a-z0-9]/g, '').includes(simpleName)) {
        score += 5;
    }

    return score;
}

// =============================================================================
// GEOCODING
// =============================================================================

/**
 * Geocode results that have address but missing coordinates
 */
async function geocodeResults(results: SearchResult[], name: string, city?: string): Promise<void> {
    for (const result of results) {
        if (result.address && (!result.lat || !result.lng)) {
            const cleanedAddress = cleanAddressForGeocoding(result.address, city);
            const coords = await geocodeAddress(cleanedAddress);
            if (coords) {
                result.lat = coords.lat;
                result.lng = coords.lng;
            }
        } else if (!result.address && city && (!result.lat || !result.lng)) {
            // Fallback: try geocoding with restaurant name + city
            const fallbackQuery = `${name}, ${city}, Israel`;
            const coords = await geocodeAddress(fallbackQuery);
            if (coords) {
                result.lat = coords.lat;
                result.lng = coords.lng;
                result.address = `${city}, Israel`;
            }
        }
    }
}

/**
 * Geocode an address using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error('[Geocode] Google Maps API key not configured');
        return null;
    }

    try {
        const encoded = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}&region=il`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`[Geocode] HTTP error: ${response.status}`);
            return null;
        }

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
        console.error('[Geocode] Error:', error);
        return null;
    }
}
