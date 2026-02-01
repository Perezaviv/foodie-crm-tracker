
import { searchRestaurant } from '../lib/skills/ai/search_restaurant';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing SearchRestaurant E2E...');

    // We expect Tavily to find "Sid and Nancy" description/address.
    // We expect Geocoding to work on that address.
    // We expect googlePlaceId to be populated.

    console.log('\n--- Searching "Sid and Nancy Tel Aviv" ---');
    const result = await searchRestaurant({ name: 'Sid and Nancy', city: 'Tel Aviv', useCache: false });

    if (result.success) {
        console.log('Success!');
        const primary = result.results[0];
        console.log('Name:', primary.name);
        console.log('Address:', primary.address);
        console.log('Place ID:', primary.googlePlaceId); // This is what we want!
        console.log('Lat/Lng:', primary.lat, primary.lng);
    } else {
        console.error('Search failed:', result.error);
    }
}

test();
