/**
 * Skill: ParseBookingLink
 * @owner AGENT-3
 * @status READY
 * @created 2026-01-31
 * @dependencies none
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ParseBookingLinkInput {
    links: string[];
    restaurantName: string;
}

export interface ParseBookingLinkOutput {
    success: boolean;
    data?: {
        bestLink?: string;
        allLinks: ScoredLink[];
    };
    error?: string;
}

export interface ScoredLink {
    url: string;
    score: number;
    platform: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BOOKING_DOMAINS = [
    { domain: 'tabit.cloud', platform: 'Tabit', weight: 10 },
    { domain: 'tabitisrael.co.il', platform: 'Tabit', weight: 10 },
    { domain: 'ontopo.co.il', platform: 'Ontopo', weight: 8 },
    { domain: 'ontopo.com', platform: 'Ontopo', weight: 8 },
    { domain: 'opentable.com', platform: 'OpenTable', weight: 5 },
    { domain: 'resy.com', platform: 'Resy', weight: 5 },
    { domain: 'sevenrooms.com', platform: 'SevenRooms', weight: 4 },
    { domain: 'thefork.com', platform: 'TheFork', weight: 4 },
];

const GENERIC_PATH_TERMS = [
    'search', 'explore', 'login', 'signup', 'restaurant', 'restaurants', 'cities',
    'regions', 'area', 'zone', 'home', 'main', 'index', 'about', 'contact',
    'terms', 'privacy', 'collection', 'collections', 'category', 'categories',
    'restaurant-collection', 'restaurant-collections', 'best-restaurants',
    'tel-aviv', 'jerusalem', 'haifa', 'herzliya', 'netanya', 'jaffa', 'eilat'
];

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Filter, score and select the best booking link from a list of URLs.
 * 
 * @example
 * const result = await parseBookingLink({ 
 *   links: ['https://tabit.cloud/rest/123', 'https://tabit.cloud/search'],
 *   restaurantName: 'Vitrina' 
 * });
 */
export async function parseBookingLink(input: ParseBookingLinkInput): Promise<ParseBookingLinkOutput> {
    const { links, restaurantName } = input;

    if (!links || links.length === 0) {
        return { success: true, data: { allLinks: [] } };
    }

    try {
        const uniqueLinks = Array.from(new Set(links));
        const scoredLinks: ScoredLink[] = [];

        for (const url of uniqueLinks) {
            if (!isValidUrl(url)) continue;

            const platformInfo = getPlatformInfo(url);
            if (!platformInfo) continue;

            if (isGenericLink(url)) continue;

            const score = calculateScore(url, restaurantName, platformInfo.weight);
            scoredLinks.push({
                url,
                score,
                platform: platformInfo.platform
            });
        }

        // Sort by score descending
        scoredLinks.sort((a, b) => b.score - a.score);

        return {
            success: true,
            data: {
                bestLink: scoredLinks[0]?.url,
                allLinks: scoredLinks
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse booking links'
        };
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function getPlatformInfo(url: string) {
    const hostname = new URL(url).hostname.toLowerCase();
    return BOOKING_DOMAINS.find(d => hostname.includes(d.domain));
}

function isGenericLink(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname.toLowerCase();

        if (path === '/' || path === '') return true;

        const segments = path.split('/').filter(Boolean);
        // If all segments are generic terms, it's likely a landing page
        if (segments.length > 0 && segments.every(seg => GENERIC_PATH_TERMS.includes(seg))) {
            return true;
        }

        return false;
    } catch {
        return true;
    }
}

function calculateScore(url: string, name: string, baseWeight: number): number {
    let score = baseWeight;
    const lowerUrl = url.toLowerCase();

    // Improved name match: clean name and check if it exists as a slug or part of path
    const cleanName = name.toLowerCase()
        .replace(/[^a-z0-9\u0590-\u05FF]/g, ' ')
        .trim();

    const nameSegments = cleanName.split(/\s+/).filter(s => s.length > 2);

    for (const segment of nameSegments) {
        if (lowerUrl.includes(segment)) {
            score += 5;
        }
    }

    // Exact match of first word (often the main brand)
    if (nameSegments[0] && lowerUrl.includes(nameSegments[0])) {
        score += 5;
    }

    // Penalize long query params (could be tracking links, though usually okay)
    if (url.includes('utm_')) score -= 1;

    return score;
}
