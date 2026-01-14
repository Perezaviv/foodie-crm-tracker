
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRecent() {
    console.log('Fetching recent restaurants...');
    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('✅ Recent restaurants:');
        data.forEach(r => console.log(`- ${r.name} (City: ${r.city}) [${r.created_at}]`));
    }
}

checkRecent();
