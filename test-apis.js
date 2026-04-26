const https = require('https');
const http = require('http');

function testAPI(name, url, useHTTPS = true) {
    console.log(`\n测试 ${name}...`);
    const startTime = Date.now();
    
    const lib = useHTTPS ? https : http;
    
    const req = lib.get(url, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const elapsed = Date.now() - startTime;
            console.log(`  状态码: ${res.statusCode}`);
            console.log(`  耗时: ${elapsed}ms`);
            console.log(`  数据长度: ${data.length}`);
            if (data.length > 0) {
                console.log(`  预览: ${data.substring(0, 200)}`);
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

console.log('=== API 可用性测试 ===\n');

testAPI('新浪财经', 'https://hq.sinajs.cn/list=sh600519');
testAPI('CoinGecko (BTC)', 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin');
testAPI('Yahoo Finance', 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d');

setTimeout(() => {
    console.log('\n=== 测试完成 ===');
}, 15000);
