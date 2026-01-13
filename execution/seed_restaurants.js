/**
 * Seed database with real Tel Aviv restaurants
 * Usage: node execution/seed_restaurants.js
 */
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const realRestaurants = [
    {
        name: "Miznon",
        cuisine: "Israeli",
        city: "Tel Aviv",
        address: "30 King George St, Tel Aviv",
        lat: 32.0731,
        lng: 34.7747,
        booking_link: "https://www.miznon.com",
        notes: "Famous for their pita sandwiches. Try the ratatouille!",
        is_visited: true,
        rating: 5
    },
    {
        name: "HaSalon",
        cuisine: "Mediterranean",
        city: "Tel Aviv",
        address: "94 HaKongres St, Tel Aviv",
        lat: 32.0544,
        lng: 34.7613,
        booking_link: null,
        notes: "Eyal Shani's legendary dining experience. Reservations essential.",
        is_visited: false,
        rating: null
    },
    {
        name: "Taizu",
        cuisine: "Asian Fusion",
        city: "Tel Aviv",
        address: "23 Menachem Begin Rd, Tel Aviv",
        lat: 32.0693,
        lng: 34.7897,
        booking_link: "https://taizu.co.il",
        notes: "High-end Asian cuisine with incredible presentation",
        is_visited: true,
        rating: 4
    },
    {
        name: "Mashya",
        cuisine: "Modern Israeli",
        city: "Tel Aviv",
        address: "Herbert Samuel Esplanade, Tel Aviv",
        lat: 32.0862,
        lng: 34.7668,
        booking_link: "https://www.mashya.co.il",
        notes: "Beautiful seaside location at The Setai hotel",
        is_visited: false,
        rating: null
    },
    {
        name: "Port Sa'id",
        cuisine: "Middle Eastern",
        city: "Tel Aviv",
        address: "5 Har Sinai St, Tel Aviv",
        lat: 32.0662,
        lng: 34.7751,
        booking_link: null,
        notes: "No reservations, always packed. Amazing hummus and lamb kebabs.",
        is_visited: true,
        rating: 5
    },
    {
        name: "Claro",
        cuisine: "Mediterranean",
        city: "Tel Aviv",
        address: "23 Hata'arucha St, Tel Aviv",
        lat: 32.0551,
        lng: 34.7567,
        booking_link: "https://clarotlv.com",
        notes: "Chef Ran Shmueli's flagship. Wood-fired cooking.",
        is_visited: false,
        rating: null
    },
    {
        name: "North Abraxas",
        cuisine: "Mediterranean",
        city: "Tel Aviv",
        address: "40 Lilienblum St, Tel Aviv",
        lat: 32.0622,
        lng: 34.7705,
        booking_link: null,
        notes: "Trendy spot with great cocktails and sharing plates",
        is_visited: true,
        rating: 4
    },
    {
        name: "Santa Katarina",
        cuisine: "Italian",
        city: "Tel Aviv",
        address: "2 Har Sinai St, Tel Aviv",
        lat: 32.0659,
        lng: 34.7748,
        booking_link: null,
        notes: "Rustic Italian in a beautiful old building. Fresh pasta daily.",
        is_visited: true,
        rating: 4
    }
];

async function seed() {
    console.log('🧹 Cleaning existing data...');

    // Delete all existing restaurants
    const { error: deleteError } = await supabase
        .from('restaurants')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
        console.error('❌ Error deleting:', deleteError.message);
        return;
    }
    console.log('✅ Cleaned existing data');

    console.log('\n🌱 Seeding real Tel Aviv restaurants...');

    const { data, error: insertError } = await supabase
        .from('restaurants')
        .insert(realRestaurants)
        .select();

    if (insertError) {
        console.error('❌ Error inserting:', insertError.message);
        return;
    }

    console.log(`✅ Added ${data.length} restaurants:`);
    data.forEach(r => console.log(`   - ${r.name} (${r.cuisine})`));
}

seed().catch(console.error);
