const https = require('https');
const http = require('http');

function testAPI(name, url, useHTTPS = true) {
    return new Promise((resolve) => {
        console.log(`\n测试 ${name}...`);
        console.log(`URL: ${url}`);
        
        const lib = useHTTPS ? https : http;
        
        const req = lib.get(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': useHTTPS ? 'https://quote.eastmoney.com' : 'https://finance.sina.com.cn'
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
                resolve({ success: true, data });
            });
        });
        
        req.on('error', (e) => {
            console.log(`  错误: ${e.message}`);
            resolve({ success: false, error: e.message });
        });
        
        req.on('timeout', () => {
            console.log(`  超时: 10秒内无响应`);
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });
    });
}

async function runTests() {
    // 测试东方财富加密货币
    await testAPI('东方财富BTC', 'https://push2.eastmoney.com/api/qt/stock/get?secid=133.BTC&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170');
    
    // 测试东方财富行情列表
    await testAPI('东方财富行情列表', 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10&fs=m:133&fields=f2,f3,f4,f12,f14');
    
    // 测试新浪财经加密货币
    await testAPI('新浪BTC', 'https://hq.sinajs.cn/list=hf_BTC');
    
    // 测试网易财经加密货币
    await testAPI('网易BTC', 'https://api.money.126.net/data/feed/hf_BTCUSD,money.api');
    
    // 测试腾讯其他格式
    await testAPI('腾讯BTC-USD', 'https://qt.gtimg.cn/q=BTCUSD');
    await testAPI('腾讯BTCUSDT', 'https://qt.gtimg.cn/q=BTCUSDT');
}

runTests();
