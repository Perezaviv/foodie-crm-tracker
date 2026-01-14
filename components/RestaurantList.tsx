'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ExternalLink, Utensils, Search, X, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/lib/types';

interface RestaurantListProps {
    restaurants: Restaurant[];
    isLoading?: boolean;
    onRestaurantClick?: (restaurant: Restaurant) => void;
    onDelete?: (id: string) => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export function RestaurantList({ restaurants = [], isLoading = false, onRestaurantClick, onDelete }: RestaurantListProps) {
    // console.log('RestaurantList rendered with:', restaurants); 
    // Commented out log to keep production clean, but keeping default prop to prevent crash
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Extract unique cities and cuisines
    const cities = useMemo(() => {
        const set = new Set<string>();
        restaurants.forEach(r => r.city && set.add(r.city));
        return Array.from(set).sort();
    }, [restaurants]);

    const cuisines = useMemo(() => {
        const set = new Set<string>();
        restaurants.forEach(r => r.cuisine && set.add(r.cuisine));
        return Array.from(set).sort();
    }, [restaurants]);

    // Filter restaurants
    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(r => {
            const matchesSearch = !searchQuery ||
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.cuisine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.city?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCity = !selectedCity || r.city === selectedCity;
            const matchesCuisine = !selectedCuisine || r.cuisine === selectedCuisine;

            return matchesSearch && matchesCity && matchesCuisine;
        });
    }, [restaurants, searchQuery, selectedCity, selectedCuisine]);

    const hasActiveFilters = selectedCity || selectedCuisine;

    const clearFilters = () => {
        setSelectedCity(null);
        setSelectedCuisine(null);
        setSearchQuery('');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background/50 backdrop-blur-sm">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin" />
                    <Utensils size={24} className="absolute inset-0 m-auto text-primary-500 animate-pulse" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
                    Setting the table...
                </p>
            </div>
        );
    }

    if (restaurants.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full bg-muted/50 p-6"
            >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-4 shadow-inner">
                    <Utensils size={40} className="text-primary-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Restaurants Yet</h2>
                <p className="text-muted-foreground text-center max-w-sm">
                    Tap the + button to add your first restaurant!
                </p>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search & Filter Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-3 space-y-2">
                {/* Search Bar */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search restaurants..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-muted border-0 focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-muted-foreground/60 shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter Toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all active:scale-95',
                            showFilters || hasActiveFilters
                                ? 'bg-primary-100 text-primary-700 shadow-sm'
                                : 'bg-muted hover:bg-muted/80'
                        )}
                    >
                        Filters
                        <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 animate-pulse-subtle"
                        >
                            Clear all <X size={12} />
                        </button>
                    )}

                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground">
                        {filteredRestaurants.length} of {restaurants.length}
                    </span>
                </div>

                {/* Filter Dropdowns */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex gap-2 pt-1 pb-1">
                                {cities.length > 0 && (
                                    <select
                                        value={selectedCity || ''}
                                        onChange={(e) => setSelectedCity(e.target.value || null)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-muted border-0 text-sm focus:ring-2 focus:ring-primary-500 transition-shadow"
                                    >
                                        <option value="">All Cities</option>
                                        {cities.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                )}

                                {cuisines.length > 0 && (
                                    <select
                                        value={selectedCuisine || ''}
                                        onChange={(e) => setSelectedCuisine(e.target.value || null)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-muted border-0 text-sm focus:ring-2 focus:ring-primary-500 transition-shadow"
                                    >
                                        <option value="">All Cuisines</option>
                                        {cuisines.map(cuisine => (
                                            <option key={cuisine} value={cuisine}>{cuisine}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Restaurant Cards */}
            <motion.div
                className="flex-1 overflow-auto p-3 space-y-3 scroll-smooth"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {filteredRestaurants.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 text-muted-foreground"
                    >
                        <p>No restaurants match your filters.</p>
                        <button onClick={clearFilters} className="text-primary-500 hover:underline mt-2">
                            Clear filters
                        </button>
                    </motion.div>
                ) : (
                    filteredRestaurants.map((restaurant) => (
                        <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            onClick={() => onRestaurantClick?.(restaurant)}
                            onDelete={onDelete ? () => onDelete(restaurant.id) : undefined}
                        />
                    ))
                )}
            </motion.div>
        </div>
    );
}

function RestaurantCard({ restaurant, onClick, onDelete }: { restaurant: Restaurant; onClick?: () => void; onDelete?: () => void }) {
    return (
        <motion.div
            variants={itemVariants}
            layout
            onClick={onClick}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="group bg-white rounded-2xl border-2 border-neutral-200 p-4 shadow-md hover:shadow-xl transition-all duration-300 ease-out cursor-pointer hover:border-primary-400 relative"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-8">
                    <h3 className="font-bold text-lg truncate text-neutral-900">
                        {restaurant.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {restaurant.cuisine && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-100 text-primary-800 font-semibold border border-primary-200">
                                {restaurant.cuisine}
                            </span>
                        )}
                        {restaurant.city && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 font-medium border border-neutral-200">
                                📍 {restaurant.city}
                            </span>
                        )}
                        {restaurant.is_visited && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-semibold border border-green-200">
                                ✓ Visited
                            </span>
                        )}
                    </div>
                    {restaurant.address && (
                        <p className="text-sm text-neutral-600 mt-3 flex items-start gap-1.5 font-medium">
                            <MapPin size={14} className="flex-shrink-0 mt-0.5 text-primary-500" />
                            <span className="truncate">{restaurant.address}</span>
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    {restaurant.booking_link && (
                        <motion.a
                            href={restaurant.booking_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 border-2 border-primary-400 flex items-center justify-center transition-all"
                            title="Book a table"
                        >
                            <ExternalLink size={18} />
                        </motion.a>
                    )}

                    {onDelete && (
                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete "${restaurant.name}"?`)) {
                                    onDelete();
                                }
                            }}
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2.5 rounded-xl bg-white text-red-500 border-2 border-transparent hover:border-red-200 hover:text-red-600 shadow-sm flex items-center justify-center transition-all z-10"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
