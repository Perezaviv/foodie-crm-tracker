
import { searchRestaurant } from '../lib/skills/ai/search_restaurant';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing Search with FindPlace integration...');

    // Test case 1: "Sid and Nancy" (Specific place mentioned by user)
    console.log('\n--- Searching for "Sid and Nancy Tel Aviv" ---');
    const result1 = await searchRestaurant({ name: 'Sid and Nancy', city: 'Tel Aviv', useCache: false });

    if (result1.success) {
        console.log('Success!');
        const primary = result1.results[0];
        console.log('Name:', primary.name);
        console.log('Address:', primary.address);
        console.log('Place ID:', primary.googlePlaceId);
        console.log('Lat/Lng:', primary.lat, primary.lng);

        if (!primary.googlePlaceId) {
            console.error('FAILED: No googlePlaceId returned.');
        } else {
            console.log('PASSED: googlePlaceId found.');
        }

    } else {
        console.error('Search failed:', result1.error);
    }

    // Test case 2: "A.K.A"
    console.log('\n--- Searching for "A.K.A Tel Aviv" ---');
    const result2 = await searchRestaurant({ name: 'A.K.A', city: 'Tel Aviv', useCache: false });

    if (result2.success) {
        console.log('Success!');
        const primary = result2.results[0];
        console.log('Name:', primary.name);
        console.log('Address:', primary.address);
        console.log('Place ID:', primary.googlePlaceId);
    } else {
        console.error('Search failed:', result2.error);
    }
}

test();
