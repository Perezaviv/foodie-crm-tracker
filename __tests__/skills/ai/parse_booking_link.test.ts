import { parseBookingLink } from '../../../lib/skills/ai/parse_booking_link';

describe('parseBookingLink Skill', () => {
    const restaurantName = 'Vitrina';

    it('should select the best link based on name match and platform weight', async () => {
        const links = [
            'https://tabit.cloud/vitrina-tlv', // High score (Tabit + name)
            'https://ontopo.co.il/another-place', // Medium score (Ontopo)
            'https://tabit.cloud/search', // Generic (should be filtered)
            'https://other-site.com/vitrina' // Low weight platform but name match
        ];

        const result = await parseBookingLink({ links, restaurantName });

        expect(result.success).toBe(true);
        expect(result.data?.bestLink).toBe('https://tabit.cloud/vitrina-tlv');
    });

    it('should filter out generic landing pages', async () => {
        const links = [
            'https://tabit.cloud/',
            'https://ontopo.co.il/en/search',
            'https://tabit.cloud/terms-of-use'
        ];

        const result = await parseBookingLink({ links, restaurantName });
        expect(result.data?.bestLink).toBeUndefined();
        expect(result.data?.allLinks.length).toBe(0);
    });

    it('should handle empty input', async () => {
        const result = await parseBookingLink({ links: [], restaurantName });
        expect(result.success).toBe(true);
        expect(result.data?.allLinks.length).toBe(0);
    });

    it('should handle invalid URLs', async () => {
        const result = await parseBookingLink({ links: ['not-a-url'], restaurantName });
        expect(result.success).toBe(true);
        expect(result.data?.allLinks.length).toBe(0);
    });
});
