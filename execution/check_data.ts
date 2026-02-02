
import { getRestaurants, getHappyHours } from '../lib/skills/db';

async function checkData() {
    console.log('Checking Regular Restaurants...');
    const regResult = await getRestaurants();
    if (regResult.success) {
        const total = regResult.data?.length || 0;
        const withCoords = regResult.data?.filter(r => r.lat && r.lng).length || 0;
        console.log(`Regular Restaurants: Total=${total}, With Coords=${withCoords}`);
        if (total > 0) {
            console.log('Sample Regular Restaurants locations:', regResult.data?.map(r => ({ name: r.name, lat: r.lat, lng: r.lng, address: r.address })));
        }
        if (total > 0 && withCoords === 0) {
            console.log('WARNING: No regular restaurants have coordinates!');
            console.log('Sample:', regResult.data?.[0]);
        }
    } else {
        console.error('Failed to get regular restaurants:', regResult.error);
    }

    console.log('\nChecking Happy Hour locations...');
    const hhResult = await getHappyHours();
    if (hhResult.success) {
        const total = hhResult.data?.length || 0;
        const withCoords = hhResult.data?.filter(r => r.lat && r.lng).length || 0;
        console.log(`Happy Hour Restaurants: Total=${total}, With Coords=${withCoords}`);
    } else {
        console.error('Failed to get happy hours:', hhResult.error);
    }
}

checkData().catch(console.error);
