/**
 * Skill: RestaurantCRUD
 * @owner AGENT-4
 * @status READY
 * @created 2026-01-31
 * @dependencies [supabase_client]
 */

import { getSupabaseClient } from './supabase_client';
import type { Restaurant, RestaurantInsert, RestaurantUpdate } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface RestaurantCRUDOutput<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get all restaurants from the database.
 * 
 * @example
 * const { data: restaurants } = await getRestaurants();
 */
export async function getRestaurants(): Promise<RestaurantCRUDOutput<Restaurant[]>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'server' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data, error } = await client
            .from('restaurants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data as Restaurant[] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : JSON.stringify(error)
        };
    }
}

/**
 * Get a single restaurant by ID.
 * 
 * @example
 * const { data: restaurant } = await getRestaurantById('123');
 */
export async function getRestaurantById(id: string): Promise<RestaurantCRUDOutput<Restaurant>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'server' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data, error } = await client
            .from('restaurants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return { success: true, data: data as Restaurant };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : JSON.stringify(error)
        };
    }
}

/**
 * Create a new restaurant.
 * 
 * @example
 * const { data: restaurant } = await createRestaurant({ name: 'Great Pizza' });
 */
export async function createRestaurant(data: RestaurantInsert): Promise<RestaurantCRUDOutput<Restaurant>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data: record, error } = await client
            .from('restaurants')
            .insert(data)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data: record as Restaurant };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : JSON.stringify(error)
        };
    }
}

/**
 * Update an existing restaurant.
 * 
 * @example
 * const { data: restaurant } = await updateRestaurant('123', { rating: 5 });
 */
export async function updateRestaurant(id: string, data: RestaurantUpdate): Promise<RestaurantCRUDOutput<Restaurant>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data: record, error } = await client
            .from('restaurants')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data: record as Restaurant };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : JSON.stringify(error)
        };
    }
}

/**
 * Delete a restaurant and its associated photos.
 * 
 * @example
 * await deleteRestaurant('123');
 */
export async function deleteRestaurant(id: string): Promise<RestaurantCRUDOutput<void>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        // First delete associated photos from storage
        const { data: photos } = await client
            .from('photos')
            .select('storage_path')
            .eq('restaurant_id', id);

        if (photos && photos.length > 0) {
            const paths = photos.map(p => p.storage_path);
            await client.storage.from('photos').remove(paths);
        }

        // Delete from database
        const { error } = await client
            .from('restaurants')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : JSON.stringify(error)
        };
    }
}
