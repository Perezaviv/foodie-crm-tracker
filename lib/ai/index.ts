/**
 * AI/Search Module
 * Re-exports from skills to maintain compatibility and centralize logic.
 */

export * from '../skills/ai';

// Backward compatibility aliases if needed
import { extractInfo } from '../skills/ai';
export const extractRestaurantInfo = (text: string) => extractInfo({ text });
