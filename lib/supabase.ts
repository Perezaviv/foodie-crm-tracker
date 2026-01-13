import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Client-side Supabase client (singleton)
let clientInstance: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    }

    if (!clientInstance) {
        clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey)
    }
    return clientInstance
}

// Server-side client for API routes (new instance each time)
export function createServerClient(): SupabaseClient<Database> {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are not configured')
    }

    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    })
}

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey)
}
