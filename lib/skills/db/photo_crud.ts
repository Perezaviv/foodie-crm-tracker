/**
 * Skill: PhotoCRUD
 * @owner AGENT-4
 * @status READY
 * @created 2026-01-31
 * @dependencies [supabase_client]
 */

import { getSupabaseClient } from './supabase_client';
import type { Photo } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface PhotoCRUDOutput<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PhotoWithUrl extends Photo {
    url: string;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get all photos for a specific restaurant.
 * 
 * @example
 * const { data: photos } = await getPhotos('rest-123');
 */
export async function getPhotos(restaurantId: string): Promise<PhotoCRUDOutput<PhotoWithUrl[]>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'server' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        const { data, error } = await client
            .from('photos')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        // Add public URLs
        const photosWithUrls = (data || []).map(photo => {
            const { data: urlData } = client.storage
                .from('photos')
                .getPublicUrl(photo.storage_path);

            return {
                ...photo,
                url: urlData.publicUrl,
            };
        });

        return { success: true, data: photosWithUrls };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Upload a photo file and save its record.
 * 
 * @example
 * const { data: photo } = await uploadPhoto(buffer, 'image/jpeg', 'rest-123', 'photo.jpg');
 */
export async function uploadPhoto(
    buffer: Buffer,
    contentType: string,
    restaurantId: string,
    originalName: string
): Promise<PhotoCRUDOutput<PhotoWithUrl>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        // Generate unique filename
        const ext = originalName.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const storagePath = `restaurants/${restaurantId}/${timestamp}_${randomId}.${ext}`;

        // Upload to Storage
        const { error: uploadError } = await client.storage
            .from('photos')
            .upload(storagePath, buffer, {
                contentType,
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = client.storage
            .from('photos')
            .getPublicUrl(storagePath);

        // Save to DB
        const { data: photoRecord, error: dbError } = await client
            .from('photos')
            .insert({
                restaurant_id: restaurantId,
                storage_path: storagePath,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return {
            success: true,
            data: {
                ...photoRecord,
                url: urlData.publicUrl
            } as PhotoWithUrl
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Delete a photo from storage and database.
 * 
 * @example
 * await deletePhoto('photo-123', 'restaurants/rest-123/img.jpg');
 */
export async function deletePhoto(photoId: string, storagePath: string): Promise<PhotoCRUDOutput<void>> {
    try {
        const { client, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !client) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        // Delete from Storage
        const { error: storageError } = await client.storage
            .from('photos')
            .remove([storagePath]);

        if (storageError) {
            console.warn('[PhotoCRUD] Storage delete error:', storageError);
        }

        // Delete from Database
        const { error: dbError } = await client
            .from('photos')
            .delete()
            .eq('id', photoId);

        if (dbError) throw dbError;

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
