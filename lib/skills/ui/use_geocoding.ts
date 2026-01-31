/**
 * Skill: UseGeocoding
 * @owner AGENT-2
 * @status READY
 * @created 2026-01-31
 * @dependencies none
 */

'use client';

import { useState, useCallback } from 'react';
import type { Restaurant } from '../../types';
import { cleanAddressForGeocoding } from '../../geocoding';

// =============================================================================
// TYPES
// =============================================================================

export interface UseGeocodingOutput {
    isGeocoding: boolean;
    autoFixLocations: (restaurants: Restaurant[]) => Promise<{ fixedCount: number; errorCount: number }>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook for geocoding operations, specifically Auto-Fixing missing locations.
 * 
 * @example
 * const { isGeocoding, autoFixLocations } = useGeocoding();
 * const result = await autoFixLocations(restaurants);
 */
export function useGeocoding(): UseGeocodingOutput {
    const [isGeocoding, setIsGeocoding] = useState(false);

    const autoFixLocations = useCallback(async (restaurants: Restaurant[]) => {
        setIsGeocoding(true);
        let fixedCount = 0;
        let errorCount = 0;

        try {
            const missing = restaurants.filter(r => r.lat === null || r.lng === null);

            for (const rest of missing) {
                let geocodeQuery: string;

                if (rest.address) {
                    geocodeQuery = cleanAddressForGeocoding(rest.address, rest.city);
                } else if (rest.city) {
                    geocodeQuery = `${rest.name}, ${rest.city}, Israel`;
                } else {
                    geocodeQuery = `${rest.name} restaurant, Israel`;
                }

                try {
                    const res = await fetch('/api/geocode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ address: geocodeQuery })
                    });

                    const coords = await res.json();
                    if (coords.success) {
                        const patchRes = await fetch(`/api/restaurants/${rest.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                lat: Number(coords.lat),
                                lng: Number(coords.lng)
                            })
                        });

                        if (patchRes.ok) {
                            fixedCount++;
                        } else {
                            const errorData = await patchRes.json();
                            console.error(`[useGeocoding] PATCH failed for "${rest.name}":`, errorData.error);
                            errorCount++;
                        }
                    } else {
                        console.warn(`[useGeocoding] Geocoding failed for "${rest.name}":`, coords.error);
                        errorCount++;
                    }
                } catch (err) {
                    console.error(`[useGeocoding] Error fixing "${rest.name}":`, err);
                    errorCount++;
                }
            }
        } catch (err) {
            console.error('[useGeocoding] Auto-fix loop failed:', err);
        } finally {
            setIsGeocoding(false);
        }

        return { fixedCount, errorCount };
    }, []);

    return {
        isGeocoding,
        autoFixLocations,
    };
}
