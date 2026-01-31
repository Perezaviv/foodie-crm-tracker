import { createAdminClient } from './supabase';
import { SearchResult } from './ai';
import { Json } from './types';

export type TelegramStep =
    | 'IDLE'
    | 'SELECTING_RESTAURANT'
    | 'SELECTING_RESTAURANT_FOR_PHOTOS'
    | 'WAITING_FOR_PHOTOS'
    | 'REVIEWING_PHOTOS'
    | 'WAITING_FOR_RATE'
    | 'WAITING_FOR_COMMENT';

/** Metadata stored in Telegram session */
export interface TelegramSessionMetadata {
    pending_photos?: string[];
    searchResults?: SearchResult[];
    [key: string]: unknown; // Allow additional properties for flexibility
}

export interface TelegramSession {
    chat_id: number;
    step: TelegramStep;
    metadata: TelegramSessionMetadata;
    updated_at: string;
}

export async function getSession(chatId: number): Promise<TelegramSession | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('telegram_sessions')
        .select('*')
        .eq('chat_id', chatId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching telegram session:', error);
        return null;
    }

    return data as TelegramSession;
}

export async function updateSession(
    chatId: number,
    step: TelegramStep,
    metadata: TelegramSessionMetadata = {}
): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('telegram_sessions')
        .upsert({
            chat_id: chatId,
            step,
            metadata: metadata as Json
        });

    if (error) {
        console.error('Error updating telegram session:', error);
        throw error;
    }
}

export async function clearSession(chatId: number): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('telegram_sessions')
        .update({
            step: 'IDLE',
            metadata: {}
        })
        .eq('chat_id', chatId);

    if (error) {
        console.error('Error clearing telegram session:', error);
    }
}
