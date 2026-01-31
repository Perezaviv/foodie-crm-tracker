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
            const url = mode === 'happy_hour'
                ? '/api/restaurants?mode=happy_hour'
                : '/api/restaurants';

            const response = await fetch(url);
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to fetch restaurants');
                return;
            }

            setRestaurants(data.restaurants || []);
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
