/**
 * Telegram Skills Index
 * @owner AGENT-1
 */

export { sendMessage, answerCallbackQuery } from './send_message';
export type { SendMessageInput, SendMessageOutput, TelegramReplyMarkup } from './send_message';

export { handleCallback } from './handle_callback';
export type { HandleCallbackInput, HandleCallbackOutput, CallbackAction } from './handle_callback';

export { addRestaurant } from './add_restaurant';
export type { AddRestaurantInput, AddRestaurantOutput } from './add_restaurant';

export { processPhotos } from './process_photos';
export type { ProcessPhotosInput, ProcessPhotosOutput } from './process_photos';

export { rateRestaurant } from './rate_restaurant';
export type { RateRestaurantInput, RateRestaurantOutput } from './rate_restaurant';

export { addComment } from './add_comment';
export type { AddCommentInput, AddCommentOutput } from './add_comment';
