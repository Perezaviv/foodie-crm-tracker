/**
 * Skill: SendMessage
 * @owner AGENT-1
 * @status READY
 * @created 2026-01-31
 * @dependencies none
 * 
 * Sends messages to Telegram chats with optional inline keyboard.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface SendMessageInput {
    chatId: number;
    text: string;
    replyMarkup?: TelegramReplyMarkup;
}

export interface SendMessageOutput {
    success: boolean;
    error?: string;
}

export interface TelegramReplyMarkup {
    inline_keyboard: Array<Array<{
        text: string;
        callback_data?: string;
        url?: string;
    }>>;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Send a message to a Telegram chat.
 * 
 * @example
 * // Simple message
 * await sendMessage({ chatId: 12345, text: 'Hello!' });
 * 
 * // Message with inline keyboard
 * await sendMessage({
 *     chatId: 12345,
 *     text: 'Choose an option:',
 *     replyMarkup: {
 *         inline_keyboard: [[
 *             { text: 'Option 1', callback_data: 'opt_1' },
 *             { text: 'Option 2', callback_data: 'opt_2' }
 *         ]]
 *     }
 * });
 */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageOutput> {
    const { chatId, text, replyMarkup } = input;

    try {
        const telegramApiBase = getTelegramApiBase();

        if (!telegramApiBase) {
            return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
        }

        const body: Record<string, unknown> = {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
        };

        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }

        const response = await fetch(`${telegramApiBase}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: `Telegram API error: ${response.status} - ${JSON.stringify(errorData)}`
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error sending message',
        };
    }
}

/**
 * Answer a callback query (dismiss the loading state on inline buttons).
 */
export async function answerCallbackQuery(callbackQueryId: string): Promise<SendMessageOutput> {
    try {
        const telegramApiBase = getTelegramApiBase();

        if (!telegramApiBase) {
            return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
        }

        const response = await fetch(`${telegramApiBase}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId }),
        });

        return { success: response.ok };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error answering callback',
        };
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function getTelegramApiBase(): string | null {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    return `https://api.telegram.org/bot${token}`;
}
