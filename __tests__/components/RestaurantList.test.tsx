/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RestaurantList } from '../../components/RestaurantList';
import type { Restaurant } from '../../lib/types';

// Mock sub-components/icons
jest.mock('lucide-react', () => ({
    Search: () => <div data-testid="search-icon" />,
    Filter: () => <div data-testid="filter-icon" />,
    MapPin: () => <div data-testid="map-pin" />,
    Star: () => <div data-testid="star" />,
    Navigation: () => <div data-testid="nav-icon" />,
    Utensils: () => <div data-testid="utensils-icon" />,
    X: () => <div data-testid="close-icon" />,
    ChevronDown: () => <div data-testid="chevron-down" />,
    ExternalLink: () => <div data-testid="external-link" />,
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children: React.ReactNode;[key: string]: unknown }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('RestaurantList Component', () => {
    it('renders list of restaurants', () => {
        const items: Restaurant[] = [
            {
                id: '1',
                name: 'Burger King',
                cuisine: 'Fast Food',
                city: 'NY',
                address: '123 St',
                lat: 10,
                lng: 10,
                is_visited: true,
                rating: 4,
                created_at: '2023-01-01',
                updated_at: '2023-01-01',
                created_by: 'user1',
                booking_link: null,
                social_link: null,
                notes: null
            }
        ];
        render(<RestaurantList restaurants={items} />);

        expect(screen.getByText('Burger King')).toBeInTheDocument();
    });

    it('renders empty state when no restaurants', () => {
        render(<RestaurantList restaurants={[]} />);

        expect(screen.getByText(/No Restaurants Yet/i)).toBeInTheDocument();
    });

    // If filtering is client side and exposed, we test it. 
    // Based on current file structure, it seems RestaurantList manages search state or receives filtered list. 
    // Let's assume it manages search for this test or just renders what it gets.
});
