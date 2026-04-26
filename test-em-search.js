const https = require('https');

const input = '中际旭创';
const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(input)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&markettype=&mktnum=&wbp=&uwp=&clientid=`;

console.log('Testing Eastmoney search API...');
console.log('URL:', url);

const options = {
    hostname: 'searchapi.eastmoney.com',
    port: 443,
    path: `/api/suggest/get?input=${encodeURIComponent(input)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&markettype=&mktnum=&wbp=&uwp=&clientid=`,
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://quote.eastmoney.com'
    },
    timeout: 10000
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        try {
            const parsed = JSON.parse(data);
            console.log('\nParsed structure:');
            console.log('Keys:', Object.keys(parsed));
            if (parsed.QuotationCodeTable) {
                console.log('QuotationCodeTable keys:', Object.keys(parsed.QuotationCodeTable));
                if (parsed.QuotationCodeTable.Data) {
                    console.log('Data length:', parsed.QuotationCodeTable.Data.length);
                    console.log('First item:', JSON.stringify(parsed.QuotationCodeTable.Data[0], null, 2));
                }
            }
        } catch (e) {
            console.log('Parse error:', e.message);
        }
    });
});

req.on('error', (err) => {
    console.error('Error:', err.message);
});

req.on('timeout', () => {
    req.destroy();
    console.log('Timeout');
});

req.end();
