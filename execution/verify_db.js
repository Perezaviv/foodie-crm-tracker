/**
 * Verify Supabase Connection and Schema
 * Usage: node execution/verify_db.js
 */
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function verify() {
    console.log('🔍 Verifying Supabase connection...');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error('❌ Missing Supabase environment variables');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    // 1. Check restaurants table
    console.log('\nChecking "restaurants" table...');
    const { error: rError } = await supabase
        .from('restaurants')
        .select('count')
        .limit(1)
        .single();

    if (rError) {
        console.error('❌ Error accessing restaurants table:', rError.message);
    } else {
        console.log('✅ Access confirmed. Table exists.');
    }

    // 2. Check photos table
    console.log('\nChecking "photos" table...');
    const { error: pError } = await supabase
        .from('photos')
        .select('count')
        .limit(1)
        .single();

    if (pError) {
        console.error('❌ Error accessing photos table:', pError.message);
    } else {
        console.log('✅ Access confirmed. Table exists.');
    }

    // 3. Check storage bucket
    console.log('\nChecking "photos" storage bucket...');
    const { data: buckets, error: bError } = await supabase
        .storage
        .listBuckets();

    if (bError) {
        console.error('❌ Error accessing storage:', bError.message);
    } else {
        const photoBucket = buckets.find(b => b.name === 'photos');
        if (photoBucket) {
            console.log('✅ Bucket "photos" found.');
        } else {
            console.error('❌ Bucket "photos" NOT found. Available buckets:', buckets.map(b => b.name).join(', '));
        }
    }
}

verify().catch(console.error);
