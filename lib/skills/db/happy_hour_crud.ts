
import { getSupabaseClient } from './supabase_client';
import type { HappyHour } from '../../happy_hour_types';
import type { RestaurantCRUDOutput } from './restaurant_crud';

/**
 * Get all happy hours from the database.
 */
export async function getHappyHours(): Promise<RestaurantCRUDOutput<HappyHour[]>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'server' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data, error } = await client
            .from('happy_hours')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data as HappyHour[] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : JSON.stringify(error)
        };
    }
}

/**
 * Update a happy hour record.
 */
export async function updateHappyHour(id: string, updates: Partial<HappyHour>): Promise<RestaurantCRUDOutput<HappyHour>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'server' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data, error } = await client
            .from('happy_hours')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data: data as HappyHour };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : JSON.stringify(error)
        };
    }
}

/**
 * Delete a happy hour record.
 */
export async function deleteHappyHour(id: string): Promise<RestaurantCRUDOutput<void>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'server' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { error } = await client
            .from('happy_hours')
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
