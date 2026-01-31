/**
 * Hebrew message constants for Telegram bot
 * All user-facing messages are centralized here for easy maintenance
 */

export const MESSAGES = {
    // Welcome & Menu
    WELCOME: `👋 שלום! אני יכול לעזור לך להוסיף מסעדות ותמונות.

*פקודות:*
• \`/add <שם>\` - הוסף מסעדה
• \`/rate <שם> <1-5>\` - דרג מסעדה
• \`/comment <שם> - <טקסט>\` - הוסף הערה
• שלח תמונות להעלאה

בקבוצות, השתמש בפקודות אם אני לא מגיב לטקסט.`,

    MENU_HEADER: '📋 *תפריט ראשי*\n\nבחר פעולה:',

    // Session
    SESSION_CLEARED: '✅ השיחה נוקתה.\n\nדוגמאות:\n• `/add מזנון` (חיפוש והוספה)\n• שלח תמונות (העלאה)',
    SESSION_EXPIRED: '⚠️ פג תוקף השיחה. נסה שוב.',
    ACTION_CANCELLED: '❌ הפעולה בוטלה.',

    // Search
    SEARCHING: '🔎 מחפש...',
    NO_RESULTS: '❌ לא נמצאו מסעדות. נסה שם אחר.',
    MULTIPLE_RESULTS: '🤔 מצאתי כמה מקומות. בחר אחד:',
    SELECTION_INVALID: '❌ שגיאה: בחירה לא חוקית.',

    // Restaurant
    ADDED_RESTAURANT: (name: string): string => `✅ נוסף *${name}*`,
    ERROR_SAVING: (error: string): string => `❌ שגיאה בשמירה: ${error}`,
    RESTAURANT_NOT_FOUND: (name: string): string => `❌ המסעדה "${name}" לא נמצאה. בדוק את השם ונסה שוב.`,

    // Photos
    PHOTO_RECEIVED: (count: number): string => `📸 התקבלו ${count} תמונ${count > 1 ? 'ות' : 'ה'}. לחץ סיום כאשר כל התמונות עלו.`,
    PROCESSING_PHOTOS: (count: number): string => `⏳ מעבד ${count} תמונות...`,
    PHOTOS_SUCCESS: (count: number): string => `✅ נוספו בהצלחה ${count} תמונות!`,
    PHOTO_ERROR: '❌ שגיאה בעיבוד התמונה. נסה שוב.',
    WHICH_RESTAURANT: '🏢 לאיזו מסעדה שייכות התמונות? הקלד את השם.',

    // Rating
    RATING_USAGE: '⚠️ שימוש: `/rate שם מסעדה 5`\n\nדוגמה: `/rate מזנון 4`',
    RATE_INSTRUCTION: '⭐ נא לשלוח את שם המסעדה והציון (1-5).\n\nדוגמה: `מזנון 5`',
    RATING_SUCCESS: (name: string, rating: number): string => {
        const stars = '⭐'.repeat(rating);
        return `${stars}\n\n✅ דירגת *${name}* ${rating}/5!`;
    },
    RATING_ERROR: (error: string): string => `❌ נכשל בעדכון הדירוג: ${error}`,

    // Comments
    COMMENT_USAGE: '⚠️ שימוש: `/comment שם מסעדה - הערה שלך`\n\nדוגמה: `/comment מזנון - פיתה מדהימה!`',
    COMMENT_INSTRUCTION: '💬 נא לשלוח את שם המסעדה והערה, מופרדים במקף.\n\nדוגמה: `מזנון - אחלה מקום`',
    COMMENT_SUCCESS: (name: string, text: string): string => `💬 הערה נוספה ל*${name}*!\n\n"${text}"`,
    COMMENT_ERROR: (error: string): string => `❌ נכשל בהוספת הערה: ${error}`,

    // Add command
    ADD_USAGE: '⚠️ נא לרשום שם מסעדה. דוגמה: `/add בורגר קינג`',

    // Buttons
    BTN_DONE: '✅ סיום',
    BTN_CANCEL: '❌ ביטול',
    BTN_ADD: '➕ הוסף מסעדה',
    BTN_RATE: '⭐ דרג מסעדה',
    BTN_COMMENT: '💬 הוסף הערה',
    BTN_PHOTOS: '📸 העלה תמונות',
    BTN_HELP: '❓ עזרה',

    // Misc
    PHOTO_INSTRUCTION: '📸 שלח תמונות ואני אעזור לך לשייך אותן למסעדה.',
    NO_ADDRESS: 'ללא כתובת',
    BOOKING_LINK_TEXT: 'הזמנת מקום',
    ERROR_GENERIC: '❌ שגיאה כללית במערכת. נסה שוב מאוחר יותר.'
};

/** Menu keyboard layout */
export const MENU_KEYBOARD = {
    inline_keyboard: [
        [
            { text: MESSAGES.BTN_ADD, callback_data: 'menu_add' },
            { text: MESSAGES.BTN_RATE, callback_data: 'menu_rate' },
        ],
        [
            { text: MESSAGES.BTN_COMMENT, callback_data: 'menu_comment' },
            { text: MESSAGES.BTN_PHOTOS, callback_data: 'menu_photos' },
        ],
        [
            { text: MESSAGES.BTN_HELP, callback_data: 'menu_help' },
        ],
    ],
};
