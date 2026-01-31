/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RestaurantList } from '../../components/RestaurantList';
import type { Restaurant } from '../../lib/types';

// Mock sub-components/icons
jest.mock('lucide-react', () => ({
    Search: () => <span data-testid="search-icon" />,
    Filter: () => <span data-testid="filter-icon" />,
    MapPin: () => <span data-testid="map-pin" />,
    Star: () => <span data-testid="star" />,
    Navigation: () => <span data-testid="nav-icon" />,
    Utensils: () => <span data-testid="utensils-icon" />,
    X: () => <span data-testid="close-icon" />,
    ChevronDown: () => <span data-testid="chevron-down" />,
    ExternalLink: () => <span data-testid="external-link" />,
}));

// Mock framer-motion to avoid animation issues in tests
// Filter function MUST be inside the factory to work with Jest hoisting
jest.mock('framer-motion', () => {
    const filterMotionProps = (props: Record<string, unknown>) => {
        const motionProps = ['layout', 'whileHover', 'whileTap', 'variants', 'initial', 'animate', 'exit', 'transition', 'whileFocus', 'whileInView', 'drag', 'dragConstraints'];
        const filtered: Record<string, unknown> = {};
        for (const key in props) {
            if (!motionProps.includes(key) && !key.startsWith('onAnimation') && !key.startsWith('onDrag')) {
                filtered[key] = props[key];
            }
        }
        return filtered;
    };

    const React = require('react');
    return {
        motion: {
            div: ({ children, ...props }: { children: React.ReactNode;[key: string]: unknown }) =>
                React.createElement('div', filterMotionProps(props), children),
            a: ({ children, ...props }: { children: React.ReactNode;[key: string]: unknown }) =>
                React.createElement('a', filterMotionProps(props), children),
            button: ({ children, ...props }: { children: React.ReactNode;[key: string]: unknown }) =>
                React.createElement('button', filterMotionProps(props), children),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    };
});

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
                notes: null,
                logo_url: null
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
