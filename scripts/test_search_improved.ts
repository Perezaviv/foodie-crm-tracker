
import { searchRestaurant } from '../lib/skills/ai/search_restaurant';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing SearchRestaurant E2E (Improved Query)...');

    console.log('\n--- Searching "Sid and Nancy Tel Aviv" ---');
    const result = await searchRestaurant({ name: 'Sid and Nancy', city: 'Tel Aviv', useCache: false });

    if (result.success) {
        console.log('Success!');
        const primary = result.results[0];
        console.log('Name:', primary.name);
        console.log('Address:', primary.address); // Should be Nahalat Binyamin 44...
        console.log('Place ID:', primary.googlePlaceId);

        if (primary.address && primary.address.includes('Nahalat Binyamin')) {
            console.log('PASS: Correct address found.');
        } else {
            console.error('FAIL: Incorrect address.');
        }

    } else {
        console.error('Search failed:', result.error);
    }
}

test();
