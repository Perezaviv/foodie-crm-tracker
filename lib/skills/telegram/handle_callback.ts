/**
 * Skill: HandleCallback
 * @owner AGENT-1
 * @status READY
 * @created 2026-01-31
 * @dependencies send_message
 * 
 * Handles Telegram callback query routing for inline button presses.
 */

import { sendMessage, answerCallbackQuery } from './send_message';
import { MESSAGES, MENU_KEYBOARD } from '../../telegram-messages';

// =============================================================================
// TYPES
// =============================================================================

export interface HandleCallbackInput {
    callbackQueryId: string;
    chatId: number;
    data: string;
}

export interface HandleCallbackOutput {
    success: boolean;
    action?: CallbackAction;
    error?: string;
}

export type CallbackAction =
    | 'show_menu'
    | 'start_add'
    | 'start_rate'
    | 'start_comment'
    | 'start_photos'
    | 'show_help'
    | 'done_photos'
    | 'confirm_restaurant'
    | 'unknown';

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Handle a Telegram callback query (inline button press).
 * Routes to appropriate action based on callback_data.
 * 
 * @example
 * const result = await handleCallback({
 *     callbackQueryId: 'abc123',
 *     chatId: 12345,
 *     data: 'menu_add'
 * });
 * // result.action === 'start_add'
 */
export async function handleCallback(input: HandleCallbackInput): Promise<HandleCallbackOutput> {
    const { callbackQueryId, chatId, data } = input;

    try {
        // Always answer the callback to remove loading state
        await answerCallbackQuery(callbackQueryId);

        // Route based on callback data
        const action = routeCallback(data);

        // Handle immediate responses
        switch (action) {
            case 'show_menu':
                await sendMessage({
                    chatId,
                    text: MESSAGES.MENU_HEADER,
                    replyMarkup: MENU_KEYBOARD,
                });
                break;

            case 'show_help':
                await sendMessage({
                    chatId,
                    text: MESSAGES.WELCOME,
                });
                break;

            case 'start_add':
                await sendMessage({
                    chatId,
                    text: MESSAGES.ADD_USAGE,
                });
                break;

            case 'start_rate':
                await sendMessage({
                    chatId,
                    text: MESSAGES.RATING_USAGE,
                });
                break;

            case 'start_comment':
                await sendMessage({
                    chatId,
                    text: MESSAGES.COMMENT_USAGE,
                });
                break;

            case 'start_photos':
                await sendMessage({
                    chatId,
                    text: MESSAGES.PHOTO_INSTRUCTION,
                });
                break;

            // These actions need further processing by the caller
            case 'done_photos':
            case 'confirm_restaurant':
            case 'unknown':
                break;
        }

        return { success: true, action };
    } catch (error) {
        return {
            success: false,
            action: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown callback error',
        };
    }
}

// =============================================================================
// ROUTING HELPERS
// =============================================================================

function routeCallback(data: string): CallbackAction {
    if (data === 'menu') return 'show_menu';
    if (data === 'menu_add') return 'start_add';
    if (data === 'menu_rate') return 'start_rate';
    if (data === 'menu_comment') return 'start_comment';
    if (data === 'menu_photos') return 'start_photos';
    if (data === 'menu_help') return 'show_help';
    if (data === 'done_photos') return 'done_photos';
    if (data.startsWith('confirm_')) return 'confirm_restaurant';

    return 'unknown';
}
