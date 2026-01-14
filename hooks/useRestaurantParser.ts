'use client';

import { useState, useCallback } from 'react';
import type { RestaurantInsert, Restaurant } from '@/lib/types';
import { addDemoRestaurant } from './useRestaurants';

interface ParseResponse {
    success: boolean;
    restaurant?: Partial<RestaurantInsert>;
    requiresSelection?: boolean;
    alternatives?: Array<{
        name: string;
        address?: string;
        city?: string;
        bookingLink?: string;
    }>;
    error?: string;
}

interface UseRestaurantParserReturn {
    parse: (input: string) => Promise<void>;
    selectAlternative: (index: number) => void;
    save: () => Promise<Restaurant | null>;
    reset: () => void;
    isLoading: boolean;
    isParsing: boolean;
    isSaving: boolean;
    error: string | null;
    parsedRestaurant: Partial<RestaurantInsert> | null;
    alternatives: ParseResponse['alternatives'];
    requiresSelection: boolean;
}

export function useRestaurantParser(): UseRestaurantParserReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedRestaurant, setParsedRestaurant] = useState<Partial<RestaurantInsert> | null>(null);
    const [alternatives, setAlternatives] = useState<ParseResponse['alternatives']>(undefined);
    const [requiresSelection, setRequiresSelection] = useState(false);

    const parse = useCallback(async (input: string) => {
        setIsParsing(true);
        setIsLoading(true);
        setError(null);
        setParsedRestaurant(null);
        setAlternatives(undefined);
        setRequiresSelection(false);

        try {
            const response = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input }),
            });

            const data: ParseResponse = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to parse input');
                return;
            }

            if (data.requiresSelection && data.alternatives) {
                setAlternatives(data.alternatives);
                setRequiresSelection(true);
            } else if (data.restaurant) {
                setParsedRestaurant(data.restaurant);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsParsing(false);
            setIsLoading(false);
        }
    }, []);

    const selectAlternative = useCallback((index: number) => {
        if (!alternatives || !alternatives[index]) return;

        const selected = alternatives[index];
        setParsedRestaurant({
            name: selected.name,
            address: selected.address,
            city: selected.city,
            booking_link: selected.bookingLink,
        });
        setRequiresSelection(false);
        setAlternatives(undefined);
    }, [alternatives]);

    const save = useCallback(async (): Promise<Restaurant | null> => {
        if (!parsedRestaurant || !parsedRestaurant.name) {
            setError('No restaurant to save');
            return null;
        }

        setIsSaving(true);
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurant: parsedRestaurant }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to save restaurant');
                return null;
            }

            // In demo mode, also save to sessionStorage for persistence
            if (data.demo && data.restaurant) {
                addDemoRestaurant(data.restaurant);
            }

            return data.restaurant;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
            return null;
        } finally {
            setIsSaving(false);
            setIsLoading(false);
        }
    }, [parsedRestaurant]);

    const reset = useCallback(() => {
        setIsLoading(false);
        setIsParsing(false);
        setIsSaving(false);
        setError(null);
        setParsedRestaurant(null);
        setAlternatives(undefined);
        setRequiresSelection(false);
    }, []);

    return {
        parse,
        selectAlternative,
        save,
        reset,
        isLoading,
        isParsing,
        isSaving,
        error,
        parsedRestaurant,
        alternatives,
        requiresSelection,
    };
}
