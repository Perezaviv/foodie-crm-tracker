/* eslint-disable @typescript-eslint/no-require-imports */
import '@supabase/supabase-js'; // Keep for types if needed, or remove if unused. createClient was unused.

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

    it('throws error if environment variables are missing', () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // We need to require the module here to trigger the top-level code or the function call depending on implementation
        // But verify the function call throws
        const { getSupabaseClient } = require('../../lib/supabase');
        expect(() => getSupabaseClient()).toThrow('Supabase environment variables are not configured');
    });

    it('creates client with correct credentials', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

        const { getSupabaseClient } = require('../../lib/supabase');
        const { createClient } = require('@supabase/supabase-js');

        getSupabaseClient();

        expect(createClient).toHaveBeenCalledWith(
            'http://test.supabase.co',
            'test-anon-key'
        );
    });

    it('isSupabaseConfigured returns correct status', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // We must re-require to pick up the top-level constants changes? 
        // Wait, lib/supabase reads env vars at top level.
        // So modifying process.env and re-requiring IS necessary.
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
