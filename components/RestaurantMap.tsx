'use client';

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { GoogleMap, Circle, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from './GoogleMapsProvider';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Utensils, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant } from '@/lib/types';
import { useGeocoding } from '@/lib/skills/ui';
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

// Create a high-quality emoji marker icon
function createEmojiMarkerIcon(color: string = '#e11d48', emoji: string = '🍽️', isGlow: boolean = false): string {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <defs>
                <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="${isGlow ? '0.6' : '0.3'}" flood-color="${isGlow ? color : 'black'}"/>
                </filter>
            </defs>
            <circle cx="24" cy="20" r="18" fill="white" />
            <circle cx="24" cy="20" r="16" fill="${color}" filter="url(#shadow)"/>
            <text x="24" y="27" text-anchor="middle" font-size="22" font-family="sans-serif">${emoji}</text>
            <path d="M24 44 L16 32 L32 32 Z" fill="${color}"/>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function isHappyHourActive(startStr?: string | null, endStr?: string | null): boolean {
    if (!startStr || !endStr) return false;
    const now = new Date();
    const currentStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (endStr < startStr) return currentStr >= startStr || currentStr <= endStr;
    return currentStr >= startStr && currentStr <= endStr;
}

function getHappyHourStyle(rating?: number) {
    switch (rating) {
        case 3: return { color: '#fbbf24', emoji: '🏆' };
        case 2: return { color: '#94a3b8', emoji: '🥈' };
        case 1: return { color: '#d97706', emoji: '🥉' };
        default: return { color: '#f59e0b', emoji: '🍹' };
    }
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

    // Memoize filtered restaurants to avoid unnecessary calculations
    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(r => {
            if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return false;
            if (isHappyHourMode && !showAllHappyHours) {
                const hh = r as any;
                if (!isHappyHourActive(hh.start_time, hh.end_time)) {
                    if (!hh.start_time) return false;
                    return false;
                }
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
        if (filteredRestaurants.length === 1) return 14;
        if (filteredRestaurants.length > 1) return 11;
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
            (error) => {
                setIsLocating(false);
                toast.error('Unable to get location');
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

    // Setup marker clustering and markers - Optimized to only run when data changes
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;

        const map = mapRef.current;
        const size = 44; // Fixed optimized size for performance

        // Clear previous state
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        restaurantMapRef.current.clear();
        if (clustererRef.current) clustererRef.current.clearMarkers();

        const newMarkers = filteredRestaurants.map(restaurant => {
            let color = '#f43f5e'; // Vibrant Rose 500
            let emoji = '🍽️';

            if (isHappyHourMode) {
                const style = getHappyHourStyle((restaurant as any).rating);
                color = style.color;
                emoji = style.emoji;
            }

            const markerIcon = createEmojiMarkerIcon(color, emoji, isHappyHourMode);

            const marker = new google.maps.Marker({
                position: { lat: restaurant.lat!, lng: restaurant.lng! },
                icon: {
                    url: markerIcon,
                    scaledSize: new google.maps.Size(size, size),
                    anchor: new google.maps.Point(size / 2, size * 0.9),
                },
                optimized: true, // Use optimized rendering
                animation: google.maps.Animation.DROP,
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

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-rose-50 p-8 text-center">
                <Utensils size={48} className="text-rose-300 mb-4" />
                <h2 className="text-xl font-bold text-rose-900 mb-2">Maps failed to load</h2>
                <p className="text-rose-700 text-sm max-w-xs">{loadError.message}</p>
            </div>
        );
    }

    if (!isLoaded || isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Loader2 size={40} className="animate-spin text-rose-500" />
                        <div className="absolute inset-0 blur-lg bg-rose-500/20 animate-pulse rounded-full" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Vibes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full bg-slate-100 overflow-hidden">
            <GoogleMap
                mapContainerStyle={containerStyle}
                onLoad={onMapLoad}
                onClick={() => setSelectedRestaurant(null)}
                options={{
                    styles: isHappyHourMode ? MAP_STYLES.night : MAP_STYLES.light,
                    disableDefaultUI: true, // Modern approach: use custom UI
                    gestureHandling: 'greedy',
                    clickableIcons: false,
                    backgroundColor: isHappyHourMode ? '#242f3e' : '#f5f5f5',
                }}
            >
                {/* User location marker with pulse effect simulated by Circles */}
                {userLocation && (
                    <>
                        <Circle
                            center={{ lat: userLocation.lat, lng: userLocation.lng }}
                            radius={userLocation.accuracy * 2}
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
                                scale: 8,
                                fillColor: '#3b82f6',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 3,
                            }}
                            zIndex={999}
                        />
                    </>
                )}

                {/* Custom Glassmorphism Popup */}
                {selectedRestaurant && (
                    <RestaurantMapPopup
                        restaurant={selectedRestaurant}
                        isHappyHourMode={isHappyHourMode}
                        onClose={() => setSelectedRestaurant(null)}
                        onClick={() => onRestaurantClick?.(selectedRestaurant)}
                    />
                )}
            </GoogleMap>

            {/* Custom Modern Map Controls */}
            <MapControls
                isHappyHour={isHappyHourMode}
                onToggleHappyHour={() => {
                    onModeChange?.(!isHappyHourMode);
                    toast.info(isHappyHourMode ? "Back to Standard Mode" : "Happy Hour Vibes Active! 🍹");
                }}
                onLocate={centerOnUserLocation}
                isLocating={isLocating}
                currentTheme={isHappyHourMode ? 'dark' : 'light'}
            />

            {/* Floating Locate Button (Standalone) */}
            <button
                onClick={centerOnUserLocation}
                disabled={isLocating}
                className="absolute bottom-6 right-6 z-10 w-12 h-12 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xl rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-white/50 dark:border-slate-700"
            >
                {isLocating ? (
                    <Loader2 size={20} className="animate-spin text-rose-500" />
                ) : (
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-md opacity-20" />
                        <MapPin size={22} className="text-blue-500 relative" />
                    </div>
                )}
            </button>

            {filteredRestaurants.length === 0 && (
                <div className="absolute inset-x-4 top-24 flex justify-center pointer-events-none z-10">
                    <div className="bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg text-center max-w-xs pointer-events-auto">
                        <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                            Nothing here yet
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            No places found for this mode. Try adding some!
                        </p>
                    </div>
                </div>
            )}

            {/* Side Panel (Mainly for geocoding errors) */}
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
