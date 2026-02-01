
import { geocodeAddress } from '../lib/skills/ai/geocode_address';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing GeocodeAddress directly...');
    const result = await geocodeAddress({ address: 'Tel Aviv' }); // Simple query
    console.log('Result:', JSON.stringify(result, null, 2));
}

test();
