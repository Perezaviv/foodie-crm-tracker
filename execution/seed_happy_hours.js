
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required for seeding.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    const dataPath = path.join(__dirname, '../.tmp/happy_hour_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found at', dataPath);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Read ${rawData.length} records.`);

    const formattedData = rawData.map(item => ({
        name: item.name.split('\n')[0].trim(), // Clean name from icons/address
        address: item.address,
        hh_times: item.hh_times,
        hh_drinks: item.hh_drinks,
        hh_food: item.hh_food,
        source_url: item.source_url
    }));

    console.log('Inserting data...');

    // Supabase upsert requires a unique constraint or it just inserts.
    // Since we don't have a unique constraint on name yet, we'll just insert.
    // Or we can try to find existing ones.

    const { data, error } = await supabase
        .from('happy_hours')
        .upsert(formattedData, { onConflict: 'name' });

    if (error) {
        if (error.message.includes('relation "happy_hours" does not exist')) {
            console.error('CRITICAL: Table "happy_hours" does not exist.');
            console.log('Run this SQL in Supabase SQL Editor:');
            console.log(`
CREATE TABLE IF NOT EXISTS happy_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    hh_times TEXT,
    hh_drinks TEXT,
    hh_food TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
      `);
        } else {
            console.error('Error seeding data:', error.message);
        }
    } else {
        console.log('Seeding successful!');
    }
}

seed();
