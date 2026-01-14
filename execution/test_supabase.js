
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWeb() {
    console.log('Attempting to fetch restaurants...');
    const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .limit(1);

    if (error) {
        console.error('❌ Error fetching:', error);
    } else {
        console.log('✅ Fetch successful. Found:', data.length, 'rows');
        if (data.length > 0) console.log('Sample:', data[0]);
    }

    console.log('Attempting to insert dummy restaurant...');
    const { data: insertData, error: insertError } = await supabase
        .from('restaurants')
        .insert({
            name: 'Test Restaurant ' + Date.now(),
            city: 'Test City',
            is_visited: false
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Error inserting:', insertError);
    } else {
        console.log('✅ Insert successful:', insertData.name);
    }
}

testWeb();
