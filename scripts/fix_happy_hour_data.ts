import { Database } from '../lib/types';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

type HappyHourRow = Database['public']['Tables']['happy_hours']['Row'];

async function main() {
    // Dynamic import to ensure env vars are loaded
    const { createAdminClient } = await import('../lib/skills/db/supabase_client');
    const { geocodeAddress } = await import('../lib/skills/ai/geocode_address');

    console.log('Starting Happy Hour data cleanup and enrichment...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Key preset:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Initialize Admin Client
    let client;
    try {
        client = createAdminClient();
    } catch (error) {
        console.error('Failed to create Supabase admin client:', error);
        process.exit(1);
    }

    // 2. Fetch all happy hours
    const { data, error } = await client
        .from('happy_hours')
        .select('*');

    if (error || !data) {
        console.error('Failed to fetch happy hours:', error);
        process.exit(1);
    }

    const happyHours = data as unknown as HappyHourRow[];

    console.log(`Found ${happyHours.length} happy hour records.`);

    let deletedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const hh of happyHours) {
        const hasTimes = !!hh.hh_times && hh.hh_times.trim().length > 0;
        const hasDeal = (!!hh.hh_drinks && hh.hh_drinks.trim().length > 0) ||
            (!!hh.hh_food && hh.hh_food.trim().length > 0);

        // CHECK 1: Data Completeness
        if (!hasTimes || !hasDeal) {
            console.log(`[DELETE] ID: ${hh.id} - Name: ${hh.name} - Missing times or deal info.`);
            await client.from('happy_hours').delete().eq('id', hh.id);
            deletedCount++;
            continue;
        }

        // CHECK 2: Geocoding
        if (hh.address && (!hh.lat || !hh.lng)) {
            console.log(`[GEOCODE] ID: ${hh.id} - Name: ${hh.name} - Address: ${hh.address}`);

            const geoResult = await geocodeAddress({ address: hh.address });

            if (geoResult.success && geoResult.data) {
                const updates = {
                    lat: geoResult.data.lat,
                    lng: geoResult.data.lng
                };

                const { error: updateError } = await client
                    .from('happy_hours')
                    .update(updates)
                    .eq('id', hh.id);

                if (updateError) {
                    console.error(`  -> Failed to update: ${updateError.message}`);
                } else {
                    console.log(`  -> Updated: ${geoResult.data.lat}, ${geoResult.data.lng}`);
                    updatedCount++;
                }
            } else {
                console.error(`  -> Geocoding failed: ${geoResult.error}`);
            }
        } else {
            skippedCount++;
        }
    }

    console.log('------------------------------------------------');
    console.log('Cleanup Complete.');
    console.log(`Deleted: ${deletedCount}`);
    console.log(`Updated (Geocoded): ${updatedCount}`);
    console.log(`Skipped (Already valid): ${skippedCount}`);
}

main().catch(console.error);
