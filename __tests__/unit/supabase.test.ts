/* eslint-disable @typescript-eslint/no-require-imports */
import '@supabase/supabase-js'; // Keep for types if needed

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

describe('lib/supabase', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules(); // clears the cache of the module
        process.env = { ...ORIGINAL_ENV };
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it('createBrowserClient throws error if environment variables are missing', () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const { createBrowserClient } = require('../../lib/supabase');
        expect(() => createBrowserClient()).toThrow('Supabase environment variables are not configured');
    });

    it('createBrowserClient creates client with correct credentials', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

        const { createBrowserClient } = require('../../lib/supabase');
        const { createClient } = require('@supabase/supabase-js');

        createBrowserClient();

        expect(createClient).toHaveBeenCalledWith(
            'http://test.supabase.co',
            'test-anon-key'
        );
    });

    it('isSupabaseConfigured returns correct status', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        let { isSupabaseConfigured } = require('../../lib/supabase');
        expect(isSupabaseConfigured()).toBe(false);

        jest.resetModules();
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key';
        ({ isSupabaseConfigured } = require('../../lib/supabase'));
        expect(isSupabaseConfigured()).toBe(true);
    });

    it('createServerClient passes correct options', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

        const { createServerClient } = require('../../lib/supabase');
        const { createClient } = require('@supabase/supabase-js');

        createServerClient();

        expect(createClient).toHaveBeenCalledWith(
            'http://test.supabase.co',
            'test-anon-key',
            expect.objectContaining({
                auth: {
                    persistSession: false,
                }
            })
        );
    });
});
