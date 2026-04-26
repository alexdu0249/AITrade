const https = require('https');

const payload = {
    model: 'bot-20260426121240-8p5mj',
    messages: [
        { role: 'user', content: '你好' }
    ],
    stream: true,
    stream_options: { include_usage: true }
};

const options = {
    hostname: 'ark.cn-beijing.volces.com',
    port: 443,
    path: '/api/v3/bots/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ark-a3f277dd-bbb0-46f5-b62c-f2ce652ae309-183ff'
    }
};

const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    
    let rawResponse = '';
    let fullContent = '';
    
    res.on('data', (chunk) => {
        const text = chunk.toString();
        rawResponse += text;
        console.log('--- RAW CHUNK ---');
        console.log(text.substring(0, 500));
        
        const lines = text.split('\n').filter(line => line.trim());
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                    console.log('--- STREAM DONE ---');
                    continue;
                }
                try {
                    const parsed = JSON.parse(data);
                    console.log('--- PARSED ---');
                    console.log(JSON.stringify(parsed, null, 2).substring(0, 300));
                    const delta = parsed.choices?.[0]?.delta;
                    if (delta?.content) fullContent += delta.content;
                    if (parsed.error) console.error('ERROR:', JSON.stringify(parsed.error));
                } catch (e) {
                    console.log('PARSE ERROR:', e.message, 'data:', data.substring(0, 100));
                }
            }
        }
    });
    
    res.on('end', () => {
        console.log('\n=== FINAL RESULT ===');
        console.log('Full content:', fullContent);
        console.log('Raw response length:', rawResponse.length);
        console.log('Raw response (first 1000):', rawResponse.substring(0, 1000));
    });
});

req.on('error', (err) => {
    console.error('Request error:', err.message);
});

req.write(JSON.stringify(payload));
req.end();
