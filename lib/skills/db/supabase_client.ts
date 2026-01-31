/**
 * Skill: SupabaseClient
 * @owner AGENT-4
 * @status READY
 * @created 2026-01-31
 * @dependencies none
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface SupabaseClientInput {
    type: 'browser' | 'server' | 'admin';
}

export interface SupabaseClientOutput {
    success: boolean;
    client?: SupabaseClient<Database>;
    error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton for browser client
let browserClientInstance: SupabaseClient<Database> | null = null;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get a Supabase client based on the context type.
 * 
 * @example
 * // Browser/client-side usage (singleton)
 * const { client } = getSupabaseClient({ type: 'browser' });
 * 
 * // Server API route (new instance each call)
 * const { client } = getSupabaseClient({ type: 'server' });
 * 
 * // Admin operations bypassing RLS
 * const { client } = getSupabaseClient({ type: 'admin' });
 */
export function getSupabaseClient(input: SupabaseClientInput): SupabaseClientOutput {
    try {
        switch (input.type) {
            case 'browser':
                return createBrowserClient();
            case 'server':
                return createServerClient();
            case 'admin':
                return createAdminClient();
            default:
                return { success: false, error: `Unknown client type: ${input.type}` };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error creating Supabase client',
        };
    }
}

/**
 * Check if Supabase is properly configured with required env vars.
 */
export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

// =============================================================================
// INTERNAL HELPERS / EXPORTS
// =============================================================================

export function createBrowserClient(): SupabaseClientOutput {
    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            success: false,
            error: 'Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
        };
    }

    if (!browserClientInstance) {
        browserClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
    }

    return { success: true, client: browserClientInstance };
}

export function createServerClient(): SupabaseClientOutput {
    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            success: false,
            error: 'Supabase environment variables are not configured',
        };
    }

    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    });

    return { success: true, client };
}

export function createAdminClient(): SupabaseClientOutput {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return {
            success: false,
            error: 'SUPABASE_SERVICE_ROLE_KEY is not set. The Telegram bot requires this environment variable to function.',
        };
    }

    const client = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    return { success: true, client };
}
