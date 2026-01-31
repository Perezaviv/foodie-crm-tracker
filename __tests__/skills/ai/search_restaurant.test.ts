import { searchRestaurant } from '../../../lib/skills/ai/search_restaurant';

// Mock global fetch
global.fetch = jest.fn();

// Mock skill dependencies
jest.mock('../../../lib/skills/ai/geocode_address', () => ({
    geocodeAddress: jest.fn().mockImplementation((input) => Promise.resolve({
        success: true,
        data: {
            lat: 32.0853,
            lng: 34.7818,
            formattedAddress: input.address.includes('Dizengoff') ? 'Dizengoff St 99, Tel Aviv-Yafo, Israel' : 'Mocked Address, Israel'
        }
    }))
}));

jest.mock('../../../lib/skills/ai/parse_booking_link', () => ({
    parseBookingLink: jest.fn().mockImplementation((input) => Promise.resolve({
        success: true,
        data: {
            bestLink: input.links.find((l: string) => l.includes('tabit')) || input.links[0],
            allLinks: []
        }
    }))
}));

describe('searchRestaurant Skill', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TAVILY_API_KEY = 'test-tavily-key';
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should search and enrich restaurant data successfully', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                answer: 'Located at Dizengoff 99, Tel Aviv',
                results: [
                    {
                        title: 'Vitrina',
                        url: 'https://vitrina.co.il',
                        content: 'Great burgers at Dizengoff 99. Book now at https://tabit.cloud/vitrina',
                        score: 0.9
                    }
                ],
                images: ['https://example.com/logo.png']
            })
        });

        const result = await searchRestaurant({ name: 'Vitrina', city: 'Tel Aviv' });

        expect(result.success).toBe(true);
        expect(result.results.length).toBe(1);
        expect(result.results[0].name).toBe('Vitrina');
        expect(result.results[0].address).toContain('Dizengoff');
        expect(result.results[0].bookingLink).toBe('https://tabit.cloud/vitrina');
        expect(result.results[0].logoUrl).toBe('https://example.com/logo.png');
    });

    it('should use cache for repeated requests', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] })
        });

        // First call
        await searchRestaurant({ name: 'CacheTest', city: 'TLV' });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Second call
        await searchRestaurant({ name: 'CacheTest', city: 'TLV' });
        expect(global.fetch).toHaveBeenCalledTimes(1); // Should not call fetch again
    });

    it('should retry on 500 errors', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: false, status: 500 })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ results: [] })
            });

        const searchPromise = searchRestaurant({ name: 'RetryTest', useCache: false });

        // Fast-forward timers for retry backoff
        await jest.runAllTimersAsync();

        const result = await searchPromise;

        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return error if Tavily API key is missing', async () => {
        delete process.env.TAVILY_API_KEY;

        const result = await searchRestaurant({ name: 'NoKey' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('TAVILY_API_KEY');
    });

    it('should handle Tavily API failure after retries', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

        const searchPromise = searchRestaurant({ name: 'FailTest', useCache: false });

        for (let i = 0; i < 3; i++) {
            await jest.runAllTimersAsync();
        }

        const result = await searchPromise;
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });
});
