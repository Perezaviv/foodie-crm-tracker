/**
 * Skill: RateRestaurant
 * @owner AGENT-1
 * @status READY
 * @created 2026-01-31
 * @dependencies supabase_client, send_message
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { getSupabaseClient } from '../db/supabase_client';
import { sendMessage } from './send_message';
import { notifyGroup } from './notify_group';
import { MESSAGES } from '../../telegram-messages';
import type { Database } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface RateRestaurantInput {
    chatId: number;
    restaurantName: string;
    rating: number;
    userName?: string;
}

export interface RateRestaurantOutput {
    success: boolean;
    data?: {
        restaurantName: string;
        rating: number;
    };
    error?: string;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Updates a restaurant's rating in the database
 * 
 * @example
 * const result = await rateRestaurant({
 *     chatId: 123456789,
 *     restaurantName: 'מזנון',
 *     rating: 5,
 *     userName: 'Aviv'
 * });
 */
export async function rateRestaurant(input: RateRestaurantInput): Promise<RateRestaurantOutput> {
    try {
        const { chatId, restaurantName, rating, userName } = input;

        // Validate rating range
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        // Get admin Supabase client
        const { client: supabase, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !supabase) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        // Find restaurant by name (case-insensitive)
        const { data: restaurants, error: findError } = await supabase
            .from('restaurants')
            .select('id, name')
            .ilike('name', `%${restaurantName}%`)
            .limit(5);

        if (findError || !restaurants || restaurants.length === 0) {
            await sendMessage({ chatId, text: MESSAGES.RESTAURANT_NOT_FOUND(restaurantName) });
            throw new Error(`Restaurant "${restaurantName}" not found`);
        }

        // If multiple matches, use the first one (closest match)
        const restaurant = restaurants[0];

        // Update rating
        const { error: updateError } = await supabase
            .from('restaurants')
            .update({ rating })
            .eq('id', restaurant.id);

        if (updateError) {
            await sendMessage({ chatId, text: MESSAGES.RATING_ERROR(updateError.message) });
            throw new Error(`Failed to update rating: ${updateError.message}`);
        }

        await sendMessage({ chatId, text: MESSAGES.RATING_SUCCESS(restaurant.name, rating) });

        // Notify Group
        await notifyGroup({
            text: `rated *${restaurant.name}*: ${'⭐'.repeat(rating)} (${rating})`,
            actionBy: userName
        });

        return {
            success: true,
            data: { restaurantName: restaurant.name, rating }
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            success: false,
            error: errorMessage
        };
    }
}