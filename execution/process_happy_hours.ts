
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate Logic
function calculateRating(item: Record<string, any>): number {
    const drinks = (item.hh_drinks || '').toLowerCase();
    const food = (item.hh_food || '').toLowerCase();

    // Check for Gold triggers (Tier 3)
    // 1+1, 50%, 40%
    const goldKeywords = ['1+1', '50%', '40%'];
    if (goldKeywords.some(k => drinks.includes(k) || food.includes(k))) {
        return 3;
    }

    // Check for Silver triggers (Tier 2)
    // 30%, 25%, 35%
    const silverKeywords = ['30%', '35%', '25%'];
    if (silverKeywords.some(k => drinks.includes(k) || food.includes(k))) {
        return 2;
    }

    // Default to Bronze (Tier 1)
    return 1;
}

// Time Parsing Logic
function parseTimes(timeStr: string): { start: string | null, end: string | null } {
    if (!timeStr) return { start: null, end: null };

    // Pattern: "18:00-20:00" or "18:00-20:00 ⏰"
    // Remove emojis and trim
    const cleanStr = timeStr.replace(/[^\d:-]/g, '').trim();
    const parts = cleanStr.split('-');

    if (parts.length === 2) {
        return {
            start: parts[0], // e.g., "18:00"
            end: parts[1]    // e.g., "20:00"
        };
    }

    return { start: null, end: null };
}

async function run() {
    console.log('Fetching happy hours...');

    // Fetch all records
    const { data: happyHours, error } = await supabase
        .from('happy_hours')
        .select('*');

    if (error) {
        console.error('Error fetching happy hours:', error);
        return;
    }

    console.log(`Processing ${happyHours.length} items...`);

    let updates = 0;

    for (const item of happyHours) {
        const rating = calculateRating(item);
        const { start, end } = parseTimes(item.hh_times);

        // Update DB
        const { error: updateError } = await supabase
            .from('happy_hours')
            .update({
                rating: rating,
                start_time: start,
                end_time: end
            })
            .eq('id', item.id);

        if (updateError) {
            console.error(`Failed to update ${item.name}:`, updateError);
        } else {
            updates++;
            // process.stdout.write('.');
        }
    }

    console.log(`\nUpdated ${updates} records.`);
}

run();
