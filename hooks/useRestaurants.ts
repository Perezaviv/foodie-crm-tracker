'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Restaurant } from '@/lib/types';

const DEMO_RESTAURANTS_KEY = 'foodie-crm-demo-restaurants';

// Helper to get demo restaurants from sessionStorage
function getDemoRestaurants(): Restaurant[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = sessionStorage.getItem(DEMO_RESTAURANTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Helper to save demo restaurants to sessionStorage
function saveDemoRestaurants(restaurants: Restaurant[]): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(DEMO_RESTAURANTS_KEY, JSON.stringify(restaurants));
    } catch {
        // Ignore storage errors
    }
}

// Helper to add a demo restaurant
export function addDemoRestaurant(restaurant: Restaurant): void {
    const existing = getDemoRestaurants();
    // Add to beginning of array (newest first)
    saveDemoRestaurants([restaurant, ...existing]);
}

// Helper to remove a demo restaurant
export function removeDemoRestaurant(id: string): void {
    const existing = getDemoRestaurants();
    saveDemoRestaurants(existing.filter(r => r.id !== id));
}

interface UseRestaurantsReturn {
    restaurants: Restaurant[];
    isLoading: boolean;
    error: string | null;
    isDemoMode: boolean;
    refresh: () => Promise<void>;
}

export function useRestaurants(): UseRestaurantsReturn {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);

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

            const apiRestaurants = data.restaurants || [];
            const isDemo = data.demo === true;
            setIsDemoMode(isDemo);

            if (isDemo) {
                // In demo mode, merge with locally stored restaurants
                const demoRestaurants = getDemoRestaurants();
                // Filter out duplicates by ID
                const apiIds = new Set(apiRestaurants.map((r: Restaurant) => r.id));
                const uniqueDemoRestaurants = demoRestaurants.filter(r => !apiIds.has(r.id));
                setRestaurants([...uniqueDemoRestaurants, ...apiRestaurants]);
            } else {
                setRestaurants(apiRestaurants);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { restaurants, isLoading, error, isDemoMode, refresh };
}
