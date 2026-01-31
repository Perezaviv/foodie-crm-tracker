/**
 * Skill: AddComment
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
import type { Database } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface AddCommentInput {
    chatId: number;
    restaurantName: string;
    commentText: string;
}

export interface AddCommentOutput {
    success: boolean;
    data?: {
        restaurantName: string;
        commentText: string;
    };
    error?: string;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Adds a comment to a restaurant in the database
 * 
 * @example
 * const result = await addComment({
 *     chatId: 123456789,
 *     restaurantName: 'מזנון',
 *     commentText: 'הפיתה הכי טובה בעיר!'
 * });
 */
export async function addComment(input: AddCommentInput): Promise<AddCommentOutput> {
    try {
        const { chatId, restaurantName, commentText } = input;

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

        const restaurant = restaurants[0];

        // Add comment
        const { error: insertError } = await supabase
            .from('comments')
            .insert({
                restaurant_id: restaurant.id,
                content: commentText,
                author_name: 'Telegram User',
            });

        if (insertError) {
            await sendMessage({ chatId, text: MESSAGES.COMMENT_ERROR(insertError.message) });
            throw new Error(`Failed to add comment: ${insertError.message}`);
        }

        await sendMessage({ chatId, text: MESSAGES.COMMENT_SUCCESS(restaurant.name, commentText) });

        return { 
            success: true, 
            data: { restaurantName: restaurant.name, commentText } 
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error('[TG] Comment failed:', error);
        
        // Handle special case for missing environment variable
        if (errorMessage?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            try {
                await sendMessage({ chatId: input.chatId, text: '⚠️ **System Error**: `SUPABASE_SERVICE_ROLE_KEY` is missing.' });
            } catch (sendError) {
                console.error('Failed to send error message:', sendError);
            }
        }
        
        return { 
            success: false, 
            error: errorMessage 
        };
    }
}