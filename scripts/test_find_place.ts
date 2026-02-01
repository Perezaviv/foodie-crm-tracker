
import { findPlace } from '../lib/skills/ai/find_place';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing FindPlace directly...');

    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log('API Key present:', !!key, key ? `(${key.substring(0, 5)}...)` : '');

    const result = await findPlace({ text: 'Sid and Nancy', city: 'Tel Aviv' });
    console.log('Result:', JSON.stringify(result, null, 2));

    const result2 = await findPlace({ text: 'A.K.A', city: 'Tel Aviv' });
    console.log('Result A.K.A:', JSON.stringify(result2, null, 2));
}

test();
