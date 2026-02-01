
import { createAdminClient } from '../lib/skills/db/supabase_client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    console.log('Inspecting "Roof Top 98" data...');

    // Dynamic import to ensure env vars are loaded first
    const { createAdminClient } = await import('../lib/skills/db/supabase_client');
    const client = createAdminClient();

    const { data, error } = await client
        .from('happy_hours')
        .select('*')
        .ilike('name', '%רוף טופ 98%');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    console.log('Found records:', data);
}

main().catch(console.error);
