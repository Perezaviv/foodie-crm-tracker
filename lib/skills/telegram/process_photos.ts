/**
 * Skill: ProcessPhotos
 * @owner AGENT-1
 * @status DRAFT
 * @created 2026-01-31
 * @dependencies supabase_client, send_message
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { getSupabaseClient } from '../db/supabase_client';
import { sendMessage } from './send_message';
import { MESSAGES } from '../../telegram-messages';

// =============================================================================
// TYPES
// =============================================================================

export interface ProcessPhotosInput {
    chatId: number;
    restaurantId: string;
    fileIds: string[];
}

export interface ProcessPhotosOutput {
    success: boolean;
    data?: {
        processedCount: number;
        totalCount: number;
    };
    error?: string;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Processes and uploads Telegram photo files to Supabase storage and database
 * 
 * @example
 * const result = await processPhotos({
 *     chatId: 123456789,
 *     restaurantId: 'restaurant-uuid',
 *     fileIds: ['AgACAgIAAxkDAAIC...']
 * });
 */
export async function processPhotos(input: ProcessPhotosInput): Promise<ProcessPhotosOutput> {
    try {
        const { chatId, restaurantId, fileIds } = input;

        if (!fileIds || fileIds.length === 0) {
            return { success: true, data: { processedCount: 0, totalCount: 0 } };
        }

        let successCount = 0;

        // Get admin Supabase client
        const { client: supabase, error: clientError } = getSupabaseClient({ type: 'admin' });
        if (clientError || !supabase) {
            throw new Error(clientError || 'Failed to get Supabase client');
        }

        await sendMessage({ chatId, text: MESSAGES.PROCESSING_PHOTOS(fileIds.length) });

        for (const fileId of fileIds) {
            try {
                console.log('[TG] Processing fileId:', fileId.substring(0, 20) + '...');

                // 1. Get File Path from Telegram
                const token = process.env.TELEGRAM_BOT_TOKEN;
                if (!token) {
                    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
                }

                const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
                const fileJson = await fileRes.json();
                
                if (!fileJson.ok) {
                    console.error('[TG] getFile API failed:', fileJson);
                    continue;
                }

                const filePath = fileJson.result.file_path;
                console.log('[TG] Got file path:', filePath);
                const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

                // 2. Download the image
                const imageRes = await fetch(downloadUrl);
                if (!imageRes.ok) {
                    console.error('[TG] File download failed:', imageRes.status, imageRes.statusText);
                    continue;
                }
                const arrayBuffer = await imageRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                console.log('[TG] Downloaded image, size:', buffer.length, 'bytes');

                // 3. Upload to Supabase Storage
                const ext = filePath.split('.').pop() || 'jpg';
                const storagePath = `restaurants/${restaurantId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(storagePath, buffer, { contentType: 'image/jpeg' });

                if (uploadError) {
                    console.error('[TG] Storage upload failed:', uploadError);
                    continue;
                }

                // 4. Create Database Record
                const { error: dbError } = await supabase.from('photos').insert({
                    restaurant_id: restaurantId,
                    storage_path: storagePath
                });

                if (dbError) {
                    console.error('[TG] DB insert failed details:', JSON.stringify(dbError));
                    throw new Error(`DB Insert Failed: ${dbError.message}`);
                }

                console.log('[TG] Successfully uploaded photo:', storagePath);
                successCount++;

            } catch (e) {
                console.error('[TG] Photo processing error - Full details:', {
                    error: e instanceof Error ? e.message : String(e),
                    stack: e instanceof Error ? e.stack : undefined,
                    fileId: fileId.substring(0, 20) + '...',
                });
                // Continue processing other photos even if one fails
            }
        }

        await sendMessage({ chatId, text: MESSAGES.PHOTOS_SUCCESS(successCount) });

        return { 
            success: true, 
            data: { processedCount: successCount, totalCount: fileIds.length } 
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return { 
            success: false, 
            error: errorMessage 
        };
    }
}