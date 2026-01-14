/**
 * Telegram Bot Poller for Burnt On Food
 * 
 * This script connects to Telegram via long polling and listens for messages.
 * When a user sends a message, it parses the content, SEARCHES for the restaurant
 * using Tavily (for address/website) and Google Maps (for geocoding),
 * and adds a rich restaurant entry to the Supabase database.
 * 
 * Usage: node execution/telegram_poller.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
// Node 18+ has native fetch, but we handle older envs just in case or use global
const fetchFn = global.fetch || require('node-fetch');

// ============================================================
// CONFIGURATION
// ============================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Validate environment variables
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase environment variables are not set in .env');
    process.exit(1);
}

if (!TAVILY_API_KEY) {
    console.warn('⚠️ TAVILY_API_KEY not set. Smart search will be disabled.');
}

// ============================================================
// INITIALIZE CLIENTS
// ============================================================

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// HELPERS (Address Cleaning)
// ============================================================

/**
 * Clean a noisy address for geocoding
 * Mirror of lib/geocoding.ts
 */
function cleanAddressForGeocoding(address, city) {
    if (!address) return null;

    // Remove newlines and extra whitespace
    let cleaned = address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove common noise patterns
    const noisePhrases = [
        /\.\s*(To book|It is known|It is currently|Book a table|Booking|Instagram|Call|Phone|Map)/i,
        /\.\s*[A-Z]/,  // Any sentence after first (starts with capital letter)
    ];
    for (const pattern of noisePhrases) {
        const match = cleaned.match(pattern);
        if (match && match.index) {
            cleaned = cleaned.substring(0, match.index).trim();
        }
    }

    // Remove trailing period
    cleaned = cleaned.replace(/\.$/, '').trim();

    // If no city in address and city is provided, append it
    if (city) {
        const lowerCleaned = cleaned.toLowerCase();
        if (!lowerCleaned.includes(city.toLowerCase()) && !lowerCleaned.includes('tel aviv')) {
            cleaned = `${cleaned}, ${city}`;
        }
    }

    // Add Israel for better geocoding accuracy
    if (!cleaned.toLowerCase().includes('israel')) {
        cleaned = `${cleaned}, Israel`;
    }

    return cleaned;
}

async function geocodeAddress(address) {
    if (!GOOGLE_MAPS_API_KEY) return null;

    try {
        const encoded = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetchFn(url);

        if (!response.ok) return null;

        const data = await response.json();

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            return null;
        }

        const location = data.results[0].geometry.location;
        return {
            lat: location.lat,
            lng: location.lng,
        };
    } catch (error) {
        console.error('[Geocode] Error:', error);
        return null;
    }
}

function isBookingPlatform(url) {
    const bookingDomains = [
        'tabit.cloud', 'tabitisrael.co.il', 'ontopo.co.il', 'ontopo.com',
        'opentable.com', 'resy.com', 'sevenrooms.com', 'yelp.com/reservations'
    ];
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return bookingDomains.some(domain => hostname.includes(domain));
    } catch (e) { return false; }
}

function isGenericBookingLink(url) {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname.toLowerCase();
        if (path === '/' || path === '') return true;
        const pathSegments = path.split('/').filter(Boolean);
        if (pathSegments.length <= 1) return true;
        if (path.includes('/tel-aviv') && pathSegments.length <= 3 && !url.includes('restaurant')) return true;
        return false;
    } catch (e) { return true; }
}

function getLinkScore(link, name) {
    let score = 0;
    const lowerLink = link.toLowerCase();
    if (lowerLink.includes('tabit.cloud')) score += 10;
    else if (lowerLink.includes('ontopo')) score += 8;
    else score += 1;

    const simpleName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (simpleName.length > 3 && lowerLink.replace(/[^a-z0-9]/g, '').includes(simpleName)) {
        score += 5;
    }
    return score;
}

function selectBestBookingLink(links, restaurantName) {
    if (links.length === 0) return undefined;
    const uniqueLinks = Array.from(new Set(links));
    return uniqueLinks.sort((a, b) => {
        return getLinkScore(b, restaurantName) - getLinkScore(a, restaurantName);
    })[0];
}

function parseSearchResults(data, restaurantName) {
    let bestAddress;
    const bookingLinks = [];

    if (data.answer) {
        const addressMatch = data.answer.match(/(?:located at|address[:\s]+)([^,\n]+(?:,[^,\n]+)?)/i);
        if (addressMatch) bestAddress = addressMatch[1].trim();
    }

    for (const result of data.results || []) {
        const url = result.url;
        const content = result.content || '';

        if (isBookingPlatform(url) && !isGenericBookingLink(url)) {
            bookingLinks.push(url);
        }

        const tabitMatch = content.match(/https:\/\/(?:www\.)?(?:tabit\.cloud|tabitisrael\.co\.il)\/[^\s"']+/g);
        if (tabitMatch) {
            tabitMatch.forEach(link => {
                const cleanLink = link.replace(/[.,)]+$/, '');
                if (!isGenericBookingLink(cleanLink)) bookingLinks.push(cleanLink);
            });
        }

        if (!bestAddress) {
            const addressPatterns = [
                /(\d+\s+[A-Za-z\u0590-\u05FF]+\s+(?:Street|St|Road|Rd|Ave|Avenue|Blvd|Boulevard)[^,]*(?:,\s*[A-Za-z\u0590-\u05FF\s]+)?)/i,
                /(?:רחוב|רח')\s+([^\d,]+\s*\d+[^,]*)/,
            ];
            for (const pattern of addressPatterns) {
                const match = content.match(pattern);
                if (match) {
                    bestAddress = match[1].trim();
                    break;
                }
            }
        }
    }

    return {
        address: bestAddress,
        bookingLink: selectBestBookingLink(bookingLinks, restaurantName),
        found: !!(bestAddress || bookingLinks.length > 0)
    };
}

async function searchRestaurant(name, city) {
    if (!TAVILY_API_KEY) return { found: false };

    try {
        const query = city
            ? `${name} restaurant ${city} address booking tabit`
            : `${name} restaurant Israel address booking tabit`;

        console.log(`🔎 Searching Tavily for: "${query}"`);

        const response = await fetchFn('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query,
                search_depth: 'advanced',
                include_answer: true,
                max_results: 5,
            }),
        });

        if (!response.ok) throw new Error(`Tavily API error: ${response.status}`);
        const data = await response.json();
        return parseSearchResults(data, name);

    } catch (error) {
        console.error('Error searching:', error);
        return { found: false };
    }
}

// ============================================================
// STATE MANAGEMENT (Pending Photos)
// ============================================================

const userSessions = {}; // { chatId: { photos: [], timestamp: number, timeout: NodeJS.Timeout } }

function addPendingPhoto(chatId, fileId, caption) {
    let session = userSessions[chatId];

    // Check expiry (10 mins)
    if (session && (Date.now() - session.timestamp > 10 * 60 * 1000)) {
        if (session.timeout) clearTimeout(session.timeout);
        session = null; // Expired, start fresh
    }

    if (!session) {
        session = { photos: [], timestamp: Date.now(), timeout: null };
    }

    session.photos.push({ fileId, caption });
    session.timestamp = Date.now(); // Reset timer

    // Clear existing timeout if new photo arrives (debounce)
    if (session.timeout) {
        clearTimeout(session.timeout);
        session.timeout = null;
    }

    userSessions[chatId] = session;
    return session;
}

function getPendingPhotos(chatId) {
    const session = userSessions[chatId];
    if (!session) return [];

    if (Date.now() - session.timestamp > 10 * 60 * 1000) {
        delete userSessions[chatId];
        return [];
    }

    return session.photos;
}

function clearPendingPhotos(chatId) {
    const session = userSessions[chatId];
    if (session && session.timeout) clearTimeout(session.timeout);
    delete userSessions[chatId];
}

async function uploadPhotosForRestaurant(chatId, restaurantId, supabase) {
    const photos = getPendingPhotos(chatId);
    if (photos.length === 0) return 0;

    console.log(`📸 Uploading ${photos.length} photos for ${restaurantId}...`);
    let successCount = 0;

    for (const p of photos) {
        try {
            const fileLink = await bot.telegram.getFileLink(p.fileId);
            const res = await fetchFn(fileLink);
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const fileName = `${restaurantId}/${Date.now()}_${p.fileId}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('photos') // Changed from 'restaurant-photos' to 'photos'
                .upload(fileName, buffer, { contentType: 'image/jpeg' });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                await bot.telegram.sendMessage(chatId, `❌ Failed to upload photo: ${uploadError.message}`);
                continue;
            }

            const { error: dbError } = await supabase
                .from('photos')
                .insert({
                    restaurant_id: restaurantId,
                    storage_path: fileName, // Changed from 'url' to 'storage_path'
                    caption: p.caption || ''
                });

            if (!dbError) {
                successCount++;
            } else {
                console.error('DB Insert Error:', dbError);
                await bot.telegram.sendMessage(chatId, `❌ DB Error: ${dbError.message}`);
            }
        } catch (e) {
            console.error('Photo processing error:', e);
            try {
                await bot.telegram.sendMessage(chatId, `❌ Error processing photo: ${e.message}`);
            } catch (ignore) { }
        }
    }

    clearPendingPhotos(chatId);
    return successCount;
}

// ============================================================
// MAIN LOGIC
// ============================================================

function parseRestaurantMessage(text) {
    const trimmed = text.trim();
    let mainPart = trimmed;
    let notes = null;
    const dashIndex = trimmed.indexOf(' - ');
    if (dashIndex !== -1) {
        mainPart = trimmed.substring(0, dashIndex).trim();
        notes = trimmed.substring(dashIndex + 3).trim();
    }
    let name = mainPart;
    let city = null;
    const commaIndex = mainPart.indexOf(',');
    if (commaIndex !== -1) {
        name = mainPart.substring(0, commaIndex).trim();
        city = mainPart.substring(commaIndex + 1).trim();
    }
    return { name, city, notes };
}

async function addRestaurantFromText(text, supabaseClient) {
    console.log('🔄 Parsing text:', text);
    const parsed = parseRestaurantMessage(text);
    console.log('✅ Parsed basic info:', parsed);

    if (!parsed.name) {
        return { success: false, message: '❌ Please send a restaurant name.' };
    }

    // --- ENRICHMENT STEP ---
    let enrichedData = {
        name: parsed.name,
        city: parsed.city,
        notes: parsed.notes,
        address: null,
        lat: null,
        lng: null,
        booking_link: null
    };

    let searchFeedback = '';

    try {
        const searchResult = await searchRestaurant(parsed.name, parsed.city);

        if (searchResult.found) {
            console.log('✨ Found details:', searchResult);
            if (searchResult.address) {
                const rawAddress = searchResult.address;
                const cleanedAddress = cleanAddressForGeocoding(rawAddress, parsed.city);
                console.log(`🧹 Address cleaned: "${rawAddress}" -> "${cleanedAddress}"`);
                enrichedData.address = cleanedAddress;
            }
            if (searchResult.bookingLink) enrichedData.booking_link = searchResult.bookingLink;

            if (enrichedData.address) {
                console.log('🌍 Geocoding address:', enrichedData.address);
                const coords = await geocodeAddress(enrichedData.address);
                if (coords) {
                    enrichedData.lat = coords.lat;
                    enrichedData.lng = coords.lng;
                    console.log('📍 Geocoded:', coords);
                }
            }
        } else {
            console.log('⚠️ No extra details found, using basic info.');
            searchFeedback = '\n_(No extra details found, verification recommended)_';
        }
    } catch (e) { console.error('Error during enrichment:', e); }

    // --- CHECK FOR DUPLICATES ---
    try {
        // Try to find a close match
        // We check if the Name column matches the input (case-insensitive)
        const { data: existing } = await supabaseClient
            .from('restaurants')
            .select('*')
            .ilike('name', enrichedData.name)
            .limit(1)
            .maybeSingle();

        if (existing) {
            console.log('🔄 Found existing restaurant:', existing.name);

            // Optional: Update with new enriched data if missing? 
            // For now, let's just return it to attach photos, to avoid overwriting good data with bad.

            return {
                success: true,
                message: `✅ Found existing *${existing.name}*.`,
                restaurant: existing
            };
        }
    } catch (e) { console.error('Duplicate check error:', e); }

    // --- INSERTION STEP ---
    try {
        console.log('🔄 Inserting into Supabase...');
        const { data, error } = await supabaseClient
            .from('restaurants')
            .insert({ ...enrichedData, is_visited: false })
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase error:', error);
            return {
                success: false,
                message: `❌ Failed to add restaurant: ${error.message}`,
            };
        }

        console.log('✅ Insert successful:', data.name);

        let successMessage = `✅ Added *${data.name}*`;
        if (data.city) successMessage += ` in ${data.city}`;

        const extras = [];
        if (data.address) extras.push(`📍 ${data.address}`);
        if (data.booking_link) extras.push(`📅 [Book Table](${data.booking_link})`);

        if (extras.length > 0) {
            successMessage += `\n\n${extras.join('\n')}`;
        }
        successMessage += searchFeedback;

        return {
            success: true,
            message: successMessage,
            restaurant: data
        };

    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return { success: false, message: '❌ An unexpected error occurred.' };
    }
}

// ============================================================
// BOT HANDLERS
// ============================================================

bot.start((ctx) => {
    ctx.reply(
        `❤️‍🔥 *Welcome to Burnt On Food!*
        
*How to use:*
1. Send me photos 📸
2. Then type the restaurant name 🍔
I'll add the spot and attach your pics automatically!`,
        { parse_mode: 'Markdown' }
    );
});

bot.on('photo', async (ctx) => {
    const photos = ctx.message.photo;
    const largestFn = photos[photos.length - 1]; // Highest res

    const session = addPendingPhoto(ctx.chat.id, largestFn.file_id, ctx.message.caption);
    const count = session.photos.length;

    // Set new timeout to prompt user after 5 seconds of silence
    userSessions[ctx.chat.id].timeout = setTimeout(() => {
        ctx.reply(`📸 Received ${count} photo(s).\nPlease enter only the restaurant name :`);
        userSessions[ctx.chat.id].timeout = null;
    }, 5000);
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    const thinkingMsg = await ctx.reply(`🔎 Searching for "${text}"...`);

    const result = await addRestaurantFromText(text, supabase);

    if (result.success && result.restaurant) {
        const photoCount = await uploadPhotosForRestaurant(ctx.chat.id, result.restaurant.id, supabase);
        if (photoCount > 0) {
            result.message += `\n\nPhotos were linked to *${result.restaurant.name}* successfully! ❤️‍🔥`;
        }
    }

    try { await ctx.deleteMessage(thinkingMsg.message_id); } catch (e) { }

    try {
        await ctx.reply(result.message, { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (e) {
        console.error('Reply failed:', e);
    }
});

bot.catch((err, ctx) => {
    console.error(`❌ Global error for ${ctx.updateType}`, err);
});

// ============================================================
// START BOT
// ============================================================

console.log('🚀 Starting Smart Telegram Bot...');
bot.launch().then(() => console.log('✅ Bot is running!'));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
