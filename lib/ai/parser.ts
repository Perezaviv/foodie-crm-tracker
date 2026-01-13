import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization of Gemini client
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        return null;
    }

    if (!geminiClient) {
        geminiClient = new GoogleGenerativeAI(apiKey);
    }
    return geminiClient;
}

export interface ExtractedRestaurantInfo {
    name: string;
    cuisine?: string;
    city?: string;
    address?: string;
    socialLink?: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface ParseResult {
    success: boolean;
    data?: ExtractedRestaurantInfo;
    error?: string;
    requiresConfirmation?: boolean;
    alternatives?: ExtractedRestaurantInfo[];
}

/**
 * Extract restaurant information from raw text input using Gemini
 * Handles: restaurant names, Instagram/TikTok links, casual descriptions
 */
export async function extractRestaurantInfo(input: string): Promise<ParseResult> {
    const gemini = getGeminiClient();

    if (!gemini) {
        // Fallback: simple extraction without AI
        return {
            success: true,
            data: {
                name: input.trim(),
                confidence: 'medium',
            },
        };
    }

    try {
        const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a restaurant information extractor. Given user input (which could be a restaurant name, social media link, or casual description), extract structured restaurant information.

Return ONLY a valid JSON object with these fields:
- name: The restaurant name (required)
- cuisine: Type of cuisine if mentioned or can be inferred (optional)
- city: City/location if mentioned (optional)
- address: Full address if available (optional)
- socialLink: If input contains a social media URL, include it (optional)
- confidence: "high" if clear restaurant name, "medium" if inferred, "low" if uncertain

If the input is ambiguous or could refer to multiple places, set confidence to "low".

Examples:
- Input: "Vitrina Tel Aviv" → {"name": "Vitrina", "city": "Tel Aviv", "confidence": "high"}
- Input: "that sushi place near the beach" → {"name": "Unknown Sushi Restaurant", "cuisine": "Japanese", "confidence": "low"}
- Input: "https://instagram.com/vitrina_tlv" → {"name": "Vitrina TLV", "socialLink": "https://instagram.com/vitrina_tlv", "confidence": "medium"}

User input: "${input}"

Return ONLY the JSON object, no markdown formatting or explanation.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        if (!text) {
            return { success: false, error: 'No response from AI' };
        }

        // Clean the response - remove markdown code blocks if present
        let jsonStr = text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7);
        }
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const parsed = JSON.parse(jsonStr) as ExtractedRestaurantInfo;

        return {
            success: true,
            data: parsed,
            requiresConfirmation: parsed.confidence === 'low',
        };
    } catch (error) {
        console.error('Error extracting restaurant info:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse input',
        };
    }
}

/**
 * Clean and normalize a restaurant name for search
 */
export function normalizeRestaurantName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Detect if input is a social media URL
 */
export function detectSocialLink(input: string): { isSocial: boolean; platform?: string; handle?: string } {
    const patterns = {
        instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?]+)/i,
        tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([^\/\?]+)/i,
        facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([^\/\?]+)/i,
    };

    for (const [platform, regex] of Object.entries(patterns)) {
        const match = input.match(regex);
        if (match) {
            return { isSocial: true, platform, handle: match[1] };
        }
    }

    return { isSocial: false };
}
