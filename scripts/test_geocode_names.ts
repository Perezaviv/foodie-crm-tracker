
import { geocodeAddress } from '../lib/skills/ai/geocode_address';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing Geocoding with Restaurant Names...');

    // Test 1: Sid and Nancy
    const q1 = 'Sid and Nancy, Tel Aviv, Israel';
    console.log(`\nSearching: "${q1}"`);
    const r1 = await geocodeAddress({ address: q1 });
    console.log('Result:', JSON.stringify(r1, null, 2));

    // Test 2: A.K.A
    const q2 = 'A.K.A, Tel Aviv, Israel';
    console.log(`\nSearching: "${q2}"`);
    const r2 = await geocodeAddress({ address: q2 });
    console.log('Result:', JSON.stringify(r2, null, 2));

    // Test 3: Explicit Address
    const q3 = 'Nahalat Binyamin St 44, Tel Aviv-Yafo';
    console.log(`\nSearching: "${q3}"`);
    const r3 = await geocodeAddress({ address: q3 });
    console.log('Result:', JSON.stringify(r3, null, 2));
}

test();
