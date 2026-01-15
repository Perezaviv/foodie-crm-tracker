'use client';

import { MapPin, ExternalLink, Loader2, Check, X } from 'lucide-react';
import type { RestaurantInsert } from '@/lib/types';

interface RestaurantConfirmationProps {
    restaurant: Partial<RestaurantInsert>;
    isSaving: boolean;
    error: string | null;
    onSave: () => void;
    onReset: () => void;
}

export function RestaurantConfirmation({
    restaurant,
    isSaving,
    error,
    onSave,
    onReset,
}: RestaurantConfirmationProps) {
    return (
        <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                    Confirm Details
                </h2>
                <button onClick={onReset} className="p-2 rounded-full hover:bg-muted transition-base">
                    <X size={20} />
                </button>
            </div>

            <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
                <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Name</label>
                    <p className="font-bold text-xl">{restaurant.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {restaurant.cuisine && (
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Cuisine</label>
                            <p>{restaurant.cuisine}</p>
                        </div>
                    )}
                    {restaurant.city && (
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">City</label>
                            <p>{restaurant.city}</p>
                        </div>
                    )}
                </div>

                {restaurant.address && (
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Address</label>
                        <p className="flex items-start gap-1">
                            <MapPin size={16} className="flex-shrink-0 mt-0.5 text-primary-500" />
                            {restaurant.address}
                        </p>
                    </div>
                )}

                {restaurant.booking_link && (
                    <div className="pt-2 border-t border-dashed">
                        <a href={restaurant.booking_link} target="_blank" className="text-primary-500 hover:underline flex items-center gap-1 text-sm font-medium">
                            <ExternalLink size={14} />
                            Booking Link Found
                        </a>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-100 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
                    <X size={16} /> {error}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button onClick={onReset} className="flex-1 py-3 px-4 rounded-xl border hover:bg-muted font-medium transition-base">
                    Cancel
                </button>
                <button onClick={onSave} disabled={isSaving} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 transition-base flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                    {isSaving ? 'Saving...' : 'Save It!'}
                </button>
            </div>
        </div>
    );
}
