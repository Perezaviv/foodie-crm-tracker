/**
 * Skill: CommentCRUD
 * @owner AGENT-4
 * @status READY
 * @created 2026-01-31
 * @dependencies [supabase_client]
 */

import { getSupabaseClient } from './supabase_client';
import type { Comment } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface CommentCRUDOutput<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get all comments for a specific restaurant.
 * 
 * @example
 * const { data: comments } = await getComments('rest-123');
 */
export async function getComments(restaurantId: string): Promise<CommentCRUDOutput<Comment[]>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'server' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data, error } = await client
            .from('comments')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data as Comment[] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Add a new comment to a restaurant.
 * 
 * @example
 * const { data: comment } = await addComment('rest-123', 'Delicious!', 'Alice');
 */
export async function addComment(
    restaurantId: string,
    content: string,
    authorName: string = 'Anonymous'
): Promise<CommentCRUDOutput<Comment>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data, error } = await client
            .from('comments')
            .insert({
                restaurant_id: restaurantId,
                content: content.trim(),
                author_name: authorName,
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data: data as Comment };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
