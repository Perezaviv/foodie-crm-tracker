
import { handleTelegramUpdate, parseRestaurantMessage } from '@/lib/telegram-actions';
import { getSession, updateSession, clearSession } from '@/lib/telegram-session';
import { searchRestaurant } from '@/lib/ai';

// Mocks
jest.mock('@/lib/telegram-session', () => ({
    getSession: jest.fn(),
    updateSession: jest.fn(),
    clearSession: jest.fn(),
}));

jest.mock('@/lib/ai', () => ({
    searchRestaurant: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
    createAdminClient: jest.fn(() => ({
        from: jest.fn(() => ({
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: jest.fn(() => ({ data: { id: '123', name: 'Test' }, error: null })),
                })),
            })),
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
        json: () => Promise.resolve({ ok: true, result: {} }),
    })
) as jest.Mock;

describe('Telegram Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('parseRestaurantMessage', () => {
        it('parses name only', () => {
            const result = parseRestaurantMessage('Miznon');
            expect(result).toEqual({ name: 'Miznon', city: null, notes: null });
        });

        it('parses name and city', () => {
            const result = parseRestaurantMessage('Miznon, Tel Aviv');
            expect(result).toEqual({ name: 'Miznon', city: 'Tel Aviv', notes: null });
        });

        it('parses name, city and notes', () => {
            const result = parseRestaurantMessage('Miznon, Tel Aviv - great pita');
            expect(result).toEqual({ name: 'Miznon', city: 'Tel Aviv', notes: 'great pita' });
        });
    });

    // We can add more tests for flow logic, but mocking the entire state machine is complex.
    // This confirms the parsing logic works and imports are correct.
});
