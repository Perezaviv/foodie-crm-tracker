'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ExternalLink, Utensils, Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/lib/types';

interface RestaurantListProps {
    restaurants: Restaurant[];
    onRestaurantClick?: (restaurant: Restaurant) => void;
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

export function RestaurantList({ restaurants, onRestaurantClick }: RestaurantListProps) {
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

    if (restaurants.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full bg-muted/50 p-6"
            >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center mb-4 shadow-inner">
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
                                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 shadow-sm'
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
                        />
                    ))
                )}
            </motion.div>
        </div>
    );
}

function RestaurantCard({ restaurant, onClick }: { restaurant: Restaurant; onClick?: () => void }) {
    return (
        <motion.div
            variants={itemVariants}
            layout
            onClick={onClick}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 p-4 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer hover:border-primary-400 dark:hover:border-primary-500"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-neutral-900 dark:text-white">
                        {restaurant.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {restaurant.cuisine && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-800 dark:text-primary-200 font-semibold border border-primary-200 dark:border-primary-700">
                                {restaurant.cuisine}
                            </span>
                        )}
                        {restaurant.city && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium border border-neutral-200 dark:border-neutral-600">
                                📍 {restaurant.city}
                            </span>
                        )}
                        {restaurant.is_visited && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 font-semibold border border-green-200 dark:border-green-700">
                                ✓ Visited
                            </span>
                        )}
                    </div>
                    {restaurant.address && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3 flex items-start gap-1.5 font-medium">
                            <MapPin size={14} className="flex-shrink-0 mt-0.5 text-primary-500" />
                            <span className="truncate">{restaurant.address}</span>
                        </p>
                    )}
                </div>
                {restaurant.booking_link && (
                    <motion.a
                        href={restaurant.booking_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex-shrink-0 ml-3 p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 border-2 border-primary-400"
                    >
                        <ExternalLink size={18} />
                    </motion.a>
                )}
            </div>
        </motion.div>
    );
}
