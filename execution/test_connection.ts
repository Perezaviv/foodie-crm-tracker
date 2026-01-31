
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);
// console.log('Using Key:', supabaseKey); // Don't log full key

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        const { data, error } = await supabase.from('restaurants').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Failed:', error.message);
            console.error('Error Details:', JSON.stringify(error, null, 2));
        } else {
            console.log('Connection Successful!');
            console.log('Restaurant count:', data); // data is null for count: 'exact' head: true, count is in 'count' property
        }

        // Also try to read 1 row to be sure
        const { data: rows, error: readError } = await supabase.from('restaurants').select('*').limit(1);
        if (readError) {
            console.error('Read Failed:', readError.message);
        } else {
            console.log('Read Successful! Row count returned:', rows.length);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
