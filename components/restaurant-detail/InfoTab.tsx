'use client';

import { MapPin, ExternalLink, Star, Edit2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/lib/types';

interface InfoTabProps {
    restaurant: Restaurant;
    currentRating: number | null;
    isRating: boolean;
    onRatingChange: (rating: number) => void;
}

export function InfoTab({ restaurant, currentRating, isRating, onRatingChange }: InfoTabProps) {
    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
                {restaurant.booking_link ? (
                    (() => {
                        const getBookingProvider = (url: string) => {
                            const lowerUrl = url.toLowerCase();
                            if (lowerUrl.includes('tabit')) return 'Tabit';
                            if (lowerUrl.includes('ontopo')) return 'Ontopo';
                            return 'Table';
                        };
                        const provider = getBookingProvider(restaurant.booking_link);

                        return (
                            <a
                                href={restaurant.booking_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-center shadow-lg shadow-primary-500/25 hover:shadow-xl active:scale-[0.98] transition-base flex items-center justify-center gap-2"
                            >
                                Book on {provider}
                                <ExternalLink size={16} />
                            </a>
                        );
                    })()
                ) : (
                    <div className="col-span-2 py-3 px-4 rounded-xl bg-muted text-muted-foreground text-center text-sm font-medium">
                        No booking link available
                    </div>
                )}

                {restaurant.lat && restaurant.lng && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 px-4 rounded-xl border-2 border-primary-100 hover:border-primary-500 text-primary-600 font-medium text-center transition-base flex items-center justify-center gap-2"
                    >
                        <MapPin size={18} />
                        Directions
                    </a>
                )}

                {restaurant.social_link && (
                    <a
                        href={restaurant.social_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 px-4 rounded-xl border-2 border-transparent bg-muted hover:bg-muted/80 font-medium text-center transition-base flex items-center justify-center gap-2"
                    >
                        Socials
                        <ExternalLink size={16} />
                    </a>
                )}
            </div>

            {/* Info Cards */}
            <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-2xl space-y-3">
                    {/* Rating */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Your Rating</span>
                        <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => onRatingChange(star)}
                                        disabled={isRating}
                                        className={cn(
                                            'p-0.5 transition-all duration-150 hover:scale-125 active:scale-95',
                                            isRating && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        <Star
                                            size={20}
                                            className={cn(
                                                'transition-colors',
                                                currentRating && star <= currentRating
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-muted-foreground/30 hover:text-yellow-300'
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            {currentRating && (
                                <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                    {currentRating}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    {restaurant.address && (
                        <div className="pt-3 border-t border-dashed border-muted-foreground/20">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Address</span>
                            <p className="mt-1 text-sm">{restaurant.address}</p>
                            {restaurant.city && <p className="text-sm text-muted-foreground">{restaurant.city}</p>}
                        </div>
                    )}

                    {/* Status */}
                    <div className="pt-3 border-t border-dashed border-muted-foreground/20 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                            restaurant.is_visited
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                        )}>
                            <Clock size={12} />
                            {restaurant.is_visited ? 'Visited' : 'Want to visit'}
                        </div>
                    </div>
                </div>

                {/* Happy Hour Info */}
                {((restaurant as any).discount_details || (restaurant as any).hh_times) && (
                    <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Clock size={48} className="text-amber-600" />
                        </div>
                        <span className="text-xs text-amber-700 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-3">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Happy Hour Details
                        </span>

                        {(restaurant as any).discount_details && (
                            <div className="mb-3">
                                <p className="text-base font-bold text-amber-900 leading-tight">
                                    {(restaurant as any).discount_details}
                                </p>
                            </div>
                        )}

                        {(restaurant as any).hh_times && (
                            <div className="flex items-center gap-2 text-amber-700 bg-amber-100/50 px-3 py-2 rounded-xl border border-amber-200/50 w-fit">
                                <Clock size={16} className="text-amber-600" />
                                <span className="text-sm font-semibold">{(restaurant as any).hh_times}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Notes */}
                {restaurant.notes && (
                    <div className="bg-muted/30 p-4 rounded-2xl border border-transparent">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-2">
                            <Edit2 size={12} />
                            My Notes
                        </span>
                        <p className="text-sm text-foreground leading-relaxed">
                            {restaurant.notes}
                        </p>
                    </div>
                )}

                <p className="text-xs text-center text-muted-foreground/50 pt-4">
                    Added on {new Date(restaurant.created_at).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
}
