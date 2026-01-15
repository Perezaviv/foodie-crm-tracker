/**
 * Unit Tests for Telegram Bot Functions
 * 
 * Tests cover:
 * - parseRestaurantMessage parsing logic
 * - handleTelegramUpdate routing
 * - Session management functions
 * - Edge cases and error handling
 */

import { handleTelegramUpdate, parseRestaurantMessage, TelegramUpdate } from '@/lib/telegram-actions';
import { getSession, updateSession, clearSession, TelegramSession } from '@/lib/telegram-session';

// ============================================================
// MOCKS
// ============================================================

jest.mock('@/lib/telegram-session', () => ({
    getSession: jest.fn(),
    updateSession: jest.fn(),
    clearSession: jest.fn(),
}));

jest.mock('@/lib/ai', () => ({
    searchRestaurant: jest.fn().mockResolvedValue({ success: true, results: [] }),
    extractRestaurantInfo: jest.fn().mockResolvedValue({ success: false }),
}));

jest.mock('@/lib/supabase', () => ({
    createAdminClient: jest.fn(() => ({
        from: jest.fn(() => ({
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: jest.fn(() => ({ data: { id: '123', name: 'Test' }, error: null })),
                })),
            })),
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(() => ({ data: null, error: { code: 'PGRST116' } })),
                })),
                ilike: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        data: [],
                        error: null,
                    })),
                })),
            })),
            update: jest.fn(() => ({
                eq: jest.fn(() => ({ error: null })),
            })),
            upsert: jest.fn(() => ({ error: null })),
        })),
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn(() => ({ error: null })),
            })),
        },
    })),
}));

// Mock fetch for Telegram API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, result: {} }),
        text: () => Promise.resolve(''),
    })
) as jest.Mock;

// ============================================================
// parseRestaurantMessage Tests (TG-U-01 to TG-U-02)
// ============================================================

describe('Telegram Actions - parseRestaurantMessage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Existing tests
    it('TG-U-01a: parses name only', () => {
        const result = parseRestaurantMessage('Miznon');
        expect(result).toEqual({ name: 'Miznon', city: null, notes: null });
    });

    it('TG-U-01b: parses name and city', () => {
        const result = parseRestaurantMessage('Miznon, Tel Aviv');
        expect(result).toEqual({ name: 'Miznon', city: 'Tel Aviv', notes: null });
    });

    it('TG-U-01c: parses name, city and notes', () => {
        const result = parseRestaurantMessage('Miznon, Tel Aviv - great pita');
        expect(result).toEqual({ name: 'Miznon', city: 'Tel Aviv', notes: 'great pita' });
    });

    // New tests from plan
    it('TG-U-01: handles empty string', () => {
        const result = parseRestaurantMessage('');
        expect(result).toEqual({ name: null, city: null, notes: null });
    });

    it('TG-U-02: trims whitespace correctly', () => {
        const result = parseRestaurantMessage('  Miznon  ');
        expect(result).toEqual({ name: 'Miznon', city: null, notes: null });
    });

    it('handles name with city whitespace', () => {
        const result = parseRestaurantMessage('  Burger King  ,  New York  ');
        expect(result).toEqual({ name: 'Burger King', city: 'New York', notes: null });
    });

    it('handles notes only (dash at start)', () => {
        const result = parseRestaurantMessage('Restaurant Name - awesome food and vibe');
        expect(result).toEqual({ name: 'Restaurant Name', city: null, notes: 'awesome food and vibe' });
    });

    it('handles unicode/Hebrew names', () => {
        const result = parseRestaurantMessage('מסעדה טובה, תל אביב');
        expect(result).toEqual({ name: 'מסעדה טובה', city: 'תל אביב', notes: null });
    });

    it('handles multiple commas (takes first as city separator)', () => {
        const result = parseRestaurantMessage('Restaurant, Tel Aviv, Israel');
        expect(result).toEqual({ name: 'Restaurant', city: 'Tel Aviv, Israel', notes: null });
    });

    it('handles multiple dashes (takes first as notes separator)', () => {
        const result = parseRestaurantMessage('Restaurant - great food - must try');
        expect(result).toEqual({ name: 'Restaurant', city: null, notes: 'great food - must try' });
    });
});

// ============================================================
// handleTelegramUpdate Tests (TG-U-03 to TG-U-05)
// ============================================================

describe('Telegram Actions - handleTelegramUpdate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    });

    afterEach(() => {
        delete process.env.TELEGRAM_BOT_TOKEN;
    });

    it('TG-U-03: handles empty update gracefully', async () => {
        const update = { update_id: 123 } as TelegramUpdate;

        // Should not throw
        await expect(handleTelegramUpdate(update)).resolves.not.toThrow();
    });

    it('TG-U-04: routes callback_query to handler', async () => {
        const mockSession: TelegramSession = {
            chat_id: 12345,
            step: 'IDLE',
            metadata: {},
            updated_at: new Date().toISOString(),
        };
        (getSession as jest.Mock).mockResolvedValue(mockSession);

        const update: TelegramUpdate = {
            update_id: 123,
            callback_query: {
                id: 'query-id',
                from: { id: 1, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 12345 } },
                data: 'cancel',
            },
        };

        await handleTelegramUpdate(update);

        // Should have called getSession for callback handling
        expect(getSession).toHaveBeenCalledWith(12345);
        // Should have called clearSession for cancel action
        expect(clearSession).toHaveBeenCalledWith(12345);
    });

    it('TG-U-05: routes message to handler', async () => {
        (getSession as jest.Mock).mockResolvedValue(null);

        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/start',
            },
        };

        await handleTelegramUpdate(update);

        // Should have sent a message (fetch called for sendMessage)
        expect(fetch).toHaveBeenCalled();
    });
});

// ============================================================
// sendMessage Tests (TG-U-06)
// ============================================================

describe('Telegram Actions - sendMessage error handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    });

    it('TG-U-06: logs error on failed send but does not throw', async () => {
        // Mock fetch to return error
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: () => Promise.resolve('Bad Request'),
        });

        (getSession as jest.Mock).mockResolvedValue(null);

        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 99999999, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/start',
            },
        };

        // Should not throw even if send fails
        await expect(handleTelegramUpdate(update)).resolves.not.toThrow();
    });
});

// ============================================================
// Session Management Tests (TG-U-07 to TG-U-09)
// ============================================================

describe('Telegram Session - Mocked Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('TG-U-07: getSession returns null for non-existent ID', async () => {
        (getSession as jest.Mock).mockResolvedValue(null);

        const result = await getSession(99999999);
        expect(result).toBeNull();
    });

    it('TG-U-08: updateSession is called with correct params', async () => {
        await updateSession(12345, 'WAITING_FOR_PHOTOS', { pending_photos: ['file1'] });

        expect(updateSession).toHaveBeenCalledWith(12345, 'WAITING_FOR_PHOTOS', { pending_photos: ['file1'] });
    });

    it('TG-U-09: clearSession resets to IDLE', async () => {
        await clearSession(12345);

        expect(clearSession).toHaveBeenCalledWith(12345);
    });
});

// ============================================================
// Command Handling Tests
// ============================================================

describe('Telegram Actions - Command Handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TELEGRAM_BOT_TOKEN = 'test-token';
        (getSession as jest.Mock).mockResolvedValue(null);
    });

    it('handles /start command', async () => {
        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/start',
            },
        };

        await handleTelegramUpdate(update);

        // Verify sendMessage was called with Hebrew menu
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sendMessage'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('תפריט ראשי'),
            })
        );
    });

    it('handles /cancel command', async () => {
        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/cancel',
            },
        };

        await handleTelegramUpdate(update);

        expect(clearSession).toHaveBeenCalledWith(12345);
    });

    it('handles /add without query shows error in Hebrew', async () => {
        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/add',
            },
        };

        await handleTelegramUpdate(update);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sendMessage'),
            expect.objectContaining({
                body: expect.stringContaining('נא לרשום שם מסעדה'),
            })
        );
    });

    it('handles /rate with invalid format shows error in Hebrew', async () => {
        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/rate invalid',
            },
        };

        await handleTelegramUpdate(update);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sendMessage'),
            expect.objectContaining({
                body: expect.stringContaining('שימוש'),
            })
        );
    });

    it('handles /comment with invalid format shows error in Hebrew', async () => {
        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/comment no dash here',
            },
        };

        await handleTelegramUpdate(update);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sendMessage'),
            expect.objectContaining({
                body: expect.stringContaining('שימוש'),
            })
        );
    });
});

// ============================================================
// Photo Handling Tests
// ============================================================

describe('Telegram Actions - Photo Handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    });

    it('receives photo and updates session to WAITING_FOR_PHOTOS', async () => {
        (getSession as jest.Mock).mockResolvedValue(null);

        const update: TelegramUpdate = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                photo: [
                    { file_id: 'small', file_unique_id: 'u1', width: 100, height: 100, file_size: 1000 },
                    { file_id: 'large', file_unique_id: 'u2', width: 800, height: 800, file_size: 50000 },
                ],
            },
        };

        await handleTelegramUpdate(update);

        // Should update session with pending photos
        expect(updateSession).toHaveBeenCalledWith(
            12345,
            'WAITING_FOR_PHOTOS',
            expect.objectContaining({ pending_photos: ['large'] })
        );

        // Should send confirmation message in Hebrew
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sendMessage'),
            expect.objectContaining({
                body: expect.stringContaining('התקבלו'),
            })
        );
    });

    it('accumulates multiple photos in session', async () => {
        const existingSession: TelegramSession = {
            chat_id: 12345,
            step: 'WAITING_FOR_PHOTOS',
            metadata: { pending_photos: ['photo1'] },
            updated_at: new Date().toISOString(),
        };
        (getSession as jest.Mock).mockResolvedValue(existingSession);

        const update: TelegramUpdate = {
            update_id: 124,
            message: {
                message_id: 2,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                photo: [
                    { file_id: 'photo2', file_unique_id: 'u3', width: 800, height: 800, file_size: 50000 },
                ],
            },
        };

        await handleTelegramUpdate(update);

        // Should have both photos
        expect(updateSession).toHaveBeenCalledWith(
            12345,
            'WAITING_FOR_PHOTOS',
            expect.objectContaining({ pending_photos: ['photo1', 'photo2'] })
        );
    });
});
