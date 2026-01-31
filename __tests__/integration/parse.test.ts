/**
 * @jest-environment node
 */
import { POST } from '../../app/api/parse/route';
import { NextRequest } from 'next/server';
import { extractRestaurantInfo, searchRestaurant, geocodeAddress } from '../../lib/ai';

// Mock lib/ai
jest.mock('../../lib/ai', () => ({
    extractRestaurantInfo: jest.fn(),
    searchRestaurant: jest.fn(),
    geocodeAddress: jest.fn(),
}));

describe('/api/parse Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('rejects empty input', async () => {
        const req = new NextRequest('http://localhost/api/parse', {
            method: 'POST',
            body: JSON.stringify({ input: '' }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('parses, searches, and geocodes successfully', async () => {
        // 1. Mock Extraction
        (extractRestaurantInfo as jest.Mock).mockResolvedValue({
            success: true,
            data: { name: 'Sushi Place', city: 'Tokyo', confidence: 'high' }
        });

        // 2. Mock Search
        (searchRestaurant as jest.Mock).mockResolvedValue({
            requiresSelection: false,
            results: [{ bookingLink: 'http://book.com', address: '123 Tokyo St' }]
        });

        // 3. Mock Geocode
        (geocodeAddress as jest.Mock).mockResolvedValue({
            success: true,
            data: { lat: 35.6, lng: 139.7 }
        });

        const req = new NextRequest('http://localhost/api/parse', {
            method: 'POST',
            body: JSON.stringify({ input: 'Sushi Place in Tokyo' }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(json.success).toBe(true);
        expect(json.restaurant.name).toBe('Sushi Place');
        expect(json.restaurant.address).toBe('123 Tokyo St');
        expect(json.restaurant.lat).toBe(35.6);
    });

    it('handles parsing failure', async () => {
        (extractRestaurantInfo as jest.Mock).mockResolvedValue({
            success: false,
            error: 'AI Error'
        });

        const req = new NextRequest('http://localhost/api/parse', {
            method: 'POST',
            body: JSON.stringify({ input: 'Invalid' }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(json.success).toBe(false);
        expect(json.error).toBe('AI Error');
    });
});
