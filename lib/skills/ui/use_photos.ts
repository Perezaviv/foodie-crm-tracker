/**
 * Skill: UsePhotos
 * @owner AGENT-2
 * @status READY
 * @created 2026-01-31
 * @dependencies supabase_client
 * 
 * React hook for restaurant photo operations.
 */

'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface Photo {
    id: string;
    restaurant_id: string;
    url: string;
    created_at: string;
}

export interface UsePhotosOutput {
    photos: Photo[];
    isLoading: boolean;
    error: string | null;
    fetchPhotos: (restaurantId: string) => Promise<void>;
    uploadPhoto: (restaurantId: string, file: File) => Promise<Photo | null>;
    deletePhoto: (photoId: string) => Promise<boolean>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * React hook for managing restaurant photos.
 * Provides fetch, upload, and delete operations.
 * 
 * @example
 * const { photos, fetchPhotos, uploadPhoto } = usePhotos();
 * 
 * useEffect(() => {
 *     fetchPhotos(restaurantId);
 * }, [restaurantId]);
 */
export function usePhotos(): UsePhotosOutput {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPhotos = useCallback(async (restaurantId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/photos?restaurant_id=${restaurantId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch photos: ${response.status}`);
            }
            const data = await response.json();
            setPhotos(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch photos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadPhoto = useCallback(async (restaurantId: string, file: File): Promise<Photo | null> => {
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('restaurant_id', restaurantId);

            const response = await fetch('/api/photos', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Failed to upload: ${response.status}`);
            }

            const newPhoto = await response.json();
            setPhotos(prev => [...prev, newPhoto]);
            return newPhoto;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload photo');
            return null;
        }
    }, []);

    const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/photos/${photoId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete: ${response.status}`);
            }

            setPhotos(prev => prev.filter(p => p.id !== photoId));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete photo');
            return false;
        }
    }, []);

    return {
        photos,
        isLoading,
        error,
        fetchPhotos,
        uploadPhoto,
        deletePhoto,
    };
}
