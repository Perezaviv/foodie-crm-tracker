/**
 * @jest-environment node
 */
import { GET, POST } from '../../app/api/restaurants/route';
import { createServerClient, isSupabaseConfigured } from '../../lib/supabase';
import { NextRequest } from 'next/server';

// Mock lib/supabase
jest.mock('../../lib/supabase', () => ({
    createServerClient: jest.fn(),
    isSupabaseConfigured: jest.fn(),
}));

describe('/api/restaurants Integration', () => {
    const mockInsert = jest.fn();
    const mockSelect = jest.fn();
    const mockSingle = jest.fn();
    const mockOrder = jest.fn();
    const mockFrom = jest.fn();

    const mockSupabase = {
        from: mockFrom,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
        (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

        // Default mock implementation
        mockFrom.mockReturnValue({
            insert: mockInsert,
            select: mockSelect,
            order: mockOrder,
        });
        mockInsert.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ single: mockSingle, order: mockOrder }); // Chainable
        mockSingle.mockReturnValue({ data: null, error: null });
        mockOrder.mockReturnValue({ data: [], error: null });
    });

    describe('GET', () => {
        it('returns demo data when Supabase is not configured', async () => {
            (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
            const res = await GET();
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.demo).toBe(true);
            expect(json.success).toBe(true);
            expect(json.restaurants).toBeDefined();
        });

        it('returns a list of restaurants on success', async () => {
            const mockData = [{ id: 1, name: 'Burger King' }];
            mockOrder.mockResolvedValue({ data: mockData, error: null });

            const res = await GET();
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.restaurants).toEqual(mockData);
        });

        it('handles database errors', async () => {
            mockOrder.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

            const res = await GET();
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
            mockSingle.mockResolvedValue({ data: { id: 123, ...newResto }, error: null });

            const req = new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({ restaurant: newResto }),
            });

            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.restaurant.name).toBe('Pizza Hut');

            // Verify insert was called with correct data
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Pizza Hut',
                city: 'NYC',
            }));
        });

        it('handles insert errors', async () => {
            mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert Failed' } });

            const req = new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({ restaurant: { name: 'Fail Spot' } }),
            });

            const res = await POST(req);
            const json = await res.json();

            expect(json.success).toBe(false);
            expect(json.error).toBe('Insert Failed');
        });
    });
});
