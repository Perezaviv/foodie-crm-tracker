/**
 * Skill: NotifyGroup
 * @owner AGENT-1
 * @status READY
 * @created 2026-01-31
 * @dependencies send_message
 */

import { sendMessage } from './send_message';

export interface NotifyGroupInput {
    text: string;
    actionBy?: string; // e.g. "Aviv" (optional user name)
}

/**
 * Sends a notification message to the configured Telegram Group.
 * Fails silently to avoid disrupting the main user flow.
 */
export async function notifyGroup(input: NotifyGroupInput): Promise<void> {
const groupId = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_ID;

    if (!groupId) {
        // Warning logged but no error thrown
        console.warn('[NotifyGroup] NEXT_PUBLIC_TELEGRAM_GROUP_ID not configured. Skipping notification.');
        return;
    }

    try {
        const { text, actionBy } = input;

        let message = text;
        if (actionBy) {
            message = `👤 *${actionBy}*: ${text}`;
        } else {
            message = `🔔 ${text}`;
        }

        await sendMessage({
            chatId: parseInt(groupId),
            text: message
        });

    } catch (error) {
        // Log error but generally fail silent so the user feels success
        console.error('[NotifyGroup] Failed to send notification:', error);
    }

    console.log(`[NotifyGroup] Found group ID: ${groupId}`);

    try {
        const { text, actionBy } = input;

        let message = text;
        if (actionBy) {
            message = `👤 *${actionBy}*: ${text}`;
        } else {
            message = `🔔 ${text}`;
        }

        console.log(`[NotifyGroup] Sending message: "${message}"`);
        const result = await sendMessage({
            chatId: parseInt(groupId),
            text: message
        });

        if (!result.success) {
            console.error('[NotifyGroup] sendMessage failed:', result.error);
        } else {
            console.log('[NotifyGroup] Notification sent successfully.');
        }

    } catch (error) {
        // Log error but generally fail silent so the user feels success
        console.error('[NotifyGroup] Failed to send notification:', error);
    }
}
