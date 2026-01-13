import type { Restaurant } from './types';

/**
 * Mock restaurant data for demo mode.
 * Used when Supabase is not configured.
 */
export const mockRestaurants: Restaurant[] = [
    {
        id: 'demo-1',
        name: 'Vitrina Tel Aviv',
        cuisine: 'Mediterranean',
        city: 'Tel Aviv',
        address: 'Rothschild Blvd 45, Tel Aviv',
        lat: 32.0636,
        lng: 34.7756,
        is_visited: true,
        rating: 5,
        booking_link: 'https://tabit.cloud/vitrina',
        social_link: 'https://instagram.com/vitrina.tlv',
        notes: 'Amazing rooftop view, great cocktails',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
    },
    {
        id: 'demo-2',
        name: 'Miznon',
        cuisine: 'Israeli Street Food',
        city: 'Tel Aviv',
        address: 'King George St 30, Tel Aviv',
        lat: 32.0731,
        lng: 34.7751,
        is_visited: true,
        rating: 4,
        booking_link: null,
        social_link: 'https://instagram.com/miaborr',
        notes: 'Best pita in the city',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
    },
    {
        id: 'demo-3',
        name: 'Shila - Sharon Cohen',
        cuisine: 'Seafood',
        city: 'Tel Aviv',
        address: 'Ben Yehuda St 182, Tel Aviv',
        lat: 32.0853,
        lng: 34.7718,
        is_visited: false,
        rating: null,
        booking_link: 'https://ontopo.co.il/shila',
        social_link: null,
        notes: 'Recommended by food bloggers, must try the fish',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
    },
    {
        id: 'demo-4',
        name: 'Ouzeria',
        cuisine: 'Greek',
        city: 'Tel Aviv',
        address: 'Nachlat Binyamin 42, Tel Aviv',
        lat: 32.0645,
        lng: 34.7698,
        is_visited: true,
        rating: 5,
        booking_link: null,
        social_link: 'https://instagram.com/ouzeria.tlv',
        notes: 'Authentic Greek, great meze',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
    },
    {
        id: 'demo-5',
        name: 'Mashya',
        cuisine: 'Modern Israeli',
        city: 'Tel Aviv',
        address: 'Mendele Mocher Sfarim St 5, Tel Aviv',
        lat: 32.0727,
        lng: 34.7687,
        is_visited: false,
        rating: null,
        booking_link: 'https://tabit.cloud/mashya',
        social_link: 'https://instagram.com/mashya.rest',
        notes: 'Fine dining experience, tasting menu recommended',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
    },
];

/**
 * Check if the app is running in demo mode (no database configured)
 */
export function isDemoMode(): boolean {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return !supabaseUrl || !supabaseKey;
}

/**
 * Get demo mode storage key for localStorage
 */
export const DEMO_STORAGE_KEY = 'foodie-crm-demo-restaurants';

/**
 * Generate a unique demo ID
 */
export function generateDemoId(): string {
    return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
