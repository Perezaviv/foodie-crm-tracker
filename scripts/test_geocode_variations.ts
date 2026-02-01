
import { geocodeAddress } from '../lib/skills/ai/geocode_address';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing Geocoding Variations...');

    const variations = [
        'Nahalat Binyamin 44, Tel Aviv-Yafo, Israel', // As extracted by AI
        'Nahalat Binyamin 44, Tel Aviv, Israel',
        'Nahalat Binyamin 44 Tel Aviv'
    ];

    for (const v of variations) {
        console.log(`\nAddress: "${v}"`);
        const r = await geocodeAddress({ address: v });
        if (r.success && r.data) {
            console.log(`Formatted: ${r.data.formattedAddress}`);
            console.log(`Types: ${JSON.stringify(r.data.types)}`);
        } else {
            console.log('Failed:', r.error);
        }
    }
}

test();
