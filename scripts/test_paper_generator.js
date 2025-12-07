const axios = require('axios');
const fs = require('fs');

async function testPaperGenerator() {
    try {
        console.log('Testing Paper Generator...');
        const response = await axios.post('http://localhost:3003/generate-certified-copy', {
            legal_name: 'John Doe',
            tin: '123456789',
            nationality: 'KY'
        });

        if (response.data.status === 'SUCCESS' && response.data.file === 'certified_copy.pdf') {
            console.log('PASS: PDF generated successfully.');
            if (fs.existsSync('certified_copy.pdf')) {
                console.log('PASS: File exists on disk.');
            } else {
                console.log('FAIL: File not found on disk.');
            }
        } else {
            console.log('FAIL: Unexpected response:', response.data);
        }
    } catch (error) {
        console.error('FAIL: Error calling service:', error.message);
    }
}

testPaperGenerator();
