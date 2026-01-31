import { MarkerClusterer } from '@googlemaps/markerclusterer';

/**
 * Utility to create a MarkerClusterer with the project's custom styling.
 */
export function createMapClusterer(map: google.maps.Map, markers: google.maps.Marker[]) {
    return new MarkerClusterer({
        map,
        markers,
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
}
