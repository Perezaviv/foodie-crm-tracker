import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { getSession, updateSession, clearSession, TelegramStep, TelegramSession } from './telegram-session';
import { searchRestaurant, SearchResult, extractRestaurantInfo } from './ai';

import { MESSAGES, MENU_KEYBOARD } from './telegram-messages';
import { 
    sendMessage, 
    answerCallbackQuery,
    addRestaurant, 
    processPhotos, 
    rateRestaurant, 
    addComment 
} from './skills/telegram';

// Get token at runtime to ensure env var is available in serverless
function getTelegramApiBase(): string {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }
    return `https://api.telegram.org/bot${token}`;
}

// ============================================================
// TYPES
// ============================================================

export interface ParsedRestaurant {
    name: string | null;
    city: string | null;
    notes: string | null;
}

export interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from: {
            id: number;
            first_name: string;
            is_bot: boolean;
        };
        chat: {
            id: number;
            first_name: string;
            type: string;
        };
        date: number;
        text?: string;
        photo?: Array<{
            file_id: string;
            file_unique_id: string;
            width: number;
            height: number;
            file_size: number;
        }>;
    };
    callback_query?: {
        id: string;
        from: {
            id: number;
            first_name: string;
        };
        message: {
            message_id: number;
            chat: {
                id: number;
            };
        };
        data: string;
    };
}

// ============================================================
// LOGIC
// ============================================================

export async function handleTelegramUpdate(update: TelegramUpdate) {
    console.log('[TG] handleTelegramUpdate called', {
        update_id: update.update_id,
        has_message: !!update.message,
        has_callback: !!update.callback_query,
    });

    if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
        return;
    }

    if (update.message) {
        await handleMessage(update.message);
        return;
    }
}

async function handleCallbackQuery(query: NonNullable<TelegramUpdate['callback_query']>) {
    const chatId = query.message.chat.id;
    const data = query.data;

    await answerCallbackQuery(query.id);

    // Handle menu buttons (no session required)
    if (data === 'menu_add') {
        await sendMessage({ chatId, text: MESSAGES.ADD_USAGE });
        return;
    }
    if (data === 'menu_rate') {
        await sendMessage({ chatId, text: MESSAGES.RATING_USAGE });
        return;
    }
    if (data === 'menu_comment') {
        await sendMessage({ chatId, text: MESSAGES.COMMENT_USAGE });
        return;
    }
    if (data === 'menu_photos') {
        await sendMessage({ chatId, text: MESSAGES.PHOTO_INSTRUCTION });
        return;
    }
    if (data === 'menu_help') {
        await sendMessage({ chatId, text: MESSAGES.WELCOME });
        return;
    }

    const session = await getSession(chatId);
    if (!session) {
        await sendMessage({ chatId, text: MESSAGES.SESSION_EXPIRED });
        return;
    }

    if (data === 'cancel') {
        await clearSession(chatId);
        await sendMessage({ chatId, text: MESSAGES.ACTION_CANCELLED });
        return;
    }

    if (data === 'done_photos') {
        await handleDonePhotos(chatId, session);
        return;
    }

    if (session.step === 'SELECTING_RESTAURANT') {
        if (data.startsWith('select_rest:')) {
            const index = parseInt(data.split(':')[1]);
            const results = session.metadata.searchResults as SearchResult[];
            if (results && results[index]) {
                const selected = results[index];
                await addRestaurant({ chatId, data: selected });
                await clearSession(chatId);
            } else {
                await sendMessage({ chatId, text: MESSAGES.SELECTION_INVALID });
            }
        }
    } else if (session.step === 'SELECTING_RESTAURANT_FOR_PHOTOS') {
        if (data.startsWith('select_rest:')) {
            const index = parseInt(data.split(':')[1]);
            const results = session.metadata.searchResults as SearchResult[];
            if (results && results[index]) {
                const selected = results[index];
                // Add restaurant and attach photos
                const result = await addRestaurant({ chatId, data: selected, silent: true });
                if (result.success && result.data?.restaurant) {
                    await processPhotos({ chatId, restaurantId: result.data.restaurant.id, fileIds: session.metadata.pending_photos || [] });
                    await clearSession(chatId);
                }
            }
        }
    }
}

async function handleMessage(message: NonNullable<TelegramUpdate['message']>) {
    const chatId = message.chat.id;
    const text = message.text || '';

    console.log('[TG] handleMessage called', {
        chatId,
        chatType: message.chat.type,
        hasPhoto: !!(message.photo),
        photoCount: message.photo?.length,
        hasText: !!text,
        textPreview: text.substring(0, 30),
    });

    let session = await getSession(chatId);

    // Auto-init session if missing
    if (!session) {
        // Just treat as clean state
    }

    // Handle Photos
    if (message.photo && message.photo.length > 0) {
        console.log('[TG] Photo received!', {
            chatId,
            photoCount: message.photo.length,
            fileId: message.photo[message.photo.length - 1].file_id.substring(0, 20) + '...'
        });

        try {
            // Telegram sends multiple sizes, take the last one (largest)
            const largestPhoto = message.photo[message.photo.length - 1];

            const currentPhotos = session?.metadata?.pending_photos || [];
            const newPhotos = [...currentPhotos, largestPhoto.file_id];

            // Update session
            console.log('[TG] Updating session with photos, count:', newPhotos.length);
            if (!session || session.step !== 'WAITING_FOR_PHOTOS') {
                await updateSession(chatId, 'WAITING_FOR_PHOTOS', { pending_photos: newPhotos });
            } else {
                await updateSession(chatId, 'WAITING_FOR_PHOTOS', { ...session.metadata, pending_photos: newPhotos });
            }

            const count = newPhotos.length;
            console.log('[TG] Sending photo confirmation, count:', count);
            await sendMessage({ 
                chatId, 
                text: MESSAGES.PHOTO_RECEIVED(count),
                replyMarkup: {
                    inline_keyboard: [[{ text: MESSAGES.BTN_DONE, callback_data: 'done_photos' }, { text: MESSAGES.BTN_CANCEL, callback_data: 'cancel' }]]
                }
            });
        } catch (error) {
            console.error('[TG] Error handling photo - Full details:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                chatId,
            });
            await sendMessage({ chatId, text: MESSAGES.PHOTO_ERROR });
        }
        return;
    }

    // Handle Text
    if (text) {
        // 1. Check for specific commands
        if (text.startsWith('/')) {
            const [cmd, ...args] = text.split(' ');
            const query = args.join(' ').trim();

            if (cmd === '/cancel') {
                await clearSession(chatId);
                await sendMessage(chatId, MESSAGES.SESSION_CLEARED);
                return;
            }

            if (cmd === '/add' || cmd === '/search') {
                if (!query) {
                    await sendMessage(chatId, MESSAGES.ADD_USAGE);
                    return;
                }
                await startSearch(chatId, query, 'SELECTING_RESTAURANT');
                return;
            }

            if (cmd === '/start' || cmd === '/menu') {
                await sendMessage(chatId, MESSAGES.MENU_HEADER, MENU_KEYBOARD);
                return;
            }

            // /rate <restaurant name> <1-5>
            if (cmd === '/rate') {
                const ratingMatch = query.match(/^(.+?)\s+([1-5])$/);
                if (!ratingMatch) {
                    await sendMessage(chatId, MESSAGES.RATING_USAGE);
                    return;
                }
                const restaurantName = ratingMatch[1].trim();
                const rating = parseInt(ratingMatch[2]);
                await rateRestaurant({ chatId, restaurantName, rating });
                return;
            }

            // /comment <restaurant name> - <comment text>
            if (cmd === '/comment') {
                // Allow normal dash (-), en-dash (–), em-dash (—) and flexible spacing
                const commentMatch = query.match(/^(.+?)\s*[-–—]\s*(.+)$/);
                if (!commentMatch) {
                    await sendMessage(chatId, MESSAGES.COMMENT_USAGE);
                    return;
                }
                const restaurantName = commentMatch[1].trim();
                const commentText = commentMatch[2].trim();
                await addComment({ chatId, restaurantName, commentText });
                return;
            }
        }

        // 2. Handle State-Dependent logic

        // If WAITING_FOR_PHOTOS but got text (and not /cancel)
        if (session?.step === 'WAITING_FOR_PHOTOS') {
            if (text.toLowerCase() === 'done') {
                await handleDonePhotos(chatId, session!); // Session exists if we are in this step
                return;
            }
            // Assume it's the name
            await handleDonePhotos(chatId, session!, text); // Pass text as query
            return;
        }

        if (session?.step === 'SELECTING_RESTAURANT' || session?.step === 'SELECTING_RESTAURANT_FOR_PHOTOS') {
            // New search query
            await startSearch(chatId, text, session.step);
            return;
        }

        // 3. Default: IDLE -> Search & Add
        // NOTE: In group chats with privacy mode ON, we might not get here unless mentioned or replying.
        // Wrap startSearch in try/catch to handle admin client errors (missing env vars)
        try {
            await startSearch(chatId, text, 'SELECTING_RESTAURANT');
        } catch (err: any) {
            console.error('[TG] Search failed:', err);
            if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
                await sendMessage(chatId, '⚠️ **System Error**: `SUPABASE_SERVICE_ROLE_KEY` is not configured on the server. I cannot save data without it.');
            } else {
                await sendMessage(chatId, MESSAGES.ERROR_GENERIC);
            }
        }
    }
}

async function handleDonePhotos(chatId: number, session: TelegramSession, queryOverride?: string) {
    // If we have a query (user typed name), search immediately
    if (queryOverride) {
        await startSearch(chatId, queryOverride, 'SELECTING_RESTAURANT_FOR_PHOTOS');
        return;
    }

    await updateSession(chatId, 'SELECTING_RESTAURANT_FOR_PHOTOS', session.metadata);
    await sendMessage(chatId, MESSAGES.WHICH_RESTAURANT);
}

async function startSearch(chatId: number, text: string, nextStep: TelegramStep) {
    await sendMessage({ chatId, text: MESSAGES.SEARCHING });

    // 1. AI Extraction (Gemini)
    const parseResult = await extractRestaurantInfo(text);
    let queryName = text;
    let city: string | undefined = undefined;

    if (parseResult.success && parseResult.data) {
        queryName = parseResult.data.name;
        city = parseResult.data.city || undefined;
    } else {
        // Fallback to simple parse
        const parsed = parseRestaurantMessage(text);
        queryName = parsed.name || text;
        city = parsed.city || undefined;
    }

    const result = await searchRestaurant(queryName, city);

    if (!result.success || result.results.length === 0) {
        await sendMessage({ chatId, text: MESSAGES.NO_RESULTS });
        return;
    }

    // Merge AI extracted info into results if missing
    const enrichedResults = result.results.map(r => ({
        ...r,
        socialLink: r.socialLink || (parseResult.data?.socialLink),
        cuisine: r.cuisine || (parseResult.data?.cuisine),
    }));

    // If exactly 1 match
    if (result.results.length === 1) {
        if (nextStep === 'SELECTING_RESTAURANT') {
            // Auto-add
            await addRestaurant({ chatId, data: enrichedResults[0] });
            // Don't clear session if we want to allow immediate photo upload? 
            // But usually we clear. User can start sending photos now.
            await clearSession(chatId);
        } else {
            // For photos, we need confirmation or just do it?
            // Let's ask to be safe or just do it.
            // "Found X. Attaching photos..."
            const restaurant = await addRestaurantToDb(chatId, enrichedResults[0], true);
            if (restaurant) {
                const session = await getSession(chatId);
                await processPendingPhotos(chatId, restaurant.id, session?.metadata?.pending_photos || []);
                await clearSession(chatId);
            }
        }
        return;
    }

    // Multiple matches
    const buttons = result.results.map((r, i) => ([{
        text: `${r.name} (${r.address || MESSAGES.NO_ADDRESS})`,
        callback_data: `select_rest:${i}`
    }]));

    buttons.push([{ text: MESSAGES.BTN_CANCEL, callback_data: 'cancel' }]);

    // Save results to session
    // Preserve pending photos if any
    const session = await getSession(chatId);
    const blankMeta = session?.metadata || {};

    await updateSession(chatId, nextStep, {
        ...blankMeta,
        searchResults: enrichedResults
    });

    await sendMessage(chatId, MESSAGES.MULTIPLE_RESULTS, {
        inline_keyboard: buttons
    });
}



// ============================================================
// HELPERS
// ============================================================

export function parseRestaurantMessage(text: string): ParsedRestaurant {
    const trimmed = text.trim();
    let mainPart = trimmed;
    let notes: string | null = null;
    const dashIndex = trimmed.indexOf(' - ');
    if (dashIndex !== -1) {
        mainPart = trimmed.substring(0, dashIndex).trim();
        notes = trimmed.substring(dashIndex + 3).trim();
    }
    let name = mainPart;
    let city: string | null = null;
    const commaIndex = mainPart.indexOf(',');
    if (commaIndex !== -1) {
        name = mainPart.substring(0, commaIndex).trim();
        city = mainPart.substring(commaIndex + 1).trim();
    }
    return { name: name || null, city: city || null, notes: notes || null };
}

/** Telegram inline keyboard markup structure */
interface TelegramReplyMarkup {
    inline_keyboard: Array<Array<{
        text: string;
        callback_data?: string;
        url?: string;
    }>>;
}


