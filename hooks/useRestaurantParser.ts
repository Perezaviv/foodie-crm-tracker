'use client';

import { useState, useCallback } from 'react';
import type { RestaurantInsert, Restaurant } from '@/lib/types';

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
            // Create a copy to potentially add coordinates
            const restaurantToSave = { ...parsedRestaurant };

            // Client-side geocoding if we have an address but no coordinates
            if (restaurantToSave.address && (!restaurantToSave.lat || !restaurantToSave.lng)) {
                console.log('[Save] Attempting client-side geocoding...');

                // Clean the address before geocoding
                const cleanAddress = (addr: string, city?: string | null): string => {
                    let cleaned = addr.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    // Remove noise
                    const noisePhrases = [
                        /\.\s*(To book|It is known|Book a table|Booking|Instagram|Call|Phone|It is currently)/i,
                        /\.\s*[A-Z]/,
                    ];
                    for (const pattern of noisePhrases) {
                        const match = cleaned.match(pattern);
                        if (match && match.index) {
                            cleaned = cleaned.substring(0, match.index).trim();
                        }
                    }
                    cleaned = cleaned.replace(/\.$/, '').trim();
                    const lower = cleaned.toLowerCase();
                    if (city && !lower.includes(city.toLowerCase()) && !lower.includes('tel aviv')) {
                        cleaned = `${cleaned}, ${city}`;
                    }
                    if (!lower.includes('israel')) {
                        cleaned = `${cleaned}, Israel`;
                    }
                    return cleaned;
                };

                const cleanedAddress = cleanAddress(restaurantToSave.address, restaurantToSave.city);
                console.log(`[Save] Cleaned address: "${cleanedAddress}"`);

                // Use client-side geocoder if available (Google Maps is loaded)
                if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
                    try {
                        const geocoder = new google.maps.Geocoder();
                        const result = await new Promise<google.maps.GeocoderResult[] | null>((resolve) => {
                            geocoder.geocode({ address: cleanedAddress }, (results, status) => {
                                console.log(`[Save] Geocode status: ${status}`);
                                if (status === 'OK' && results) resolve(results);
                                else resolve(null);
                            });
                        });
                        if (result && result[0]) {
                            restaurantToSave.lat = result[0].geometry.location.lat();
                            restaurantToSave.lng = result[0].geometry.location.lng();
                            console.log(`[Save] Geocoded: ${restaurantToSave.lat}, ${restaurantToSave.lng}`);
                        }
                    } catch (geoError) {
                        console.warn('[Save] Client geocoding error:', geoError);
                    }
                } else {
                    console.warn('[Save] Google Maps Geocoder not available');
                }
            }

            const response = await fetch('/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurant: restaurantToSave }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to save restaurant');
                return null;
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
