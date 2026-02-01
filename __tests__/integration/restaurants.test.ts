/**
 * @jest-environment node
 */
import { GET, POST } from '../../app/api/restaurants/route';
import { NextRequest } from 'next/server';

// Mock DB skills
jest.mock('../../lib/skills/db', () => ({
    isSupabaseConfigured: jest.fn(),
    getRestaurants: jest.fn(),
    createRestaurant: jest.fn(),
}));

// Mock AI skills
jest.mock('../../lib/skills/ai', () => ({
    geocodeAddress: jest.fn(),
}));

import { isSupabaseConfigured, getRestaurants, createRestaurant } from '../../lib/skills/db';
import { geocodeAddress } from '../../lib/skills/ai';

describe('/api/restaurants Integration', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    });

    describe('GET', () => {
        it('returns demo data when Supabase is not configured', async () => {
            (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
            const req = new NextRequest('http://localhost/api/restaurants');
            const res = await GET(req);
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.demo).toBe(true);
            expect(json.success).toBe(true);
            expect(json.restaurants).toBeDefined();
        });

        it('returns a list of restaurants on success', async () => {
            const mockData = [{ id: '1', name: 'Burger King' }];
            (getRestaurants as jest.Mock).mockResolvedValue({ success: true, data: mockData });

            const req = new NextRequest('http://localhost/api/restaurants');
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.restaurants).toEqual(mockData);
        });

        it('handles database errors', async () => {
            (getRestaurants as jest.Mock).mockResolvedValue({ success: false, error: 'DB Error' });

            const req = new NextRequest('http://localhost/api/restaurants');
            const res = await GET(req);
            const json = await res.json();

            expect(json.success).toBe(false);
            expect(json.error).toBe('DB Error');
        });
    });

    describe('POST', () => {
        it('returns 400 if restaurant data is missing', async () => {
            const req = new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({}),
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it('creates a restaurant successfully', async () => {
            const newResto = { name: 'Pizza Hut', city: 'NYC' };
            const mockCreated = { id: '123', ...newResto };

            (createRestaurant as jest.Mock).mockResolvedValue({ success: true, data: mockCreated });
            (geocodeAddress as jest.Mock).mockResolvedValue({ success: false }); // skip geo for this test

            const req = new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({ restaurant: newResto }),
            });

            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.restaurant.name).toBe('Pizza Hut');

            // Verify create was called with correct data
            expect(createRestaurant).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Pizza Hut',
                city: 'NYC',
            }));
        });

        it('handles insert errors', async () => {
            (createRestaurant as jest.Mock).mockResolvedValue({ success: false, error: 'Insert Failed' });
            (geocodeAddress as jest.Mock).mockResolvedValue({ success: false });

            const req = new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({ restaurant: { name: 'Fail Spot' } }),
            });

            const res = await POST(req);
            const json = await res.json();

            expect(json.success).toBe(false);
            expect(json.error).toBe('Insert Failed');
        });

        it('attempts geocoding when address provided', async () => {
            const newResto = { name: 'Geo Spot', address: '123 Main St', city: 'City' };
            const mockCreated = { id: '124', ...newResto, lat: 10, lng: 10 };

            (geocodeAddress as jest.Mock).mockResolvedValue({ success: true, data: { lat: 10, lng: 10 } });
            (createRestaurant as jest.Mock).mockResolvedValue({ success: true, data: mockCreated });

            const req = new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({ restaurant: newResto }),
            });

            await POST(req);

            expect(geocodeAddress).toHaveBeenCalled();
            expect(createRestaurant).toHaveBeenCalledWith(expect.objectContaining({
                address: '123 Main St',
                lat: 10,
                lng: 10
            }));
        });
    });
});
