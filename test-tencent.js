const https = require('https');

function testTencentAPI(code) {
    const url = `https://qt.gtimg.cn/q=${code}`;
    console.log(`\n测试腾讯API: ${url}`);
    
    https.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://finance.qq.com'
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`状态码: ${res.statusCode}`);
            console.log(`数据长度: ${data.length}`);
            console.log(`数据内容:`);
            console.log(data);
        });
    }).on('error', (err) => {
        console.error(`错误: ${err.message}`);
    });
}

// 测试BTC
testTencentAPI('hf_BTCUSD');

// 测试A股
testTencentAPI('sh600519');

// 测试美股
testTencentAPI('usAAPL');
