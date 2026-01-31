/**
 * Skill: AddRestaurant
 * @owner AGENT-1
 * @status DRAFT
 * @created 2026-01-31
 * @dependencies supabase_client, send_message
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { getSupabaseClient } from '../db/supabase_client';
import { sendMessage } from './send_message';
import { MESSAGES } from '../../telegram-messages';
import type { SearchResult } from '../ai/search_restaurant';
import type { Database } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface AddRestaurantInput {
    chatId: number;
    data: SearchResult;
    silent?: boolean;
}

export interface AddRestaurantOutput {
    success: boolean;
    data?: {
        restaurant: Database['public']['Tables']['restaurants']['Row'];
    };
    error?: string;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Adds a restaurant to the database with all provided details
 * 
 * @example
 * const result = await addRestaurant({
 *     chatId: 123456789,
 *     data: {
 *         name: 'מזנון',
 *         address: 'רחוב דיזנגוף 123, תל אביב',
 *         lat: 32.0853,
 *         lng: 34.7818,
 *         cuisine: 'מזרחי',
 *         rating: 4.5
 *     }
 * });
 */
export async function addRestaurant(input: AddRestaurantInput): Promise<AddRestaurantOutput> {
    try {
        const { chatId, data, silent = false } = input;

        // Get admin Supabase client
        const { client: supabase, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !supabase) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        // Derive city - prefer from data.city, then try to extract from address
        let derivedCity = data.city;
        if (!derivedCity && data.address) {
            if (data.address.toLowerCase().includes('tel aviv')) {
                derivedCity = 'Tel Aviv';
            } else {
                const parts = data.address.split(',');
                if (parts.length > 1) {
                    derivedCity = parts[1].trim();
                }
            }
        }

        const insertPayload = {
            name: data.name,
            address: data.address,
            lat: data.lat,
            lng: data.lng,
            booking_link: data.bookingLink,
            social_link: data.socialLink,
            cuisine: data.cuisine,
            rating: data.rating,
            is_visited: false,
            city: derivedCity,
            logo_url: data.logoUrl,
        };

        const { data: restaurant, error } = await supabase
            .from('restaurants')
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (!silent) {
            let msg = MESSAGES.ADDED_RESTAURANT(restaurant.name);
            if (restaurant.address) msg += `\n📍 ${restaurant.address}`;
            if (restaurant.booking_link) msg += `\n🔗 [${MESSAGES.BOOKING_LINK_TEXT}](${restaurant.booking_link})`;
            
            await sendMessage({ chatId, text: msg });
        }

        return { 
            success: true, 
            data: { restaurant } 
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Send error message to user
        await sendMessage({ chatId: input.chatId, text: MESSAGES.ERROR_SAVING(errorMessage) });
        
        return { 
            success: false, 
            error: errorMessage 
        };
    }
}