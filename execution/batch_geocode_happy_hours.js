
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseKey || !googleApiKey) {
    console.error('Missing required environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function cleanAddress(address, city = 'Tel Aviv') {
    if (!address) return city;
    let cleaned = address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned.toLowerCase().includes(city.toLowerCase())) {
        cleaned = `${cleaned}, ${city}`;
    }
    if (!cleaned.toLowerCase().includes('israel')) {
        cleaned = `${cleaned}, Israel`;
    }
    return cleaned;
}

async function geocodeAddress(address) {
    try {
        const encoded = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${googleApiKey}&region=il`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            return data.results[0].geometry.location;
        }
        return null;
    } catch (error) {
        console.error(`Error geocoding ${address}:`, error.message);
        return null;
    }
}

async function start() {
    console.log('Fetching happy hours without coordinates...');
    const { data, error } = await supabase
        .from('happy_hours')
        .select('id, name, address')
        .is('lat', null);

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    console.log(`Found ${data.length} records to geocode.`);

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const searchTerm = item.address || item.name;
        const cleaned = cleanAddress(searchTerm, 'Tel Aviv');

        console.log(`[${i + 1}/${data.length}] Geocoding: ${cleaned}...`);
        const coords = await geocodeAddress(cleaned);

        if (coords) {
            console.log(`  Found: ${coords.lat}, ${coords.lng}`);
            await supabase
                .from('happy_hours')
                .update({ lat: coords.lat, lng: coords.lng })
                .eq('id', item.id);
        } else {
            console.log(`  No results found for: ${cleaned}`);
        }

        await new Promise(r => setTimeout(r, 100));
    }

    console.log('Batch geocoding complete!');
}

start();
