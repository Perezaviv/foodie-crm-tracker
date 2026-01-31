import { extractInfo, normalizeRestaurantName, detectSocialLink } from '../../../lib/skills/ai/extract_info';

// Mock dependencies
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
    })),
}));

describe('extractInfo Skill', () => {

    describe('normalizeRestaurantName', () => {
        it('lowercases and trims', () => {
            expect(normalizeRestaurantName('  My Restaurant  ')).toBe('my restaurant');
        });

        it('removes special characters', () => {
            expect(normalizeRestaurantName('Jo\'s Pizza!')).toBe('jos pizza');
        });
    });

    describe('detectSocialLink', () => {
        it('detects instagram links', () => {
            expect(detectSocialLink('https://instagram.com/foodie').isSocial).toBe(true);
            expect(detectSocialLink('https://instagram.com/foodie').platform).toBe('instagram');
        });

        it('returns false for regular text', () => {
            expect(detectSocialLink('Just a name').isSocial).toBe(false);
        });
    });

    describe('extractInfo', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            process.env.GEMINI_API_KEY = 'test-key';
        });

        it('successfully extracts data from AI response', async () => {
            const mockResponseText = JSON.stringify({
                name: 'Test Resto',
                city: 'Test City',
                confidence: 'high'
            });

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => mockResponseText
                }
            });

            const result = await extractInfo({ text: 'Test Resto in Test City' });

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe('Test Resto');
            expect(result.data?.city).toBe('Test City');
        });

        it('handles markdown code blocks in AI response', async () => {
            const mockResponseText = "```json\n" + JSON.stringify({
                name: 'Code Block Resto',
                confidence: 'high'
            }) + "\n```";

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => mockResponseText
                }
            });

            const result = await extractInfo({ text: 'Code Block Resto' });
            expect(result.success).toBe(true);
            expect(result.data?.name).toBe('Code Block Resto');
        });

        it('returns fallback if API key is missing', async () => {
            delete process.env.GEMINI_API_KEY;
            delete process.env.GOOGLE_AI_API_KEY;

            const result = await extractInfo({ text: 'Simple Name' });
            expect(result.success).toBe(true);
            expect(result.data?.name).toBe('Simple Name');
            expect(result.data?.confidence).toBe('medium');
        });

        it('handles invalid JSON from AI', async () => {
            process.env.GEMINI_API_KEY = 'test-key';
            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => 'Not a JSON string'
                }
            });

            const result = await extractInfo({ text: 'Bad Response' });
            expect(result.success).toBe(false);
            expect(result.error).toBeTruthy();
        });
    });
});
