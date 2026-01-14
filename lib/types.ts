// Supabase Database Types
// This file provides type hints for the Supabase client
// For full type safety, generate types using: npx supabase gen types typescript

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            restaurants: {
                Row: {
                    id: string
                    name: string
                    cuisine: string | null
                    city: string | null
                    address: string | null
                    lat: number | null
                    lng: number | null
                    booking_link: string | null
                    social_link: string | null
                    notes: string | null
                    is_visited: boolean
                    rating: number | null
                    created_at: string
                    updated_at: string
                    created_by: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    cuisine?: string | null
                    city?: string | null
                    address?: string | null
                    lat?: number | null
                    lng?: number | null
                    booking_link?: string | null
                    social_link?: string | null
                    notes?: string | null
                    is_visited?: boolean
                    rating?: number | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    cuisine?: string | null
                    city?: string | null
                    address?: string | null
                    lat?: number | null
                    lng?: number | null
                    booking_link?: string | null
                    social_link?: string | null
                    notes?: string | null
                    is_visited?: boolean
                    rating?: number | null
                    created_at?: string
                    updated_at?: string
                    created_by?: string | null
                }
                Relationships: []
            }
            photos: {
                Row: {
                    id: string
                    restaurant_id: string
                    storage_path: string
                    caption: string | null
                    taken_at: string | null
                    uploaded_at: string
                    uploaded_by: string | null
                }
                Insert: {
                    id?: string
                    restaurant_id: string
                    storage_path: string
                    caption?: string | null
                    taken_at?: string | null
                    uploaded_at?: string
                    uploaded_by?: string | null
                }
                Update: {
                    id?: string
                    restaurant_id?: string
                    storage_path?: string
                    caption?: string | null
                    taken_at?: string | null
                    uploaded_at?: string
                    uploaded_by?: string | null
                }
                Relationships: []
            }
            telegram_sessions: {
                Row: {
                    chat_id: number
                    step: string
                    metadata: Json
                    updated_at: string
                }
                Insert: {
                    chat_id: number
                    step?: string
                    metadata?: Json
                    updated_at?: string
                }
                Update: {
                    chat_id?: number
                    step?: string
                    metadata?: Json
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']

export type RestaurantInsert = Database['public']['Tables']['restaurants']['Insert']
export type RestaurantUpdate = Database['public']['Tables']['restaurants']['Update']
