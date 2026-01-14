import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { getSession, updateSession, clearSession, TelegramStep, TelegramSession } from './telegram-session';
import { searchRestaurant, SearchResult } from './ai';
import { createAdminClient } from './supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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

    const session = await getSession(chatId);
    if (!session) {
        await sendMessage(chatId, '⚠️ Session expired. Please start over.');
        return;
    }

    if (data === 'cancel') {
        await clearSession(chatId);
        await sendMessage(chatId, '❌ Action cancelled.');
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
                await addRestaurantToDb(chatId, selected);
                await clearSession(chatId);
            } else {
                await sendMessage(chatId, '❌ Error: Selection invalid.');
            }
        }
    } else if (session.step === 'SELECTING_RESTAURANT_FOR_PHOTOS') {
        if (data.startsWith('select_rest:')) {
            const index = parseInt(data.split(':')[1]);
            const results = session.metadata.searchResults as SearchResult[];
            if (results && results[index]) {
                const selected = results[index];
                // Now we need to save the restaurant first (if it's not just a reference, but searchResult usually implies a new one? 
                // Ah, if we searched, it returned *search results* from Tavily. 
                // Wait, if we are attaching photos to an EXISTING restaurant, we should probably search our DB first?
                // The user said "address it to the correct restaurant". This implies selecting one.
                // For simplicity, let's assume we search Tavily and "Add" it if it's new, or if we had a way to search existing DB. 
                // Given the prompt "same logic as in the app", in the app we search Tavily. 
                // So if we pick a result, we create it (or find duplicate matches). 
                // Let's create it, get the ID, then attach photos.

                // Note: Ideally check for duplicates. addRestaurantToDb does an insert. 
                // We'll proceed with add-then-attach.

                const restaurant = await addRestaurantToDb(chatId, selected, true); // true = silent, don't clear session yet
                if (restaurant) {
                    await processPendingPhotos(chatId, restaurant.id, session.metadata.pending_photos || []);
                    await clearSession(chatId);
                }
            }
        }
    }
}

async function handleMessage(message: NonNullable<TelegramUpdate['message']>) {
    const chatId = message.chat.id;
    const text = message.text || '';

    console.log(`[Telegram] Processing message from ${chatId}: ${text.substring(0, 50)}... Step: ${(await getSession(chatId))?.step}`);

    let session = await getSession(chatId);

    // Auto-init session if missing
    if (!session) {
        // Just treat as clean state
    }

    // Handle Photos
    if (message.photo && message.photo.length > 0) {
        // Telegram sends multiple sizes, take the last one (largest)
        const largestPhoto = message.photo[message.photo.length - 1];

        const currentPhotos = session?.metadata?.pending_photos || [];
        const newPhotos = [...currentPhotos, largestPhoto.file_id];

        // Update session
        if (!session || session.step !== 'WAITING_FOR_PHOTOS') {
            await updateSession(chatId, 'WAITING_FOR_PHOTOS', { pending_photos: newPhotos });
        } else {
            await updateSession(chatId, 'WAITING_FOR_PHOTOS', { ...session.metadata, pending_photos: newPhotos });
        }

        const count = newPhotos.length;
        await sendMessage(chatId, `📸 Received ${count} photo${count > 1 ? 's' : ''}.\nPlease enter only the restaurant name :`, {
            inline_keyboard: [[{ text: '✅ Done', callback_data: 'done_photos' }, { text: '❌ Cancel', callback_data: 'cancel' }]]
        });
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
                await sendMessage(chatId, '✅ Session cleared.\n\nExamples:\n• `/add Miznon` (Search & Add)\n• Send Photos (Upload)');
                return;
            }

            if (cmd === '/add' || cmd === '/search') {
                if (!query) {
                    await sendMessage(chatId, '⚠️ Please provide a restaurant name. Example: `/add Burger King`');
                    return;
                }
                await startSearch(chatId, query, 'SELECTING_RESTAURANT');
                return;
            }

            if (cmd === '/start') {
                await sendMessage(chatId, '👋 Welcome! I can help you add restaurants and photos.\n\nType a restaurant name or send photos to start.\n\nIn groups, use `/add <name>` if I don\'t respond to text.');
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
        await startSearch(chatId, text, 'SELECTING_RESTAURANT');
    }
}

async function handleDonePhotos(chatId: number, session: TelegramSession, queryOverride?: string) {
    // If we have a query (user typed name), search immediately
    if (queryOverride) {
        await startSearch(chatId, queryOverride, 'SELECTING_RESTAURANT_FOR_PHOTOS');
        return;
    }

    await updateSession(chatId, 'SELECTING_RESTAURANT_FOR_PHOTOS', session.metadata);
    await sendMessage(chatId, '🏢 To which restaurant do these photos belong? Please type the name.');
}

async function startSearch(chatId: number, text: string, nextStep: TelegramStep) {
    await sendMessage(chatId, '🔎 Searching...');

    // Parse name/city
    const parsed = parseRestaurantMessage(text);
    const queryName = parsed.name || text;

    const result = await searchRestaurant(queryName, parsed.city || undefined);

    if (!result.success || result.results.length === 0) {
        await sendMessage(chatId, '❌ No restaurants found. Try a different name.');
        return;
    }

    // If exactly 1 match
    if (result.results.length === 1) {
        if (nextStep === 'SELECTING_RESTAURANT') {
            // Auto-add
            await addRestaurantToDb(chatId, result.results[0]);
            // Don't clear session if we want to allow immediate photo upload? 
            // But usually we clear. User can start sending photos now.
            await clearSession(chatId);
        } else {
            // For photos, we need confirmation or just do it?
            // Let's ask to be safe or just do it.
            // "Found X. Attaching photos..."
            const restaurant = await addRestaurantToDb(chatId, result.results[0], true);
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
        text: `${r.name} (${r.address || 'No Address'})`,
        callback_data: `select_rest:${i}`
    }]));

    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    // Save results to session
    // Preserve pending photos if any
    const session = await getSession(chatId);
    const blankMeta = session?.metadata || {};

    await updateSession(chatId, nextStep, {
        ...blankMeta,
        searchResults: result.results
    });

    await sendMessage(chatId, '🤔 internal I found multiple places. Please choose one:', {
        inline_keyboard: buttons
    });
}

async function addRestaurantToDb(chatId: number, data: SearchResult, silent = false) {
    const supabase = createAdminClient();

    // Check duplicates? (omitted for now, relying on user or DB constraints)

    const insertPayload = {
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        booking_link: data.bookingLink,
        rating: data.rating,
        is_visited: false,
        city: undefined // We could try to extract city from address if needed
    };

    const { data: rest, error } = await supabase
        .from('restaurants')
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        await sendMessage(chatId, `❌ Error saving: ${error.message}`);
        return null;
    }

    if (!silent) {
        let msg = `✅ Added *${rest.name}*`;
        if (rest.address) msg += `\n📍 ${rest.address}`;
        if (rest.booking_link) msg += `\n🔗 [Book Table](${rest.booking_link})`;
        await sendMessage(chatId, msg);
    }

    return rest;
}

async function processPendingPhotos(chatId: number, restaurantId: string, fileIds: string[]) {
    if (!fileIds || fileIds.length === 0) return;

    let successCount = 0;
    const supabase = createAdminClient();

    await sendMessage(chatId, `⏳ Processing ${fileIds.length} photos...`);

    for (const fileId of fileIds) {
        // 1. Get File Path
        try {
            const fileRes = await fetch(`${TELEGRAM_API_BASE}/getFile?file_id=${fileId}`);
            const fileJson = await fileRes.json();
            if (!fileJson.ok) continue;

            const filePath = fileJson.result.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

            // 2. Download
            const imageRes = await fetch(downloadUrl);
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 3. Upload to Supabase
            const ext = filePath.split('.').pop() || 'jpg';
            const storagePath = `restaurants/${restaurantId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('photos')
                .upload(storagePath, buffer, { contentType: 'image/jpeg' });

            if (uploadError) {
                console.error('Upload failed', uploadError);
                continue;
            }

            // 4. Create DB Record
            await supabase.from('photos').insert({
                restaurant_id: restaurantId,
                storage_path: storagePath
            });

            successCount++;

        } catch (e) {
            console.error('Photo processing error', e);
        }
    }

    await sendMessage(chatId, `✅ Successfully added ${successCount} photos!`);
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

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
    try {
        await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
            }),
        });
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}

async function answerCallbackQuery(callbackQueryId: string) {
    try {
        await fetch(`${TELEGRAM_API_BASE}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId }),
        });
    } catch (e) { console.error('Error answering callback', e); }
}
