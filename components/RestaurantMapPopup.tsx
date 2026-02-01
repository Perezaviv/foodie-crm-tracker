'use client';

import { OverlayView } from '@react-google-maps/api';
import { Restaurant } from '@/lib/types';
import { usePhotos } from '@/lib/skills/ui';
import { useEffect, useState } from 'react';
import { MapPin, ExternalLink, ChevronRight, X, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RestaurantMapPopupProps {
    restaurant: Restaurant;
    onClose: () => void;
    onClick: () => void;
    isHappyHourMode?: boolean;
}

export function RestaurantMapPopup({
    restaurant,
    onClose,
    onClick,
    isHappyHourMode = false,
}: RestaurantMapPopupProps) {
    const { photos, fetchPhotos } = usePhotos();
    const [isLikeAnimating, setIsLikeAnimating] = useState(false);

    useEffect(() => {
        if (restaurant?.id) {
            fetchPhotos(restaurant.id);
        }
    }, [restaurant, fetchPhotos]);

    // Framer motion variants for smooth entry
    const popupVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 10 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
        },
        exit: { opacity: 0, scale: 0.8, y: 10 }
    };

    return (
        <OverlayView
            position={{ lat: restaurant.lat!, lng: restaurant.lng! }}
            mapPaneName={OverlayView.FLOAT_PANE}
            getPixelPositionOffset={(width, height) => ({
                x: -(width / 2),
                y: -(height + 20), // Offset above marker
            })}
        >
            <AnimatePresence>
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={popupVariants}
                    className="w-[280px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Image Carousel / Header */}
                    <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800">
                        {photos && photos.length > 0 ? (
                            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none h-full">
                                {photos.slice(0, 3).map((photo) => (
                                    <img
                                        key={photo.id}
                                        src={photo.url}
                                        alt={restaurant.name}
                                        className="w-full h-full object-cover flex-shrink-0 snap-center"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-200">
                                <span className="text-4xl">🍽️</span>
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-colors z-10"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>

                        {/* Badges */}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                            {isHappyHourMode && (
                                <span className="px-2 py-0.5 rounded-full bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold shadow-sm">
                                    HAPPY HOUR
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight truncate">
                                {restaurant.name}
                            </h3>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                                    {(restaurant as any).rating || '4.5'}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1 mb-3">
                            <MapPin size={10} />
                            <span className="truncate">{restaurant.address}</span>
                        </p>

                        {/* Happy Hour Deals */}
                        {isHappyHourMode && (
                            <div className="mb-3 p-2 rounded-lg bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide mb-1">Current Deal</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-white">
                                    {(restaurant as any).hh_drinks || "Special Happy Hour Menu 🍹"}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={onClick}
                                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg py-2 px-3 text-xs font-bold shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
                            >
                                View Details <ChevronRight size={12} strokeWidth={3} />
                            </button>
                            {restaurant.booking_link && (
                                <a
                                    href={restaurant.booking_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            )}
                            <button
                                onClick={() => { setIsLikeAnimating(true); setTimeout(() => setIsLikeAnimating(false), 1000); }}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-900/20 text-pink-500 hover:bg-pink-100 transition-colors relative"
                            >
                                <Heart size={14} className={isLikeAnimating ? "fill-current animate-ping" : ""} />
                                {isLikeAnimating && (
                                    <motion.span
                                        initial={{ opacity: 1, y: 0 }}
                                        animate={{ opacity: 0, y: -20 }}
                                        className="absolute text-lg"
                                    >
                                        ❤️
                                    </motion.span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Arrow/Tail */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-b border-white/50 dark:border-white/10 rotate-45 transform" />
                </motion.div>
            </AnimatePresence>
        </OverlayView>
    );
}
