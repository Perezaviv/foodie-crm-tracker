'use client';

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { GoogleMap, Circle, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from './GoogleMapsProvider';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Utensils, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant } from '@/lib/types';
import { createMapClusterer } from '@/lib/utils/map-utils';
import { MapSidePanel } from './MapSidePanel';
import { MAP_STYLES } from '@/lib/utils/map-styles';
import { RestaurantMapPopup } from './RestaurantMapPopup';
import { MapControls } from './MapControls';

interface RestaurantMapProps {
    restaurants: Restaurant[];
    isLoading?: boolean;
    onRestaurantClick?: (restaurant: Restaurant) => void;
    onModeChange?: (isHappyHour: boolean) => void;
    isHappyHourMode?: boolean;
    showAllHappyHours?: boolean;
}

interface UserLocation {
    lat: number;
    lng: number;
    accuracy: number;
}

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

const containerStyle = {
    width: '100%',
    height: '100%',
};

function getCategoryColor(rating?: number) {
    if (rating === 3) return '#fbbf24'; // Gold
    if (rating === 2) return '#94a3b8'; // Silver
    if (rating === 1) return '#d97706'; // Bronze
    return '#f43f5e'; // Default Rose
}

// Simple reliable marker icon using Google Maps SymbolPath
// This avoids complex SVG base64 encoding issues that might cause visibility problems
function getMarkerIcon(color: string) {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10,
    };
}

function isHappyHourActive(startStr?: string | null, endStr?: string | null): boolean {
    if (!startStr || !endStr) return false;
    const now = new Date();
    const currentStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (endStr < startStr) return currentStr >= startStr || currentStr <= endStr;
    return currentStr >= startStr && currentStr <= endStr;
}

export function RestaurantMap({
    restaurants,
    isLoading = false,
    onRestaurantClick,
    onModeChange,
    isHappyHourMode = false,
    showAllHappyHours = false
}: RestaurantMapProps) {
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const mapRef = useRef<google.maps.Map | null>(null);
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const restaurantMapRef = useRef<Map<google.maps.Marker, Restaurant>>(new Map());
    const initialCenterRef = useRef(false);

    const { isLoaded, loadError } = useGoogleMaps();

    // Memoize filtered restaurants
    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(r => {
            const lat = Number(r.lat);
            const lng = Number(r.lng);
            if (isNaN(lat) || isNaN(lng)) return false;
            // Also update the object for downstream usage if needed, or just let the map component cast it?
            // The map component uses r.lat which is typed as number but might be string at runtime.
            // Google Maps component requires numbers.
            // I should override the properties on the object or cast them when passing to Marker.
            // But this filter runs on 'filteredRestaurants'. If I don't mutate r, downsteam will still see string.
            // Let's rely on JS loose typing or cast in the map loop.
            // Actually, best to ensure they are numbers for the filter first.
            if (isHappyHourMode && !showAllHappyHours) {
                const hh = r as any;
                // If it's a "regular" restaurant (from main DB), it might not have start_time/end_time.
                // Depending on requirement: 
                // 1. Show ALL restaurants in HH mode?
                // 2. Show only active HH?
                // The user said "Regular restaurants not showing... is wrong".
                // So we should NOT filter regular restaurants even in HH mode unless explicitly desired.
                // But logically, "Happy Hour Mode" usually means "Show me happy hours".
                // However, merging the lists means we have mixed content.
                // Let's SHOW EVERYTHING that overlaps with current time IF it has HH info,
                // otherwise just show it as a regular place?
                // For now, to satisfy "Regular restaurants showing", we will RELAX this filter.

                // Only filter if it HAS happy hour times and they are not active.
                if (hh.start_time && hh.end_time) {
                    if (!isHappyHourActive(hh.start_time, hh.end_time)) {
                        return false;
                    }
                }
                // If it has no HH times (regular restaurant), keep it!
            }
            return true;
        });
    }, [restaurants, isHappyHourMode, showAllHappyHours]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    });
                },
                () => { },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }, []);

    const getCenter = useCallback(() => {
        if (filteredRestaurants.length === 1) {
            return { lat: filteredRestaurants[0].lat!, lng: filteredRestaurants[0].lng! };
        } else if (filteredRestaurants.length > 1) {
            const avgLat = filteredRestaurants.reduce((sum, r) => sum + r.lat!, 0) / filteredRestaurants.length;
            const avgLng = filteredRestaurants.reduce((sum, r) => sum + r.lng!, 0) / filteredRestaurants.length;
            return { lat: avgLat, lng: avgLng };
        }
        return DEFAULT_CENTER;
    }, [filteredRestaurants]);

    const getZoom = useCallback(() => {
        if (filteredRestaurants.length === 1) return 15;
        if (filteredRestaurants.length > 1) return 12;
        return 12;
    }, [filteredRestaurants]);

    const centerOnUserLocation = useCallback(() => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                };
                setUserLocation(newLocation);
                setIsLocating(false);
                if (mapRef.current) {
                    mapRef.current.panTo({ lat: newLocation.lat, lng: newLocation.lng });
                    mapRef.current.setZoom(15);
                }
            },
            () => {
                setIsLocating(false);
                setIsLocating(false);
                // toast.error('Unable to get location'); // Suppress noise as per user request
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, []);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        if (!initialCenterRef.current && filteredRestaurants.length > 0) {
            map.setCenter(getCenter());
            map.setZoom(getZoom());
            initialCenterRef.current = true;
        }
    }, [getCenter, getZoom, filteredRestaurants.length]);

    // Setup markers and clustering
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;

        const map = mapRef.current;
        const size = 42;

        // Clear previous state safely
        if (clustererRef.current) {
            clustererRef.current.clearMarkers();
        }
        // markersRef.current.forEach(m => m.setMap(null)); // Let clusterer handle cleanup
        markersRef.current = [];
        restaurantMapRef.current.clear();

        const newMarkers = filteredRestaurants.map(restaurant => {
            // Determine color based on rating/happy hour status
            let color = '#f43f5e'; // Default Red/Rose for regular

            if (isHappyHourMode) {
                // In Happy Hour mode, color code by rating
                color = getCategoryColor((restaurant as any).rating);
            }

            const marker = new google.maps.Marker({
                position: { lat: Number(restaurant.lat), lng: Number(restaurant.lng) },
                icon: getMarkerIcon(color),
                title: restaurant.name,
                // optimized: true // Default is true, which is better for performance
            });

            restaurantMapRef.current.set(marker, restaurant);
            marker.addListener('click', () => {
                setSelectedRestaurant(restaurant);
            });

            return marker;
        });

        markersRef.current = newMarkers;
        clustererRef.current = createMapClusterer(map, newMarkers);

        return () => {
            markersRef.current.forEach(m => google.maps.event.clearInstanceListeners(m));
            if (clustererRef.current) clustererRef.current.clearMarkers();
        };
    }, [isLoaded, filteredRestaurants, isHappyHourMode]);

    // Map options memoization to prevent unnecessary re-renders/crashes
    const mapOptions = useMemo(() => ({
        styles: MAP_STYLES.light, // Always use light mode as requested
        disableDefaultUI: true,
        gestureHandling: 'greedy' as const,
        clickableIcons: false,
        backgroundColor: '#f8fafc',
    }), []);

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-rose-50 p-8 text-center">
                <Utensils size={48} className="text-rose-300 mb-4" />
                <h2 className="text-xl font-bold text-rose-900 mb-2">Maps failed to load</h2>
                <p className="text-rose-700 text-sm max-w-xs">{loadError.message}</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Loader2 size={40} className="animate-spin text-rose-500" />
                        <div className="absolute inset-0 blur-lg bg-rose-500/20 animate-pulse rounded-full" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Maps...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full bg-slate-100 overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <Loader2 size={40} className="animate-spin text-rose-500" />
                            <div className="absolute inset-0 blur-lg bg-rose-500/20 animate-pulse rounded-full" />
                        </div>
                    </div>
                </div>
            )}
            <GoogleMap
                mapContainerStyle={containerStyle}
                onLoad={onMapLoad}
                onClick={() => setSelectedRestaurant(null)}
                options={mapOptions}
            >
                {/* User location */}
                {userLocation && (
                    <>
                        <Circle
                            center={{ lat: userLocation.lat, lng: userLocation.lng }}
                            radius={userLocation.accuracy * 1.5}
                            options={{
                                fillColor: '#3b82f6',
                                fillOpacity: 0.1,
                                strokeColor: '#3b82f6',
                                strokeOpacity: 0.2,
                                strokeWeight: 1,
                            }}
                        />
                        <Marker
                            position={{ lat: userLocation.lat, lng: userLocation.lng }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 7,
                                fillColor: '#3b82f6',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                            }}
                            zIndex={999}
                        />
                    </>
                )}

                {/* Custom Popup */}
                {selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng && (
                    <RestaurantMapPopup
                        restaurant={selectedRestaurant}
                        isHappyHourMode={isHappyHourMode}
                        onClose={() => setSelectedRestaurant(null)}
                        onClick={() => onRestaurantClick?.(selectedRestaurant)}
                    />
                )}
            </GoogleMap>

            {/* Floating Controls */}
            <MapControls
                isHappyHour={isHappyHourMode}
                onToggleHappyHour={() => {
                    onModeChange?.(!isHappyHourMode);
                    setSelectedRestaurant(null); // Clear popup on mode switch to prevent crashes
                }}
                onLocate={centerOnUserLocation}
                isLocating={isLocating}
                currentTheme={isHappyHourMode ? 'dark' : 'light'}
            />

            {/* Standalone Locate Button */}
            <button
                onClick={centerOnUserLocation}
                disabled={isLocating}
                className="absolute bottom-6 right-6 z-10 w-12 h-12 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-slate-200 dark:border-slate-700"
            >
                {isLocating ? (
                    <Loader2 size={20} className="animate-spin text-rose-500" />
                ) : (
                    <MapPin size={22} className="text-blue-500" />
                )}
            </button>

            {filteredRestaurants.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center max-w-xs pointer-events-auto">
                        <Utensils size={32} className="text-rose-500 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">No spots found</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting your filters or adding new places.</p>
                    </div>
                </div>
            )}

            {/* Error Fixing Side Panel */}
            {!isHappyHourMode && (
                <div className="scale-75 origin-top-right">
                    <MapSidePanel
                        restaurants={restaurants}
                        restaurantsWithCoords={filteredRestaurants}
                    />
                </div>
            )}
        </div>
    );
}
