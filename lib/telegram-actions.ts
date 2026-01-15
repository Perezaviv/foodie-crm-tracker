import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { getSession, updateSession, clearSession, TelegramStep, TelegramSession } from './telegram-session';
import { searchRestaurant, SearchResult, extractRestaurantInfo } from './ai';
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
                // Add restaurant and attach photos
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
        console.log('[TG] Sending photo confirmation, count:', count);
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
                await sendMessage(chatId, '👋 Welcome! I can help you add restaurants and photos.\n\n*Commands:*\n• `/add <name>` - Add a restaurant\n• `/rate <name> <1-5>` - Rate a restaurant\n• `/comment <name> - <text>` - Add a comment\n• Send photos to upload them\n\nIn groups, use commands if I don\'t respond to text.');
                return;
            }

            // /rate <restaurant name> <1-5>
            if (cmd === '/rate') {
                const ratingMatch = query.match(/^(.+?)\s+([1-5])$/);
                if (!ratingMatch) {
                    await sendMessage(chatId, '⚠️ Usage: `/rate Restaurant Name 5`\n\nExample: `/rate Miznon 4`');
                    return;
                }
                const restaurantName = ratingMatch[1].trim();
                const rating = parseInt(ratingMatch[2]);
                await handleRateRestaurant(chatId, restaurantName, rating);
                return;
            }

            // /comment <restaurant name> - <comment text>
            if (cmd === '/comment') {
                const commentMatch = query.match(/^(.+?)\s+-\s+(.+)$/);
                if (!commentMatch) {
                    await sendMessage(chatId, '⚠️ Usage: `/comment Restaurant Name - Your comment here`\n\nExample: `/comment Miznon - Amazing pita!`');
                    return;
                }
                const restaurantName = commentMatch[1].trim();
                const commentText = commentMatch[2].trim();
                await handleAddComment(chatId, restaurantName, commentText);
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
        await sendMessage(chatId, '❌ No restaurants found. Try a different name.');
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
            await addRestaurantToDb(chatId, enrichedResults[0]);
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
        searchResults: enrichedResults
    });

    await sendMessage(chatId, '🤔 internal I found multiple places. Please choose one:', {
        inline_keyboard: buttons
    });
}

async function addRestaurantToDb(chatId: number, data: SearchResult, silent = false) {
    const supabase = createAdminClient();

    // Debug logging removed for production
    // Check duplicates? (omitted for now, relying on user or DB constraints)

    // Derive city - prefer from data.city, then try to extract from address
    let derivedCity = data.city;
    if (!derivedCity && data.address) {
        if (data.address.toLowerCase().includes('tel aviv')) {
            derivedCity = 'Tel Aviv';
        } else {
            const parts = data.address.split(',');
            if (parts.length > 1) {
                derivedCity = parts[1].trim();
            }
        }
    }

    const insertPayload = {
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        booking_link: data.bookingLink,
        social_link: data.socialLink,
        cuisine: data.cuisine,
        rating: data.rating,
        is_visited: false,
        city: derivedCity,
        logo_url: data.logoUrl,
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

async function handleRateRestaurant(chatId: number, restaurantName: string, rating: number) {
    const supabase = createAdminClient();

    // Find restaurant by name (case-insensitive)
    const { data: restaurants, error: findError } = await supabase
        .from('restaurants')
        .select('id, name')
        .ilike('name', `%${restaurantName}%`)
        .limit(5);

    if (findError || !restaurants || restaurants.length === 0) {
        await sendMessage(chatId, `❌ Restaurant "${restaurantName}" not found. Please check the name and try again.`);
        return;
    }

    // If multiple matches, use the first one (closest match)
    const restaurant = restaurants[0];

    // Update rating
    const { error: updateError } = await supabase
        .from('restaurants')
        .update({ rating })
        .eq('id', restaurant.id);

    if (updateError) {
        await sendMessage(chatId, `❌ Failed to update rating: ${updateError.message}`);
        return;
    }

    const stars = '⭐'.repeat(rating);
    await sendMessage(chatId, `${stars}\n\n✅ Rated *${restaurant.name}* ${rating}/5!`);
}

async function handleAddComment(chatId: number, restaurantName: string, commentText: string) {
    const supabase = createAdminClient();

    // Find restaurant by name (case-insensitive)
    const { data: restaurants, error: findError } = await supabase
        .from('restaurants')
        .select('id, name')
        .ilike('name', `%${restaurantName}%`)
        .limit(5);

    if (findError || !restaurants || restaurants.length === 0) {
        await sendMessage(chatId, `❌ Restaurant "${restaurantName}" not found. Please check the name and try again.`);
        return;
    }

    const restaurant = restaurants[0];

    // Add comment
    const { error: insertError } = await supabase
        .from('comments')
        .insert({
            restaurant_id: restaurant.id,
            content: commentText,
            author_name: 'Telegram User',
        });

    if (insertError) {
        await sendMessage(chatId, `❌ Failed to add comment: ${insertError.message}`);
        return;
    }

    await sendMessage(chatId, `💬 Comment added to *${restaurant.name}*!\n\n"${commentText}"`);
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

async function sendMessage(chatId: number, text: string, replyMarkup?: TelegramReplyMarkup): Promise<void> {
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
