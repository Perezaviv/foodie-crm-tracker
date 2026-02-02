'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Restaurant } from '@/lib/types';

export type AppMode = 'regular' | 'happy_hour';

interface UseRestaurantsReturn {
    restaurants: Restaurant[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useRestaurants(mode: AppMode = 'regular'): UseRestaurantsReturn {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'happy_hour') {
                // Fetch BOTH regular and happy hour data and merge them
                const [regularRes, hhRes] = await Promise.all([
                    fetch('/api/restaurants'),
                    fetch('/api/restaurants?mode=happy_hour')
                ]);

                const regularData = await regularRes.json();
                const hhData = await hhRes.json();

                if (!regularData.success && !hhData.success) {
                    setError('Failed to fetch data');
                    return;
                }

                const regularList = Array.isArray(regularData.restaurants) ? regularData.restaurants : [];
                const hhList = Array.isArray(hhData.restaurants) ? hhData.restaurants : [];

                // Deduplicate by ID if necessary, or just concat?
                // Happy Hours might be separate entities or linked. 
                // Assuming they are separate lists for now.
                // If a restaurant exists in both, prefer Happy Hour version?

                // Let's Create a map of ID -> Restaurant
                const mergedMap = new Map<string, Restaurant>();

                // Add regular first
                regularList.forEach((r: Restaurant) => mergedMap.set(r.id, r));

                // Add Happy Hour (overwrite if exists, as it has more specific info)
                hhList.forEach((r: Restaurant) => mergedMap.set(r.id, r));

                setRestaurants(Array.from(mergedMap.values()));
            } else {
                // Regular mode - just fetch regular restaurants
                const response = await fetch('/api/restaurants');
                const data = await response.json();

                if (!data.success) {
                    setError(data.error || 'Failed to fetch restaurants');
                    return;
                }
                setRestaurants(data.restaurants || []);
            }
        } catch (err) {
            console.error('[useRestaurants] Error fetching:', err);
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { restaurants, isLoading, error, refresh };
}
