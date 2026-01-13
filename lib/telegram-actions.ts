import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// ============================================================
// TYPES
// ============================================================

export interface ParsedRestaurant {
    name: string | null;
    city: string | null;
    notes: string | null;
}

export interface AddRestaurantResult {
    success: boolean;
    restaurant?: Database['public']['Tables']['restaurants']['Row'];
    error?: string;
    message: string;
}

// ============================================================
// LOGIC
// ============================================================

/**
 * Parses a restaurant message into structured data.
 * Supports formats like:
 *   - "Restaurant Name"
 *   - "Restaurant Name, City"
 *   - "Restaurant Name, City - some notes"
 */
export function parseRestaurantMessage(text: string): ParsedRestaurant {
    const trimmed = text.trim();

    // Check for notes (after dash)
    let mainPart = trimmed;
    let notes: string | null = null;

    const dashIndex = trimmed.indexOf(' - ');
    if (dashIndex !== -1) {
        mainPart = trimmed.substring(0, dashIndex).trim();
        notes = trimmed.substring(dashIndex + 3).trim();
    }

    // Check for city (after comma)
    let name = mainPart;
    let city: string | null = null;

    const commaIndex = mainPart.indexOf(',');
    if (commaIndex !== -1) {
        name = mainPart.substring(0, commaIndex).trim();
        city = mainPart.substring(commaIndex + 1).trim();
    }

    return {
        name: name || null,
        city: city || null,
        notes: notes || null,
    };
}

/**
 * Adds a restaurant to Supabase based on parsed text
 */
export async function addRestaurantFromText(
    text: string,
    supabase: SupabaseClient<Database>
): Promise<AddRestaurantResult> {
    const parsed = parseRestaurantMessage(text);

    if (!parsed.name) {
        return {
            success: false,
            message: '❌ Please send a restaurant name.',
        };
    }

    try {
        const { data, error } = await supabase
            .from('restaurants')
            .insert({
                name: parsed.name,
                city: parsed.city,
                notes: parsed.notes,
                is_visited: false,
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase error:', error);
            return {
                success: false,
                error: error.message,
                message: `❌ Failed to add restaurant: ${error.message}`,
            };
        }

        let successMessage = `✅ Added *${parsed.name}*`;
        if (parsed.city) {
            successMessage += ` in ${parsed.city}`;
        }
        successMessage += ` to your list!`;

        return {
            success: true,
            restaurant: data,
            message: successMessage,
        };

    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            message: '❌ An unexpected error occurred. Please try again.',
        };
    }
}
