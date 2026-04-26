const http = require('http');

console.log('测试本地加密货币API...\n');

http.get('http://localhost:8080/api/crypto', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        console.log(`数据长度: ${data.length}`);
        console.log('\n数据内容:');
        try {
            const parsed = JSON.parse(data);
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
}).on('error', (err) => {
    console.error(`错误: ${err.message}`);
});
