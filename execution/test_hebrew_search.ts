
import { searchRestaurant } from '../lib/skills/ai/search_restaurant';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('--- Testing Hebrew Searches ---');
    const r1 = await searchRestaurant({ name: 'A.K.A תל אביב', city: '', useCache: false });
    console.log('A.K.A Hebrew Full Result:', JSON.stringify(r1.results[0], null, 2));

    const r2 = await searchRestaurant({ name: 'Sid and Nancy תל אביב', city: '', useCache: false });
    console.log('Sid Hebrew Full Result:', JSON.stringify(r2.results[0], null, 2));
}

test().catch(console.error);
