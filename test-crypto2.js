const https = require('https');

function testAPI(name, url, timeout = 15000) {
    console.log(`\n测试 ${name}...`);
    console.log(`URL: ${url}`);
    
    const req = https.get(url, { 
        timeout: timeout,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`  状态码: ${res.statusCode}`);
            console.log(`  数据长度: ${data.length}`);
            if (data.length > 0) {
                console.log(`  数据: ${data.substring(0, 500)}`);
            }
        });
    });
    
    req.on('error', (e) => {
        console.log(`  错误: ${e.message}`);
    });
    
    req.on('timeout', () => {
        console.log(`  超时: ${timeout}ms内无响应`);
        req.destroy();
    });
}

testAPI('币安BTC', 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
testAPI('OKX BTC', 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');
