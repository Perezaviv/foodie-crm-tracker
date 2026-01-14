
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWeb() {
    console.log('Testing exact payload from Telegram...');

    // Simulate the message: "סטודיו גורשה תל אביב"
    // Parser would see: Name="סטודיו גורשה תל אביב", City=null, Notes=null
    const payload = {
        name: "סטודיו גורשה תל אביב",
        city: null,
        notes: null,
        is_visited: false
    };

    console.log('Inserting payload:', payload);

    const { data: insertData, error: insertError } = await supabase
        .from('restaurants')
        .insert(payload)
        .select()
        .single();

    if (insertError) {
        console.error('❌ Error inserting:', insertError);
    } else {
        console.log('✅ Insert successful:', insertData);
    }
}

testWeb();
