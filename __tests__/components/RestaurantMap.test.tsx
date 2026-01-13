/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RestaurantMap } from '../../components/RestaurantMap';
import type { Restaurant } from '../../lib/types';

// Mock Google Maps
jest.mock('@react-google-maps/api', () => ({
    GoogleMap: ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>,
    MarkerF: () => <div data-testid="map-marker" />,
    useJsApiLoader: () => ({ isLoaded: true }),
}));

// Mock current location hook if used inside, or props.
// Assuming RestaurantMap takes restaurants as props.

const mockRestaurants: Restaurant[] = [
    {
        id: '1',
        name: 'Place A',
        lat: 10,
        lng: 10,
        created_at: '',
        updated_at: '',
        created_by: '',
        is_visited: false,
        cuisine: null,
        city: null,
        address: null,
        booking_link: null,
        social_link: null,
        notes: null,
        rating: null
    },
    {
        id: '2',
        name: 'Place B',
        lat: 20,
        lng: 20,
        created_at: '',
        updated_at: '',
        created_by: '',
        is_visited: true,
        cuisine: null,
        city: null,
        address: null,
        booking_link: null,
        social_link: null,
        notes: null,
        rating: null
    }
];

describe('RestaurantMap Component', () => {
    it('renders the map container', () => {
        render(<RestaurantMap restaurants={mockRestaurants} />);
        expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });

    it('renders markers for restaurants with location', () => {
        render(<RestaurantMap restaurants={mockRestaurants} />);
        const markers = screen.getAllByTestId('map-marker');
        // We expect 2 markers + maybe 1 for current location if enabled by default
        expect(markers.length).toBeGreaterThanOrEqual(2);
    });
});
