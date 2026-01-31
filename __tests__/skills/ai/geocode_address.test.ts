import { geocodeAddress } from '../../../lib/skills/ai/geocode_address';

global.fetch = jest.fn();

describe('geocodeAddress Skill', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GOOGLE_MAPS_API_KEY = 'test-maps-key';
    });

    it('should geocode an address successfully', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                status: 'OK',
                results: [{
                    geometry: { location: { lat: 32.123, lng: 34.567 } },
                    formatted_address: 'Dizengoff St 99, Tel Aviv-Yafo, Israel',
                    place_id: 'PLACE123'
                }]
            })
        });

        const result = await geocodeAddress({ address: 'Dizengoff 99' });

        expect(result.success).toBe(true);
        expect(result.data?.lat).toBe(32.123);
        expect(result.data?.lng).toBe(34.567);
        expect(result.data?.formattedAddress).toBe('Dizengoff St 99, Tel Aviv-Yafo, Israel');
    });

    it('should use cache for repeated requests', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'OK',
                results: [{ geometry: { location: { lat: 1, lng: 1 } }, formatted_address: 'Cached' }]
            })
        });

        await geocodeAddress({ address: 'Same Address' });
        await geocodeAddress({ address: 'Same Address' });

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle zero results', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'ZERO_RESULTS' })
        });

        const result = await geocodeAddress({ address: 'NonExistent' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('No results found');
    });

    it('should return error if API key is missing', async () => {
        delete process.env.GOOGLE_MAPS_API_KEY;
        delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        const result = await geocodeAddress({ address: 'Anywhere' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('API key not configured');
    });
});
