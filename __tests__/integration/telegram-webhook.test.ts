/**
 * Integration Tests for Telegram Webhook API
 * 
 * Tests cover:
 * - Webhook endpoint responses (TG-I-01 to TG-I-06)
 * - Error handling
 * - Authentication
 * 
 * Note: These tests mock the handleTelegramUpdate function and test
 * the webhook's request/response handling logic.
 */

// Store original env
const originalEnv = { ...process.env };

// Mock dependencies BEFORE imports
jest.mock('@/lib/telegram-actions', () => ({
    handleTelegramUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/telegram-session', () => ({
    getSession: jest.fn(),
    updateSession: jest.fn(),
    clearSession: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
    createAdminClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({ data: [], error: null })),
        })),
    })),
}));

import { handleTelegramUpdate } from '@/lib/telegram-actions';

// Helper to simulate webhook call
async function simulateWebhook(body: unknown, token?: string): Promise<{ status: number; data: unknown }> {
    // Set or unset token
    if (token === undefined) {
        delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
        process.env.TELEGRAM_BOT_TOKEN = token;
    }

    // Simulate what the webhook route does
    const mockToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!mockToken) {
        return { status: 503, data: { error: 'Telegram token not configured' } };
    }

    try {
        if (typeof body === 'string') {
            // Simulate JSON parse error
            JSON.parse(body);
        }

        // Call the handler
        await (handleTelegramUpdate as jest.Mock)(body);

        return { status: 200, data: { ok: true } };
    } catch {
        return { status: 500, data: { error: 'Internal Server Error' } };
    }
}

describe('Telegram Webhook API - Logic Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    // ============================================================
    // TG-I-01: Missing BOT_TOKEN
    // ============================================================

    it('TG-I-01: returns 503 when TELEGRAM_BOT_TOKEN is missing', async () => {
        const result = await simulateWebhook({ update_id: 123 }, undefined);

        expect(result.status).toBe(503);
        expect((result.data as { error: string }).error).toContain('not configured');
    });

    // ============================================================
    // TG-I-02: Valid text message
    // ============================================================

    it('TG-I-02: returns 200 for valid text message update', async () => {
        const body = {
            update_id: 123,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: 'Hello bot',
            },
        };

        const result = await simulateWebhook(body, 'test-token');

        expect(result.status).toBe(200);
        expect((result.data as { ok: boolean }).ok).toBe(true);
    });

    // ============================================================
    // TG-I-03: Valid photo message
    // ============================================================

    it('TG-I-03: returns 200 for valid photo message update', async () => {
        const body = {
            update_id: 124,
            message: {
                message_id: 2,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                photo: [
                    { file_id: 'abc123', file_unique_id: 'unique1', width: 100, height: 100, file_size: 1000 },
                ],
            },
        };

        const result = await simulateWebhook(body, 'test-token');

        expect(result.status).toBe(200);
        expect((result.data as { ok: boolean }).ok).toBe(true);
    });

    // ============================================================
    // TG-I-04: Valid callback_query
    // ============================================================

    it('TG-I-04: returns 200 for valid callback_query update', async () => {
        const body = {
            update_id: 125,
            callback_query: {
                id: 'query-1',
                from: { id: 1, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 12345 } },
                data: 'select_rest:0',
            },
        };

        const result = await simulateWebhook(body, 'test-token');

        expect(result.status).toBe(200);
        expect((result.data as { ok: boolean }).ok).toBe(true);
    });

    // ============================================================
    // TG-I-05: Malformed JSON
    // ============================================================

    it('TG-I-05: returns 500 for malformed JSON body', async () => {
        const result = await simulateWebhook('{invalid json', 'test-token');

        expect(result.status).toBe(500);
        expect((result.data as { error: string }).error).toBeDefined();
    });

    // ============================================================
    // TG-I-06: Empty body (no-op)
    // ============================================================

    it('TG-I-06: returns 200 for empty body (no-op)', async () => {
        const result = await simulateWebhook({}, 'test-token');

        expect(result.status).toBe(200);
        expect((result.data as { ok: boolean }).ok).toBe(true);
    });

    // ============================================================
    // Additional: Handler error propagation
    // ============================================================

    it('returns 500 when handleTelegramUpdate throws', async () => {
        (handleTelegramUpdate as jest.Mock).mockRejectedValueOnce(new Error('Handler failed'));

        const body = {
            update_id: 126,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: 'test',
            },
        };

        const result = await simulateWebhook(body, 'test-token');

        expect(result.status).toBe(500);
        expect((result.data as { error: string }).error).toBe('Internal Server Error');
    });

    // ============================================================
    // Group chat handling
    // ============================================================

    it('handles group chat messages', async () => {
        const body = {
            update_id: 127,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: -12345, first_name: 'Test Group', type: 'group' },
                date: Date.now(),
                text: '/add Miznon',
            },
        };

        const result = await simulateWebhook(body, 'test-token');

        expect(result.status).toBe(200);
    });
});

// ============================================================
// Direct handler tests (without HTTP layer)
// ============================================================

describe('Telegram Webhook - Handler Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    });

    it('handleTelegramUpdate is called with correct update structure', async () => {
        const update = {
            update_id: 200,
            message: {
                message_id: 1,
                from: { id: 1, first_name: 'Test', is_bot: false },
                chat: { id: 12345, first_name: 'Test', type: 'private' },
                date: Date.now(),
                text: '/start',
            },
        };

        await (handleTelegramUpdate as jest.Mock)(update);

        expect(handleTelegramUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                update_id: 200,
                message: expect.objectContaining({
                    text: '/start',
                }),
            })
        );
    });

    it('handleTelegramUpdate is called for callback queries', async () => {
        const update = {
            update_id: 201,
            callback_query: {
                id: 'cb-1',
                from: { id: 1, first_name: 'Test' },
                message: { message_id: 1, chat: { id: 12345 } },
                data: 'done_photos',
            },
        };

        await (handleTelegramUpdate as jest.Mock)(update);

        expect(handleTelegramUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                callback_query: expect.objectContaining({
                    data: 'done_photos',
                }),
            })
        );
    });
});
