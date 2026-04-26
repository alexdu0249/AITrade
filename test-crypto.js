const https = require('https');
const http = require('http');

function testAPI(name, url, useHTTPS = true) {
    console.log(`\n测试 ${name}...`);
    console.log(`URL: ${url}`);
    
    const lib = useHTTPS ? https : http;
    
    const req = lib.get(url, { 
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const elapsed = Date.now();
            console.log(`  状态码: ${res.statusCode}`);
            console.log(`  数据长度: ${data.length}`);
            if (data.length > 0) {
                console.log(`  预览: ${data.substring(0, 300)}`);
            }
        });
    });
    
    req.on('error', (e) => {
        console.log(`  错误: ${e.message}`);
    });
    
    req.on('timeout', () => {
        console.log(`  超时: 10秒内无响应`);
        req.destroy();
    });
}

// 测试东方财富加密货币API
testAPI('东方财富BTC', 'https://push2.eastmoney.com/api/qt/stock/get?secid=133.BTC&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170');

// 测试OKX API
testAPI('OKX BTC', 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');

// 测试币安API
testAPI('币安BTC', 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');

// 测试腾讯其他加密货币格式
testAPI('腾讯BTC格式1', 'https://qt.gtimg.cn/q=hf_BTC');
testAPI('腾讯BTC格式2', 'https://qt.gtimg.cn/q=hf_XBTUSD');
testAPI('腾讯BTC格式3', 'https://qt.gtimg.cn/q=hf_COIN');
