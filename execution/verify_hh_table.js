
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    const { data, error } = await supabase
        .from('happy_hours')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error checking table:', error.message);
        if (error.message.includes('relation "happy_hours" does not exist')) {
            console.log('Table "happy_hours" does not exist. Please run the migration script in Supabase SQL Editor:');
            console.log('---');
            console.log('CREATE TABLE IF NOT EXISTS happy_hours (\n    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n    name TEXT NOT NULL,\n    address TEXT,\n    lat DOUBLE PRECISION,\n    lng DOUBLE PRECISION,\n    hh_times TEXT,\n    hh_drinks TEXT,\n    hh_food TEXT,\n    source_url TEXT,\n    created_at TIMESTAMPTZ DEFAULT NOW(),\n    updated_at TIMESTAMPTZ DEFAULT NOW()\n);');
            console.log('---');
        }
    } else {
        console.log('Table "happy_hours" exists.');
    }
}

checkTable();
