/**
 * @jest-environment node
 */
import { POST, GET } from '../../app/api/photos/route';
import { NextRequest } from 'next/server';

// Mock DB skills
jest.mock('../../lib/skills/db', () => ({
    isSupabaseConfigured: jest.fn(),
    getPhotos: jest.fn(),
    uploadPhoto: jest.fn(),
    deletePhoto: jest.fn(),
}));

import { isSupabaseConfigured, getPhotos, uploadPhoto } from '../../lib/skills/db';

describe('/api/photos Integration', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    });

    describe('POST', () => {
        it('returns 400 if no files provided', async () => {
            const formData = new FormData();
            formData.append('restaurantId', '123');

            const req = new NextRequest('http://localhost/api/photos', {
                method: 'POST',
                body: formData,
            });

            const res = await POST(req);
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json.error).toBe('No files provided');
        });

        it('returns 400 if no restaurantId provided', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['test'], { type: 'image/jpeg' }));

            const req = new NextRequest('http://localhost/api/photos', {
                method: 'POST',
                body: formData,
            });

            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it('successfully uploads a photo', async () => {
            const formData = new FormData();
            formData.append('restaurantId', '123');
            formData.append('files', new Blob(['fake-image'], { type: 'image/jpeg' }), 'test.jpg');

            (uploadPhoto as jest.Mock).mockResolvedValue({
                success: true,
                data: { id: 'photo-1', storage_path: 'p1.jpg', url: 'http://test.url' }
            });

            const req = new NextRequest('http://localhost/api/photos', {
                method: 'POST',
                body: formData,
            });

            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.photos).toHaveLength(1);
            expect(json.photos[0].url).toBe('http://test.url');
        });

        it('handles upload error', async () => {
            const formData = new FormData();
            formData.append('restaurantId', '123');
            formData.append('files', new Blob(['fake-image'], { type: 'image/jpeg' }), 'test.jpg');

            (uploadPhoto as jest.Mock).mockResolvedValue({ success: false, error: 'Upload Denied' });

            const req = new NextRequest('http://localhost/api/photos', {
                method: 'POST',
                body: formData,
            });

            const res = await POST(req);
            const json = await res.json();

            // The API returns success: false if ALL photos fail
            expect(json.success).toBe(false);
            expect(json.error).toContain('Failed to upload test.jpg: Upload Denied');
        });
    });

    describe('GET', () => {
        it('fetches photos for a restaurant', async () => {
            const mockPhotos = [{ id: '1', storage_path: 'foo.jpg', url: 'http://test.url', restaurant_id: '123' }];

            (getPhotos as jest.Mock).mockResolvedValue({ success: true, data: mockPhotos });

            const req = new NextRequest('http://localhost/api/photos?restaurantId=123');
            const res = await GET(req);
            const json = await res.json();

            expect(json.success).toBe(true);
            expect(json.photos).toHaveLength(1);
            expect(json.photos[0].url).toBe('http://test.url');
        });

        it('handles fetch error', async () => {
            (getPhotos as jest.Mock).mockResolvedValue({ success: false, error: 'DB Error' });

            const req = new NextRequest('http://localhost/api/photos?restaurantId=123');
            const res = await GET(req);
            const json = await res.json();

            expect(json.success).toBe(false);
            expect(json.error).toBe('DB Error');
        });
    });
});
