const https = require('https');

const API_KEY = 'ark-a3f277dd-bbb0-46f5-b62c-f2ce652ae309-183ff';
const API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

const modelsToTest = [
    'doubao-1-5-lite-32k',
    'doubao-1-5-pro-32k', 
    'doubao-1-5-pro-128k',
    'doubao-lite-32k-250115',
    'doubao-pro-32k-250115',
    'doubao-pro-128k-250115'
];

async function testModel(modelName) {
    try {
        const response = await fetch(`${API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: '你好' }],
                stream: false,
                max_tokens: 10
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.choices) {
            console.log(`✅ ${modelName} - SUCCESS`);
            console.log(`   Response: ${data.choices[0].message.content.substring(0, 50)}...`);
            return true;
        } else {
            console.log(`❌ ${modelName} - ${data.error?.code || response.status}`);
            return false;
        }
    } catch (err) {
        console.log(`❌ ${modelName} - Error: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log('Testing available models...\n');
    
    for (const model of modelsToTest) {
        await testModel(model);
    }
    
    console.log('\nDone!');
}

main();
