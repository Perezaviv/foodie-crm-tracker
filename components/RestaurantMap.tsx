'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow, Circle, Marker } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Utensils, Loader2, ExternalLink, Locate, MapPin, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant } from '@/lib/types';

interface RestaurantMapProps {
    restaurants: Restaurant[];
    onRestaurantClick?: (restaurant: Restaurant) => void;
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
function createEmojiMarkerIcon(): string {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                </filter>
            </defs>
            <circle cx="24" cy="20" r="18" fill="#e11d48" filter="url(#shadow)"/>
            <text x="24" y="26" text-anchor="middle" font-size="20">🍽️</text>
            <path d="M24 38 L18 28 L30 28 Z" fill="#e11d48"/>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function RestaurantMap({ restaurants, onRestaurantClick }: RestaurantMapProps) {
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(12);
    const mapRef = useRef<google.maps.Map | null>(null);
    const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const restaurantMapRef = useRef<Map<google.maps.Marker, Restaurant>>(new Map());

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

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    });

    const restaurantsWithCoords = restaurants.filter(r => r.lat && r.lng);

    // Debug logging for map loading and restaurant data
    useEffect(() => {
        console.log('[RestaurantMap] API Key present:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
        console.log('[RestaurantMap] isLoaded:', isLoaded, 'loadError:', loadError?.message || 'none');
        console.log('[RestaurantMap] Total restaurants:', restaurants.length);
        console.log('[RestaurantMap] With coordinates:', restaurantsWithCoords.length);

        if (restaurants.length > 0 && restaurantsWithCoords.length === 0) {
            console.warn('[RestaurantMap] All restaurants missing coordinates! Sample:',
                restaurants.slice(0, 3).map(r => ({ name: r.name, lat: r.lat, lng: r.lng, address: r.address }))
            );
        }
    }, [isLoaded, loadError, restaurants, restaurantsWithCoords]);

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
                    console.log('Geolocation error:', error.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }, []);

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
    }, []);

    // Setup marker clustering
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;

        const map = mapRef.current;
        const markerIcon = createEmojiMarkerIcon();
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
                    setSelectedRestaurant(clickedRestaurant);
                }
            });

            return marker;
        });

        markersRef.current = newMarkers;

        // Create clusterer
        clustererRef.current = new MarkerClusterer({
            map,
            markers: newMarkers,
            renderer: {
                render: ({ count, position }) => {
                    return new google.maps.Marker({
                        position,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 18 + Math.min(count, 10) * 2,
                            fillColor: '#e11d48',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 3,
                        },
                        label: {
                            text: String(count),
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '12px',
                        },
                        zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
                    });
                },
            },
        });

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
    }, [isLoaded, restaurantsWithCoords, zoomLevel, getMarkerSize]);

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

    // Handle "View Details" button in popup
    const handleViewDetails = useCallback((restaurant: Restaurant) => {
        setSelectedRestaurant(null);
        onRestaurantClick?.(restaurant);
    }, [onRestaurantClick]);

    if (loadError) {
        // Demo mode map fallback - show a simulated map with restaurant list
        console.error('[RestaurantMap] Google Maps load error:', loadError);

        return (
            <div className="relative h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-auto">
                {/* Simulated map background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }} />
                </div>

                {/* Error notice with details */}
                <div className="absolute top-4 left-4 right-4 z-10">
                    <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-xl p-4 shadow-lg">
                        <p className="text-red-800 dark:text-red-200 text-sm font-medium mb-2">
                            🗺️ Google Maps failed to load
                        </p>
                        <p className="text-red-700 dark:text-red-300 text-xs mb-3">
                            Error: {loadError.message || 'Unknown error'}
                        </p>
                        <details className="text-xs text-red-600 dark:text-red-400">
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
                                className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-slate-200 dark:border-slate-700 text-left hover:shadow-lg hover:border-primary-400 transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg">🍽️</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">{restaurant.name}</h3>
                                        {restaurant.cuisine && (
                                            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium mt-1">
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

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-full bg-muted/50">
                <Loader2 size={32} className="animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={getCenter()}
                zoom={getZoom()}
                onLoad={onMapLoad}
                options={{
                    styles: mapStyles,
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                }}
            >
                {/* Markers are now managed by the clusterer in useEffect */}

                {selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng && (
                    <InfoWindow
                        position={{ lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }}
                        onCloseClick={() => setSelectedRestaurant(null)}
                        options={{ pixelOffset: new google.maps.Size(0, -40) }}
                    >
                        <div style={{ minWidth: '200px', maxWidth: '280px', padding: '8px', backgroundColor: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: '18px' }}>🍽️</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontWeight: 'bold', color: '#111827', fontSize: '16px', margin: 0, wordBreak: 'break-word' }}>{selectedRestaurant.name}</h3>
                                    {selectedRestaurant.cuisine && (
                                        <span style={{ display: 'inline-block', fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#fed7aa', color: '#c2410c', fontWeight: 500, marginTop: '4px' }}>
                                            {selectedRestaurant.cuisine}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {selectedRestaurant.address && (
                                <p style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '8px', margin: 0 }}>
                                    <MapPin size={12} style={{ flexShrink: 0, marginTop: '2px', color: '#f97316' }} />
                                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{selectedRestaurant.address}</span>
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button
                                    onClick={() => handleViewDetails(selectedRestaurant)}
                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', backgroundColor: '#f97316', color: 'white', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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

            {/* Warning for restaurants without coordinates */}
            {restaurants.length > restaurantsWithCoords.length && (
                <div className="absolute top-4 right-4 z-10 max-w-[250px]">
                    <div className="bg-amber-50 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200 dark:border-amber-800 rounded-lg p-3 shadow-lg flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                            <div className="p-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex-shrink-0">
                                <MapPin size={14} className="opacity-50" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                                    {restaurants.length - restaurantsWithCoords.length} restaurants missing location
                                </p>
                                <button
                                    onClick={async (e) => {
                                        const btn = e.currentTarget;
                                        btn.textContent = 'Fixing...';
                                        btn.disabled = true;

                                        let fixedCount = 0;
                                        const failedRestaurants: string[] = [];
                                        const missing = restaurants.filter(r => !r.lat || !r.lng);

                                        console.log('[Auto-Fix] Starting fix for', missing.length, 'restaurants');

                                        // Helper to clean noisy addresses
                                        const cleanAddress = (addr: string, city?: string | null) => {
                                            // Remove newlines and extra whitespace
                                            let cleaned = addr.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                                            // Take only the first sentence (before common noise patterns)
                                            const noisePhrases = [
                                                /\.\s*(To book|It is known|Book a table|Booking|Instagram|Call|Phone)/i,
                                                /\.\s*[A-Z]/,  // Any sentence after first
                                            ];
                                            for (const pattern of noisePhrases) {
                                                const match = cleaned.match(pattern);
                                                if (match && match.index) {
                                                    cleaned = cleaned.substring(0, match.index).trim();
                                                }
                                            }

                                            // Remove trailing period
                                            cleaned = cleaned.replace(/\.$/, '').trim();

                                            // If no city in address and city is provided, append it
                                            if (city && !cleaned.toLowerCase().includes(city.toLowerCase()) && !cleaned.toLowerCase().includes('tel aviv')) {
                                                cleaned = `${cleaned}, ${city}`;
                                            }

                                            // Add Israel for better geocoding accuracy
                                            if (!cleaned.toLowerCase().includes('israel')) {
                                                cleaned = `${cleaned}, Israel`;
                                            }

                                            return cleaned;
                                        };

                                        for (const r of missing) {
                                            if (!r.address) {
                                                console.warn(`[Auto-Fix] Skipping "${r.name}" - no address`);
                                                failedRestaurants.push(`${r.name} (no address)`);
                                                continue;
                                            }
                                            try {
                                                const cleaned = cleanAddress(r.address, r.city);
                                                console.log(`[Auto-Fix] Geocoding "${r.name}" with address: "${cleaned}"`);
                                                let coords: { lat: number, lng: number } | null = null;

                                                // Try client-side geocoder first (more likely to work with restricted keys)
                                                if (window.google?.maps?.Geocoder) {
                                                    const geocoder = new google.maps.Geocoder();
                                                    const result = await new Promise<google.maps.GeocoderResult[] | null>((resolve) => {
                                                        geocoder.geocode({ address: cleaned }, (results, status) => {
                                                            console.log(`[Auto-Fix] Client geocode status for "${r.name}":`, status);
                                                            if (status === 'OK' && results) resolve(results);
                                                            else resolve(null);
                                                        });
                                                    });
                                                    if (result && result[0]) {
                                                        coords = {
                                                            lat: result[0].geometry.location.lat(),
                                                            lng: result[0].geometry.location.lng()
                                                        };
                                                        console.log(`[Auto-Fix] Client geocode success for "${r.name}":`, coords);
                                                    }
                                                } else {
                                                    console.warn('[Auto-Fix] Client-side Geocoder not available');
                                                }

                                                // Fallback to server if client fails
                                                if (!coords) {
                                                    console.log(`[Auto-Fix] Trying server geocode for "${r.name}"...`);
                                                    const res = await fetch('/api/geocode', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ address: cleaned })
                                                    });
                                                    const data = await res.json();
                                                    console.log(`[Auto-Fix] Server geocode result for "${r.name}":`, data);
                                                    if (data.success) {
                                                        coords = { lat: data.lat, lng: data.lng };
                                                    }
                                                }

                                                if (coords) {
                                                    const updateRes = await fetch(`/api/restaurants/${r.id}`, {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ lat: coords.lat, lng: coords.lng })
                                                    });
                                                    if (updateRes.ok) {
                                                        console.log(`[Auto-Fix] Updated "${r.name}" successfully`);
                                                        fixedCount++;
                                                    } else {
                                                        console.error(`[Auto-Fix] Failed to update "${r.name}"`);
                                                        failedRestaurants.push(`${r.name} (update failed)`);
                                                    }
                                                } else {
                                                    console.warn(`[Auto-Fix] No coords found for "${r.name}"`);
                                                    failedRestaurants.push(`${r.name} (geocode failed)`);
                                                }
                                            } catch (err) {
                                                console.error('[Auto-Fix] Error for restaurant:', r.name, err);
                                                failedRestaurants.push(`${r.name} (error)`);
                                            }
                                        }

                                        console.log('[Auto-Fix] Complete. Fixed:', fixedCount, 'Failed:', failedRestaurants);

                                        if (fixedCount > 0) {
                                            toast.success(`Fixed ${fixedCount} locations! Refreshing...`);
                                            window.location.reload();
                                        } else {
                                            toast.error(`Could not fix locations. Check console for details.`);
                                            btn.textContent = 'Retry Auto-Fix';
                                            btn.disabled = false;
                                        }
                                    }}
                                    className="text-[10px] bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-800 dark:text-amber-100 px-2 py-0.5 rounded-full mt-1 transition-colors"
                                >
                                    Auto-Fix Locations
                                </button>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.currentTarget.parentElement?.parentElement?.remove(); // Simple dismiss
                                }}
                                className="text-amber-500 hover:text-amber-700 ml-auto"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
