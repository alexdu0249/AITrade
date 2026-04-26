const https = require('https');
const http = require('http');

function testAPI(name, url, useHTTPS = true) {
    return new Promise((resolve) => {
        console.log(`\n测试 ${name}...`);
        
        const lib = useHTTPS ? https : http;
        
        const req = lib.get(url, { 
            timeout: 15000,
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
                    console.log(`  数据: ${data.substring(0, 600)}`);
                }
                resolve({ success: true, data });
            });
        });
        
        req.on('error', (e) => {
            console.log(`  错误: ${e.message}`);
            resolve({ success: false, error: e.message });
        });
        
        req.on('timeout', () => {
            console.log(`  超时`);
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });
    });
}

async function runTests() {
    // OKX API (中国交易所)
    await testAPI('OKX BTC-USDT', 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');
    await testAPI('OKX ETH-USDT', 'https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT');
    
    // Gate.io API
    await testAPI('Gate.io BTC', 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT');
    
    // Huobi/HTX API
    await testAPI('HTX BTC', 'https://api.huobi.pro/market/detail/merged?symbol=btcusdt');
    
    // CoinGecko simple
    await testAPI('CoinGecko simple', 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
}

runTests();
