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
// MAIN SKILL FUNCTION
// =============================================================================

/**
 * Get a Supabase client based on the context type.
 * Returns a standardized Skill output.
 */
export function getSupabaseClient(input: SupabaseClientInput): SupabaseClientOutput {
    try {
        let client: SupabaseClient<Database>;
        switch (input.type) {
            case 'browser':
                client = createBrowserClient();
                break;
            case 'server':
                client = createServerClient();
                break;
            case 'admin':
                client = createAdminClient();
                break;
            default:
                throw new Error(`Unknown client type: ${input.type}`);
        }
        return { success: true, client };
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
// CLASSIC CLIENT FACTORIES (Direct usage)
// =============================================================================

/**
 * Browser-side client (singleton). Throws if misconfigured.
 */
export function createBrowserClient(): SupabaseClient<Database> {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    }

    if (!browserClientInstance) {
        browserClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
    }

    return browserClientInstance;
}

/**
 * Server-side client (new instance). Throws if misconfigured.
 */
export function createServerClient(): SupabaseClient<Database> {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are not configured');
    }

    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    });
}

/**
 * Admin client bypassing RLS. Throws if misconfigured.
 */
export function createAdminClient(): SupabaseClient<Database> {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. The Telegram bot requires this environment variable to function.');
    }

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}
