'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { Utensils, Loader2, ExternalLink, Locate, MapPin, ChevronRight } from 'lucide-react';
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
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(12);
    const mapRef = useRef<google.maps.Map | null>(null);
    const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
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
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location access denied');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location unavailable');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out');
                        break;
                    default:
                        setLocationError('Unable to get location');
                }
                setTimeout(() => setLocationError(null), 3000);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

    // Handle marker click with single/double click detection
    // Handle marker click - Instant (removed double click delay)
    const handleMarkerClick = useCallback((restaurant: Restaurant) => {
        setSelectedRestaurant(restaurant);
    }, []);

    // Handle "View Details" button in popup
    const handleViewDetails = useCallback((restaurant: Restaurant) => {
        setSelectedRestaurant(null);
        onRestaurantClick?.(restaurant);
    }, [onRestaurantClick]);

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-muted/50 p-6">
                <p className="text-red-500">Failed to load Google Maps</p>
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

    const markerIcon = createEmojiMarkerIcon();

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
                {restaurantsWithCoords.map((restaurant) => {
                    const size = getMarkerSize(zoomLevel);
                    return (
                        <Marker
                            key={restaurant.id}
                            position={{ lat: restaurant.lat!, lng: restaurant.lng! }}
                            onClick={() => handleMarkerClick(restaurant)}
                            icon={{
                                url: markerIcon,
                                scaledSize: new google.maps.Size(size, size),
                                anchor: new google.maps.Point(size / 2, size * 0.9),
                            }}
                        />
                    );
                })}

                {selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng && (
                    <InfoWindow
                        position={{ lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }}
                        onCloseClick={() => setSelectedRestaurant(null)}
                        options={{ pixelOffset: new google.maps.Size(0, -40) }}
                    >
                        <div className="min-w-[200px] max-w-[280px] p-2">
                            <div className="flex items-start gap-2 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg">🍽️</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-base truncate">{selectedRestaurant.name}</h3>
                                    {selectedRestaurant.cuisine && (
                                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                                            {selectedRestaurant.cuisine}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {selectedRestaurant.address && (
                                <p className="text-xs text-gray-500 flex items-start gap-1 mb-2">
                                    <MapPin size={12} className="flex-shrink-0 mt-0.5 text-orange-500" />
                                    <span className="line-clamp-2">{selectedRestaurant.address}</span>
                                </p>
                            )}

                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => handleViewDetails(selectedRestaurant)}
                                    className="flex-1 py-2 px-3 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"
                                >
                                    View Details <ChevronRight size={14} />
                                </button>
                                {selectedRestaurant.booking_link && (
                                    <a
                                        href={selectedRestaurant.booking_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-2 px-3 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center gap-1"
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

            {/* Location error toast */}
            {locationError && (
                <div className="absolute bottom-20 right-4 z-10 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-slide-up">
                    {locationError}
                </div>
            )}

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
        </div>
    );
}
