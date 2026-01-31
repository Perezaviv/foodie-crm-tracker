'use client';

import { X, MapPin } from 'lucide-react';
import type { Restaurant } from '@/lib/types';
import { useGeocoding } from '@/lib/skills/ui';
import { toast } from 'sonner';

interface MapSidePanelProps {
    restaurants: Restaurant[];
    restaurantsWithCoords: Restaurant[];
    onClose?: () => void;
}

/**
 * Slide-out panel for map overlay actions and information.
 * Handles "Auto-Fix Locations" functionality.
 */
export function MapSidePanel({ restaurants, restaurantsWithCoords, onClose }: MapSidePanelProps) {
    const { isGeocoding, autoFixLocations } = useGeocoding();

    const missingCount = restaurants.length - restaurantsWithCoords.length;

    if (missingCount <= 0) return null;

    const handleAutoFix = async () => {
        const { fixedCount, errorCount } = await autoFixLocations(restaurants);

        if (fixedCount > 0) {
            toast.success(`Successfully fixed ${fixedCount} locations!`);
            window.location.reload();
        } else if (errorCount > 0) {
            toast.error('Failed to fix some locations. Check console.');
        } else {
            toast.info('No locations could be fixed automatically.');
        }
    };

    return (
        <div className="absolute top-4 right-4 z-10 max-w-[250px] animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-amber-50 backdrop-blur-sm border border-amber-200 rounded-lg p-3 shadow-lg flex flex-col gap-2">
                <div className="flex items-start gap-2">
                    <div className="p-1 rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
                        <MapPin size={14} className="opacity-50" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-amber-800">
                            {missingCount} restaurants missing location
                        </p>
                        <button
                            onClick={handleAutoFix}
                            disabled={isGeocoding}
                            className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-800 px-2 py-0.5 rounded-full mt-1 transition-colors disabled:opacity-50"
                        >
                            {isGeocoding ? 'Fixing...' : 'Auto-Fix Locations'}
                        </button>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-amber-500 hover:text-amber-700 ml-auto"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
