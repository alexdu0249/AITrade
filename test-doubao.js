const https = require('https');

const API_KEY = 'ark-a3f277dd-bbb0-46f5-b62c-f2ce652ae309-183ff';
const API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

async function testDoubaoAPI() {
    console.log('Testing Doubao API...');
    console.log('API Key:', API_KEY.substring(0, 20) + '...');
    console.log('API Base:', API_BASE);
    
    const testData = {
        model: 'doubao-pro-32k',
        messages: [
            { role: 'user', content: '你好' }
        ],
        stream: false
    };
    
    console.log('\nRequest data:', JSON.stringify(testData, null, 2));
    
    try {
        const response = await fetch(`${API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(testData)
        });
        
        console.log('\nResponse status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));
        
        const text = await response.text();
        console.log('\nResponse body:', text);
        
        if (response.ok) {
            const data = JSON.parse(text);
            console.log('\nSuccess! AI response:', data.choices[0].message.content);
        } else {
            console.log('\nError! Status:', response.status);
        }
    } catch (err) {
        console.error('\nFetch error:', err.message);
        console.error('Full error:', err);
    }
}

testDoubaoAPI();
