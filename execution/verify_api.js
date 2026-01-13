/**
 * Verify REST APIs
 * Usage: node execution/verify_api.js
 */

async function testApi() {
    const baseUrl = 'http://localhost:3000';
    console.log(`🔍 Testing APIs at ${baseUrl}...\n`);

    // Helper for requests
    async function request(method, path, body = null) {
        try {
            const opts = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (body) opts.body = JSON.stringify(body);

            const res = await fetch(`${baseUrl}${path}`, opts);
            const data = await res.json();
            return { status: res.status, data };
        } catch (e) {
            return { error: e.message };
        }
    }

    // 1. Test GET /api/restaurants
    console.log('1. Testing GET /api/restaurants...');
    const listRes = await request('GET', '/api/restaurants');
    if (listRes.data && listRes.data.success) {
        console.log(`✅ PASSED. Found ${listRes.data.restaurants.length} restaurants.`);
    } else {
        console.log(`❌ FAILED.`, listRes);
    }

    // 2. Test POST /api/parse (AI)
    console.log('\n2. Testing POST /api/parse (Gemini)...');
    const parseRes = await request('POST', '/api/parse', { input: 'Vitrina Tel Aviv' });
    if (parseRes.data && parseRes.data.success && parseRes.data.restaurant.name === 'Vitrina') {
        console.log('✅ PASSED. AI parsed "Vitrina" correctly.');
    } else {
        console.log(`❌ FAILED.`, parseRes);
    }

    // 3. Test POST /api/restaurants (Add)
    console.log('\n3. Testing POST /api/restaurants (Write verification)...');
    const newRest = {
        name: 'API Verification Spot',
        city: 'Cybertron',
        notes: 'Created by verify_api.js',
    };
    const addRes = await request('POST', '/api/restaurants', { restaurant: newRest });
    if (addRes.data && addRes.data.success) {
        console.log(`✅ PASSED. Added restaurant ID: ${addRes.data.restaurant.id}`);

        // Clean up (optional, but good to keep db clean if we had a delete endpoint)
        // For now we just leave it or could try to delete via Supabase client if we wanted
    } else {
        console.log(`❌ FAILED.`, addRes);
    }
}

testApi().catch(console.error);
