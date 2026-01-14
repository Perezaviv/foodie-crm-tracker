
const fs = require('fs');
const path = require('path');

async function testUpload() {
    console.log('Starting upload test...');

    // Create a dummy file
    const dummyPath = path.join(__dirname, 'test-image.jpg');
    fs.writeFileSync(dummyPath, 'fake image content');

    try {
        const formData = new FormData();
        formData.append('restaurantId', 'test-restaurant-id');

        // In Node, we need to read the file and append it as a Blob/File compatible object
        // NOTE: This might be tricky in pure Node environment without extra libs if the API strictly expects a File object
        // identifying as image/jpeg. 
        // We'll mimic the fetch request structure.

        const fileContent = new Blob(['fake image content'], { type: 'image/jpeg' });
        formData.append('files', fileContent, 'test-image.jpg');

        console.log('Sending request...');
        const response = await fetch('http://localhost:3000/api/photos', {
            method: 'POST',
            body: formData,
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Cleanup
        if (fs.existsSync(dummyPath)) {
            fs.unlinkSync(dummyPath);
        }
    }
}

testUpload();
