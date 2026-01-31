/**
 * Skill: UseRestaurants
 * @owner AGENT-2
 * @status READY
 * @created 2026-01-31
 * @dependencies supabase_client
 * 
 * React hook for restaurant CRUD operations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Restaurant } from '../../types';
import { getSupabaseClient } from '../db';

// =============================================================================
// TYPES
// =============================================================================

export interface UseRestaurantsOutput {
    restaurants: Restaurant[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    addRestaurant: (data: Partial<Restaurant>) => Promise<Restaurant | null>;
    updateRestaurant: (id: string, data: Partial<Restaurant>) => Promise<boolean>;
    deleteRestaurant: (id: string) => Promise<boolean>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * React hook for managing restaurant data.
 * Provides fetch, add, update, and delete operations.
 * 
 * @example
 * const { restaurants, isLoading, addRestaurant } = useRestaurants();
 * 
 * const handleAdd = async () => {
 *     const newRestaurant = await addRestaurant({ name: 'New Place' });
 * };
 */
export function useRestaurants(): UseRestaurantsOutput {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRestaurants = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/restaurants');
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            const data = await response.json();
            setRestaurants(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch restaurants');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRestaurants();
    }, [fetchRestaurants]);

    const addRestaurant = useCallback(async (data: Partial<Restaurant>): Promise<Restaurant | null> => {
        try {
            const response = await fetch('/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Failed to add: ${response.status}`);
            }

            const newRestaurant = await response.json();
            setRestaurants(prev => [...prev, newRestaurant]);
            return newRestaurant;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add restaurant');
            return null;
        }
    }, []);

    const updateRestaurant = useCallback(async (id: string, data: Partial<Restaurant>): Promise<boolean> => {
        try {
            const response = await fetch(`/api/restaurants/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Failed to update: ${response.status}`);
            }

            const updated = await response.json();
            setRestaurants(prev => prev.map(r => r.id === id ? updated : r));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update restaurant');
            return false;
        }
    }, []);

    const deleteRestaurant = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/restaurants/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete: ${response.status}`);
            }

            setRestaurants(prev => prev.filter(r => r.id !== id));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete restaurant');
            return false;
        }
    }, []);

    return {
        restaurants,
        isLoading,
        error,
        refetch: fetchRestaurants,
        addRestaurant,
        updateRestaurant,
        deleteRestaurant,
    };
}
