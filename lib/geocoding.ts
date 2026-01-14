/**
 * Shared geocoding utilities
 */

/**
 * Clean a noisy address for geocoding
 * Strips booking info, descriptions, phone numbers, etc.
 * 
 * Examples:
 *   "Maze St 3. To book a table, call..." → "Maze St 3, Tel Aviv, Israel"
 *   "9 Montefiore Street, Tel Aviv\n\nBook a table" → "9 Montefiore Street, Tel Aviv, Israel"
 */
export function cleanAddressForGeocoding(address: string, city?: string | null): string {
    // Remove newlines and extra whitespace
    let cleaned = address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove common noise patterns (take only the first sentence before these phrases)
    const noisePhrases = [
        /\.\s*(To book|It is known|It is currently|Book a table|Booking|Instagram|Call|Phone)/i,
        /\.\s*[A-Z]/,  // Any sentence after first (starts with capital letter)
    ];
    for (const pattern of noisePhrases) {
        const match = cleaned.match(pattern);
        if (match && match.index) {
            cleaned = cleaned.substring(0, match.index).trim();
        }
    }

    // Remove trailing period
    cleaned = cleaned.replace(/\.$/, '').trim();

    // If no city in address and city is provided, append it
    const lowerCleaned = cleaned.toLowerCase();
    if (city && !lowerCleaned.includes(city.toLowerCase()) && !lowerCleaned.includes('tel aviv')) {
        cleaned = `${cleaned}, ${city}`;
    }

    // Add Israel for better geocoding accuracy (if not already present)
    if (!lowerCleaned.includes('israel')) {
        cleaned = `${cleaned}, Israel`;
    }

    return cleaned;
}
