
import { findPlace } from '../lib/skills/ai/find_place';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing FindPlace directly...');
    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log('Using Key:', key ? key.substring(0, 10) + '...' : 'NONE');

    // Test 1: Sid and Nancy (the problematic one)
    console.log('\n--- Searching "Sid and Nancy Tel Aviv" ---');
    const result1 = await findPlace({ text: 'Sid and Nancy', city: 'Tel Aviv' });
    console.log('Result:', JSON.stringify(result1, null, 2));

    // Test 2: A.K.A
    console.log('\n--- Searching "A.K.A Tel Aviv" ---');
    const result2 = await findPlace({ text: 'A.K.A', city: 'Tel Aviv' });
    console.log('Result:', JSON.stringify(result2, null, 2));
}

test();
