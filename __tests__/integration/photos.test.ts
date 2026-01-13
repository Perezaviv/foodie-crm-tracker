/**
 * @jest-environment node
 */
/**
 * @jest-environment node
 */
import { POST, GET } from '../../app/api/photos/route';
import { createServerClient, isSupabaseConfigured } from '../../lib/supabase';
import { NextRequest } from 'next/server';

// Mock lib/supabase
jest.mock('../../lib/supabase', () => ({
    createServerClient: jest.fn(),
    isSupabaseConfigured: jest.fn(),
}));

describe('/api/photos Integration', () => {
    const mockInsert = jest.fn();
    const mockSelect = jest.fn();
    const mockSingle = jest.fn();
    const mockFrom = jest.fn();
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();
    const mockStorageFrom = jest.fn();
    const mockEq = jest.fn();
    const mockOrder = jest.fn();

    const mockSupabase = {
        from: mockFrom,
        storage: {
            from: mockStorageFrom,
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
        (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

        // Mock Database Chain
        mockFrom.mockReturnValue({
            insert: mockInsert,
            select: mockSelect,
        });
        mockInsert.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({
            single: mockSingle,
            eq: mockEq,
        });
        mockEq.mockReturnValue({ order: mockOrder });
        mockOrder.mockReturnValue({ data: [], error: null });

        // Mock Storage Chain
        mockStorageFrom.mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
        });
        mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'http://test.url' } });
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

            // Mock success responses
            mockUpload.mockResolvedValue({ error: null });
            mockSingle.mockResolvedValue({ data: { id: 'photo-1', storage_path: 'p1.jpg' }, error: null });

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

        it('handles storage upload error', async () => {
            const formData = new FormData();
            formData.append('restaurantId', '123');
            formData.append('files', new Blob(['fake-image'], { type: 'image/jpeg' }), 'test.jpg');

            mockUpload.mockResolvedValue({ error: { message: 'Upload Denied' } });

            const req = new NextRequest('http://localhost/api/photos', {
                method: 'POST',
                body: formData,
            });

            const res = await POST(req);
            const json = await res.json();

            // Since we loop through files and continue on error, if all fail, it returns "No photos were uploaded successfully"
            expect(json.success).toBe(false);
            expect(json.error).toBe('No photos were uploaded successfully');
        });
    });

    describe('GET', () => {
        it('fetches photos for a restaurant', async () => {
            const mockPhotos = [{ id: '1', storage_path: 'foo.jpg', restaurant_id: '123' }];

            mockSelect.mockReturnValue({ eq: mockEq }); // Need to reset mock return for this specific chain
            mockEq.mockReturnValue({ order: mockOrder });
            mockOrder.mockResolvedValue({ data: mockPhotos, error: null });

            const req = new NextRequest('http://localhost/api/photos?restaurantId=123');
            const res = await GET(req);
            const json = await res.json();

            expect(json.success).toBe(true);
            expect(json.photos).toHaveLength(1);
            expect(json.photos[0].url).toBe('http://test.url');
        });
    });
});
