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
import { notifyGroup } from './notify_group';
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
    userName?: string; // New field for notification attribution
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
 *     },
 *     userName: 'Aviv'
 * });
 */
export async function addRestaurant(input: AddRestaurantInput): Promise<AddRestaurantOutput> {
    try {
        const { chatId, data, silent = false, userName } = input;

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

        // Check for existing restaurant by name and city
        const { data: existingRestaurant } = await supabase
            .from('restaurants')
            .select('*')
            .ilike('name', data.name)
            .ilike('city', derivedCity || '%')
            .maybeSingle();

        if (existingRestaurant) {
            console.log(`[AddRestaurant] Found existing restaurant: ${existingRestaurant.name} (ID: ${existingRestaurant.id})`);

            if (!silent) {
                await sendMessage({
                    chatId,
                    text: MESSAGES.RESTAURANT_EXISTS(existingRestaurant.name)
                });

                // Notify Group even for found restaurants
                await notifyGroup({
                    text: `found existing restaurant: *${existingRestaurant.name}*`,
                    actionBy: userName
                });
            }

            return {
                success: true,
                data: { restaurant: existingRestaurant }
            };
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

            // Notify Group
            await notifyGroup({
                text: `added a new restaurant: *${restaurant.name}* 🏙️`,
                actionBy: userName
            });
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