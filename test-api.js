const https = require('https');

console.log('测试 CoinGecko API 获取 BTC 数据...\n');

https.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('\n返回数据:');
        try {
            const json = JSON.parse(data);
            if (json.length > 0) {
                const btc = json[0];
                console.log('名称:', btc.name);
                console.log('符号:', btc.symbol.toUpperCase());
                console.log('当前价格: $', btc.current_price);
                console.log('24h涨跌:', btc.price_change_percentage_24h?.toFixed(2), '%');
                console.log('24h最高: $', btc.high_24h);
                console.log('24h最低: $', btc.low_24h);
                console.log('市值: $', btc.market_cap);
            }
        } catch (e) {
            console.log(data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.error('请求失败:', err.message);
});
