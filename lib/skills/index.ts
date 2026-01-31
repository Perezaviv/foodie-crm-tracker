/**
 * Skills Index - Central Export
 * 
 * Import skills from here for clean, organized imports:
 * 
 * @example
 * import { getSupabaseClient } from '@/lib/skills';
 * import { searchRestaurant, extractInfo } from '@/lib/skills';
 * import { sendMessage } from '@/lib/skills';
 * import { useRestaurants, usePhotos } from '@/lib/skills';
 */

// Database Skills (Agent 4)
export * from './db';

// AI/Search Skills (Agent 3)
export * from './ai';

// Telegram Skills (Agent 1)
export * from './telegram';

// UI Skills (Agent 2)
export * from './ui';
