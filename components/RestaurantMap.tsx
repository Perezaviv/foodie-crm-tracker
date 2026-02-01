'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, InfoWindow, Circle, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from './GoogleMapsProvider';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Utensils, Loader2, ExternalLink, Locate, MapPin, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant } from '@/lib/types';
import { useGeocoding, usePhotos } from '@/lib/skills/ui';
import { createMapClusterer } from '@/lib/utils/map-utils';
import { MapSidePanel } from './MapSidePanel';

interface RestaurantMapProps {
    restaurants: Restaurant[];
    isLoading?: boolean;
    onRestaurantClick?: (restaurant: Restaurant) => void;
    isHappyHourMode?: boolean;
    showAllHappyHours?: boolean;
}

interface UserLocation {
    lat: number;
    lng: number;
    accuracy: number;
}

// Default to Tel Aviv
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

const containerStyle = {
    width: '100%',
    height: '100%',
};

// Map styles for a modern look
const mapStyles = [
    {
        featureType: 'poi.business',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text',
        stylers: [{ visibility: 'off' }],
    },
];

// Create a cute emoji marker icon - smaller size
function createEmojiMarkerIcon(color: string = '#e11d48', emoji: string = '🍽️'): string {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                </filter>
            </defs>
            <circle cx="24" cy="20" r="18" fill="${color}" filter="url(#shadow)"/>
            <text x="24" y="26" text-anchor="middle" font-size="20">${emoji}</text>
            <path d="M24 38 L18 28 L30 28 Z" fill="${color}"/>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Helper to check if Happy Hour is active NOW
function isHappyHourActive(startStr?: string | null, endStr?: string | null): boolean {
    if (!startStr || !endStr) return false;

    const now = new Date();
    const currentStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Handle overnight ranges (e.g., 22:00 - 02:00)
    if (endStr < startStr) {
        return currentStr >= startStr || currentStr <= endStr;
    }

    return currentStr >= startStr && currentStr <= endStr;
}

// Helper to get marker color/emoji based on Rating
function getHappyHourStyle(rating?: number) {
    switch (rating) {
        case 3: // Gold
            return { color: '#fbbf24', emoji: '🏆' }; // Amber-400
        case 2: // Silver
            return { color: '#94a3b8', emoji: '🥈' }; // Slate-400
        case 1: // Bronze
            return { color: '#d97706', emoji: '🥉' }; // Amber-600
        default:
            return { color: '#f59e0b', emoji: '🍹' }; // Default Amber
    }
}

export function RestaurantMap({ restaurants, isLoading = false, onRestaurantClick, isHappyHourMode = false, showAllHappyHours = false }: RestaurantMapProps) {
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(12);
    const mapRef = useRef<google.maps.Map | null>(null);
    const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const restaurantMapRef = useRef<Map<google.maps.Marker, Restaurant>>(new Map());
    const initialCenterRef = useRef(false);

    // Calculate marker size based on zoom level (scales from 20px at zoom 8 to 48px at zoom 18)
    const getMarkerSize = useCallback((zoom: number) => {
        const minZoom = 8;
        const maxZoom = 18;
        const minSize = 20;
        const maxSize = 48;
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        const ratio = (clampedZoom - minZoom) / (maxZoom - minZoom);
        return Math.round(minSize + ratio * (maxSize - minSize));
    }, []);

    const { isLoaded, loadError } = useGoogleMaps();

    // Filter Restaurants
    const filteredRestaurants = restaurants.filter(r => {
        // Base check: must have coords
        if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return false;

        // If Happy Hour Mode
        if (isHappyHourMode) {
            // 1. Must be a happy hour place (implied by the data source usually, but let's be safe)
            // (Passed 'restaurants' should already be fetched with mode=happy_hour, but good to be careful)

            // 2. Filter by Time (unless "See All" is on)
            if (!showAllHappyHours) {
                const hh = r as any; // Cast to access extra props if needed
                if (!isHappyHourActive(hh.start_time, hh.end_time)) {
                    // Try parsing raw string if parsed fields missing (legacy/fallback)
                    // But for now, we rely on passed props.
                    // If rating/time are not populated yet, we might hide everything.
                    // Let's be lenient: if NO time info, maybe show it? No, requirements say "only when occur".
                    // So if no time info, hide it.
                    if (!hh.start_time) return false;
                    return false;
                }
            }
        }

        return true;
    });

    const restaurantsWithCoords = filteredRestaurants;

    // Log warnings only when there's an actual issue
    useEffect(() => {
        if (restaurants.length > 0 && restaurantsWithCoords.length === 0 && !isHappyHourMode) {
            console.warn('[RestaurantMap] All restaurants missing coordinates');
        }
    }, [restaurants, restaurantsWithCoords, isHappyHourMode]);

    // Get user's location on mount
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
                (error) => {
                    // Silently handle geolocation errors
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }, []);

    const { photos: selectedRestaurantPhotos, fetchPhotos } = usePhotos();

    // Fetch photos for the selected restaurant
    useEffect(() => {
        if (selectedRestaurant) {
            fetchPhotos(selectedRestaurant.id);
        }
    }, [selectedRestaurant, fetchPhotos]);

    // Function to center map on user's location
    const getCenter = useCallback(() => {
        if (restaurantsWithCoords.length === 1) {
            return { lat: restaurantsWithCoords[0].lat!, lng: restaurantsWithCoords[0].lng! };
        } else if (restaurantsWithCoords.length > 1) {
            const avgLat = restaurantsWithCoords.reduce((sum, r) => sum + r.lat!, 0) / restaurantsWithCoords.length;
            const avgLng = restaurantsWithCoords.reduce((sum, r) => sum + r.lng!, 0) / restaurantsWithCoords.length;
            return { lat: avgLat, lng: avgLng };
        }
        return DEFAULT_CENTER;
    }, [restaurantsWithCoords]);

    const getZoom = useCallback(() => {
        if (restaurantsWithCoords.length === 1) return 14;
        if (restaurantsWithCoords.length > 1) return 11;
        return 12;
    }, [restaurantsWithCoords]);

    // Function to center map on user's location
    const centerOnUserLocation = useCallback(() => {
        setIsLocating(true);

        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            setIsLocating(false);
            return;
        }

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
                let errorMessage = 'Unable to get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location permissions.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location unavailable. Please try again.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again.';
                        break;
                }
                toast.error(errorMessage);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, []);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        // Set initial zoom level
        setZoomLevel(map.getZoom() || 12);

        // Perform initial centering
        if (!initialCenterRef.current && restaurantsWithCoords.length > 0) {
            const center = getCenter();
            const zoom = getZoom();
            map.setCenter(center);
            map.setZoom(zoom);
            initialCenterRef.current = true;
        }

        // Listen for zoom changes with debounce to prevent thrashing
        map.addListener('zoom_changed', () => {
            if (zoomTimeoutRef.current) {
                clearTimeout(zoomTimeoutRef.current);
            }
            zoomTimeoutRef.current = setTimeout(() => {
                const newZoom = map.getZoom();
                if (newZoom) setZoomLevel(newZoom);
            }, 100); // Wait 100ms after zooming stops
        });
    }, [getCenter, getZoom, restaurantsWithCoords.length]);

    // Setup marker clustering
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;

        const map = mapRef.current;
        const size = getMarkerSize(zoomLevel);

        // Clear previous markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        restaurantMapRef.current.clear();

        // Clear previous clusterer
        if (clustererRef.current) {
            clustererRef.current.clearMarkers();
        }

        // Create new markers
        const newMarkers = restaurantsWithCoords.map(restaurant => {
            // Determine Color & Emoji
            let color = '#e11d48'; // Default Rose
            let emoji = '🍽️';

            if (isHappyHourMode) {
                const style = getHappyHourStyle((restaurant as any).rating);
                color = style.color;
                emoji = style.emoji;
            }

            const markerIcon = createEmojiMarkerIcon(color, emoji);

            const marker = new google.maps.Marker({
                position: { lat: restaurant.lat!, lng: restaurant.lng! },
                icon: {
                    url: markerIcon,
                    scaledSize: new google.maps.Size(size, size),
                    anchor: new google.maps.Point(size / 2, size * 0.9),
                },
            });

            // Store restaurant reference
            restaurantMapRef.current.set(marker, restaurant);

            // Add click listener
            marker.addListener('click', () => {
                const clickedRestaurant = restaurantMapRef.current.get(marker);
                if (clickedRestaurant) {
                    setSelectedRestaurant(current =>
                        current?.id === clickedRestaurant.id ? null : clickedRestaurant
                    );
                }
            });

            return marker;
        });

        markersRef.current = newMarkers;

        // Create clusterer
        clustererRef.current = createMapClusterer(map, newMarkers);

        // Add clusters click listeners if needed (handled by default in createMapClusterer usually, 
        // but here it's just initialized)

        // Cleanup
        return () => {
            markersRef.current.forEach(marker => {
                google.maps.event.clearInstanceListeners(marker);
                marker.setMap(null);
            });
            if (clustererRef.current) {
                clustererRef.current.clearMarkers();
            }
        };
    }, [isLoaded, restaurantsWithCoords, zoomLevel, getMarkerSize, isHappyHourMode]);

    // Handle "View Details" button in popup
    const handleViewDetails = useCallback((restaurant: Restaurant) => {
        setSelectedRestaurant(null);
        onRestaurantClick?.(restaurant);
    }, [onRestaurantClick]);

    if (loadError) {
        // Demo mode map fallback - show a simulated map with restaurant list
        console.error('[RestaurantMap] Google Maps load error:', loadError);

        return (
            <div className="relative h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 overflow-auto">
                {/* Simulated map background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }} />
                </div>

                {/* Error notice with details */}
                <div className="absolute top-4 left-4 right-4 z-10">
                    <div className="bg-red-100 border border-red-300 rounded-xl p-4 shadow-lg">
                        <p className="text-red-800 text-sm font-medium mb-2">
                            🗺️ Google Maps failed to load
                        </p>
                        <p className="text-red-700 text-xs mb-3">
                            Error: {loadError.message || 'Unknown error'}
                        </p>
                        <details className="text-xs text-red-600">
                            <summary className="cursor-pointer hover:underline">Troubleshooting steps</summary>
                            <ul className="mt-2 ml-4 list-disc space-y-1">
                                <li>Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in .env</li>
                                <li>Verify the API key has "Maps JavaScript API" enabled</li>
                                <li>Ensure localhost is allowed in API key restrictions</li>
                                <li>Check browser console (F12) for more details</li>
                            </ul>
                        </details>
                    </div>
                </div>

                {/* Restaurant markers as cards */}
                <div className="pt-20 pb-4 px-4 space-y-3">
                    {restaurantsWithCoords.length > 0 ? (
                        restaurantsWithCoords.map((restaurant) => (
                            <button
                                key={restaurant.id}
                                onClick={() => onRestaurantClick?.(restaurant)}
                                className="w-full bg-white rounded-xl p-4 shadow-md border border-slate-200 text-left hover:shadow-lg hover:border-primary-400 transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    {restaurant.logo_url ? (
                                        <img
                                            src={restaurant.logo_url}
                                            alt={`${restaurant.name} logo`}
                                            className="w-10 h-10 rounded-lg object-contain bg-muted flex-shrink-0"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">🍽️</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">{restaurant.name}</h3>
                                        {restaurant.cuisine && (
                                            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium mt-1">
                                                {restaurant.cuisine}
                                            </span>
                                        )}
                                        {restaurant.address && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                                                <MapPin size={12} className="flex-shrink-0" />
                                                <span className="truncate">{restaurant.address}</span>
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Utensils size={48} className="text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                No restaurants with locations yet.<br />
                                Add restaurants to see them here!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!isLoaded || isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-muted/50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 size={32} className="animate-spin text-primary-500" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <GoogleMap
                mapContainerStyle={containerStyle}
                onLoad={onMapLoad}
                options={{
                    styles: mapStyles,
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    gestureHandling: 'greedy', // Better for mobile
                    clickableIcons: false,
                }}
            >
                {/* Markers are now managed by the clusterer in useEffect */}

                {selectedRestaurant && selectedRestaurant.lat !== null && selectedRestaurant.lng !== null && (
                    <InfoWindow
                        position={{ lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }}
                        onCloseClick={() => setSelectedRestaurant(null)}
                        options={{
                            pixelOffset: new google.maps.Size(0, -40),
                            disableAutoPan: true // Don't move the map when selecting
                        }}
                    >
                        <div style={{ minWidth: '220px', maxWidth: '280px', padding: '0px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
                            {/* Photo Preview Section */}
                            {selectedRestaurantPhotos && selectedRestaurantPhotos.length > 0 && (
                                <div style={{ width: '100%', height: '120px', overflow: 'hidden', backgroundColor: '#f3f4f6', position: 'relative' }}>
                                    <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', height: '100%' }}>
                                        {selectedRestaurantPhotos.map((photo, i) => (
                                            <img
                                                key={photo.id}
                                                src={photo.url}
                                                alt={`${selectedRestaurant.name} - ${i + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    flexShrink: 0,
                                                    scrollSnapAlign: 'start'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    {selectedRestaurantPhotos.length > 1 && (
                                        <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: 'bold', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>Swipe</span>
                                            <span style={{ opacity: 0.7 }}>•</span>
                                            <span>{selectedRestaurantPhotos.length} photos</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                    {selectedRestaurant.logo_url ? (
                                        <img
                                            src={selectedRestaurant.logo_url}
                                            alt={`${selectedRestaurant.name} logo`}
                                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#f3f4f6', flexShrink: 0 }}
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: '18px' }}>🍽️</span>
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontWeight: 'bold', color: '#111827', fontSize: '16px', margin: 0, wordBreak: 'break-word' }}>{selectedRestaurant.name}</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                            {selectedRestaurant.cuisine && (
                                                <span style={{ display: 'inline-block', fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: isHappyHourMode ? '#fef3c7' : '#fed7aa', color: isHappyHourMode ? '#92400e' : '#c2410c', fontWeight: 600 }}>
                                                    {selectedRestaurant.cuisine}
                                                </span>
                                            )}
                                            {isHappyHourMode && (
                                                <span style={{ display: 'inline-block', fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                                                    Happy Hour 🍹
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isHappyHourMode && ((selectedRestaurant as any).hh_drinks || (selectedRestaurant as any).hh_food || (selectedRestaurant as any).hh_times) && (
                                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                                        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', marginBottom: '4px', textTransform: 'uppercase' }}>Happy Hour:</p>
                                        {(selectedRestaurant as any).hh_drinks && (
                                            <p style={{ fontSize: '11px', color: '#b45309', margin: '0 0 2px 0' }}>🍸 {(selectedRestaurant as any).hh_drinks}</p>
                                        )}
                                        {(selectedRestaurant as any).hh_food && (
                                            <p style={{ fontSize: '11px', color: '#b45309', margin: '0 0 2px 0' }}>🍴 {(selectedRestaurant as any).hh_food}</p>
                                        )}
                                        {(selectedRestaurant as any).hh_times && (
                                            <p style={{ fontSize: '10px', color: '#d97706', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                                                🕒 {(selectedRestaurant as any).hh_times}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {selectedRestaurant.address && (
                                    <p style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '8px', margin: 0 }}>
                                        <MapPin size={12} style={{ flexShrink: 0, marginTop: '2px', color: isHappyHourMode ? getHappyHourStyle((selectedRestaurant as any).rating).color : '#e11d48' }} />
                                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{selectedRestaurant.address}</span>
                                    </p>
                                )}

                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button
                                        onClick={() => handleViewDetails(selectedRestaurant)}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', backgroundColor: isHappyHourMode ? getHappyHourStyle((selectedRestaurant as any).rating).color : '#e11d48', color: 'white', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        View Details <ChevronRight size={14} />
                                    </button>
                                    {selectedRestaurant.booking_link && (
                                        <a
                                            href={selectedRestaurant.booking_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#374151', fontSize: '12px', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            Book <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </InfoWindow>
                )}

                {/* User location marker */}
                {userLocation && (
                    <>
                        <Circle
                            center={{ lat: userLocation.lat, lng: userLocation.lng }}
                            radius={userLocation.accuracy}
                            options={{
                                fillColor: '#4285F4',
                                fillOpacity: 0.15,
                                strokeColor: '#4285F4',
                                strokeOpacity: 0.3,
                                strokeWeight: 1,
                            }}
                        />
                        <Marker
                            position={{ lat: userLocation.lat, lng: userLocation.lng }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 10,
                                fillColor: '#4285F4',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 3,
                            }}
                            title="Your location"
                        />
                    </>
                )}
            </GoogleMap>

            {/* Locate me button */}
            <button
                onClick={centerOnUserLocation}
                disabled={isLocating}
                className="absolute bottom-4 right-4 z-10 bg-white hover:bg-gray-50 shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                aria-label="Center on my location"
                title="Center on my location"
            >
                {isLocating ? (
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                ) : (
                    <Locate size={24} className="text-blue-500" />
                )}
            </button>

            {restaurantsWithCoords.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg text-center max-w-xs pointer-events-auto">
                        <Utensils size={32} className="text-primary-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                            No restaurants with locations yet.<br />
                            Add restaurants with addresses to see them on the map!
                        </p>
                    </div>
                </div>
            )}

            {/* Warning/Side Panel for restaurants without coordinates */}
            <MapSidePanel
                restaurants={restaurants}
                restaurantsWithCoords={restaurantsWithCoords}
            />
        </div>
    );
}
