'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Restaurant } from '@/lib/types';

interface UseRestaurantsReturn {
    restaurants: Restaurant[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useRestaurants(): UseRestaurantsReturn {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/restaurants');
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to fetch restaurants');
                return;
            }

            setRestaurants(data.restaurants || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { restaurants, isLoading, error, refresh };
}
