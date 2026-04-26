const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const iconv = require('iconv-lite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'aitrader-secret-key-2024';
const JWT_EXPIRES_IN = '7d';
const DOUBAN_API_KEY = process.env.DOUBAN_API_KEY || 'ark-a3f277dd-bbb0-46f5-b62c-f2ce652ae309-183ff';
const DOUBAN_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

const port = process.env.PORT || 8080;
const publicDir = path.join(__dirname);

db.initDB();

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const API_PROXIES = {
    '/api/tencent': {
        target: 'https://qt.gtimg.cn',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://finance.qq.com'
        }
    },
    '/api/eastmoney': {
        target: 'https://push2.eastmoney.com',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://quote.eastmoney.com'
        }
    },
    '/api/emsearch': {
        target: 'https://searchapi.eastmoney.com',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://quote.eastmoney.com'
        }
    },
    '/api/163': {
        target: 'https://api.money.126.net',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://money.163.com'
        }
    },
    '/api/emnews': {
        target: 'https://np-listapi.eastmoney.com',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://np-listapi.eastmoney.com'
        }
    },
    '/api/emstocknews': {
        target: 'https://search-api-web.eastmoney.com',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://quote.eastmoney.com'
        }
    }
};

function proxyRequest(req, res, proxyConfig) {
    const targetUrl = proxyConfig.target + req.url.replace(/^\/api\/(tencent|eastmoney|emsearch|163|emnews|emstocknews)/, '');
    const parsedUrl = url.parse(targetUrl);

    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.path,
        method: req.method,
        headers: {
            ...proxyConfig.headers,
            'Accept': '*/*'
        }
    };

    const isTencent = proxyConfig.target.includes('gtimg.cn');
    const isEmSearch = proxyConfig.target.includes('searchapi.eastmoney.com');
    const isEmNews = proxyConfig.target.includes('np-listapi.eastmoney.com');

    const proxyReq = https.request(options, (proxyRes) => {
        const chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            let text;
            
            if (isTencent || isEmSearch) {
                text = iconv.decode(buffer, 'gbk');
            } else {
                text = buffer.toString('utf-8');
            }

            res.writeHead(proxyRes.statusCode, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'text/plain; charset=utf-8'
            });
            res.end(text);
        });
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    req.pipe(proxyReq, { end: true });
}

function searchStockInfo(message) {
    return new Promise((resolve) => {
        const stockCodes = extractStockCodes(message);
        if (stockCodes.length === 0) {
            resolve(null);
            return;
        }

        const code = stockCodes[0];
        const tencentUrl = `https://qt.gtimg.cn/q=${code}`;
        
        https.get(tencentUrl, { 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://finance.qq.com'
            },
            timeout: 5000
        }, (tencentRes) => {
            let data = '';
            tencentRes.on('data', chunk => data += chunk);
            tencentRes.on('end', () => {
                try {
                    const decoded = iconv.decode(Buffer.from(data, 'binary'), 'gbk');
                    const match = decoded.match(/="(.*)"/);
                    if (match) {
                        const fields = match[1].split('~');
                        if (fields.length >= 50) {
                            const volume = parseFloat(fields[6]) || 0;
                            const amount = parseFloat(fields[37]) || 0;
                            const turnoverRate = fields[38] ? `${fields[38]}%` : 'N/A';
                            const pe = fields[39] || 'N/A';
                            const pb = fields[40] || 'N/A';
                            const marketCap = fields[41] ? `${(parseFloat(fields[41]) / 100000000).toFixed(2)}亿` : 'N/A';
                            
                            const info = `
【实时行情数据】
股票名称: ${fields[1]}
股票代码: ${fields[2]}
当前价格: ¥${fields[3]}
涨跌幅: ${fields[32]}%
涨跌额: ${fields[31]}
今开: ¥${fields[5]}
最高: ¥${fields[33]}
最低: ¥${fields[34]}
昨收: ¥${fields[4]}
成交量: ${volume.toLocaleString()}手
成交额: ¥${(amount / 10000).toFixed(2)}万
换手率: ${turnoverRate}
市盈率(动): ${pe}
市净率: ${pb}
总市值: ${marketCap}
52周最高: ¥${fields[45]}
52周最低: ¥${fields[46]}
                            `.trim();
                            resolve(info);
                            return;
                        }
                    }
                    resolve(null);
                } catch (e) {
                    console.error('[Stock Info] Parse error:', e.message);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error('[Stock Info] Request error:', err.message);
            resolve(null);
        });
    });
}

function extractStockCodes(message) {
    const patterns = [
        /\b(60\d{3}|00\d{3}|30\d{3}|688\d{3})\b/g,
        /\b[A-Z]{1,5}\b/g,
    ];
    
    const codes = [];
    for (const pattern of patterns) {
        const matches = message.match(pattern);
        if (matches) {
            codes.push(...matches.map(m => {
                if (/^\d{4,6}$/.test(m)) {
                    return m.startsWith('6') ? `sh${m}` : `sz${m}`;
                }
                return m;
            }));
        }
    }
    
    return codes.length > 0 ? codes : ['sh000001'];
}

function getTokenFromHeader(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

function handleAuthRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/auth/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { email, password, name } = JSON.parse(body);
                
                if (!email || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '邮箱和密码不能为空' }));
                    return;
                }

                const existingUser = db.getUserByEmail(email);
                if (existingUser) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '该邮箱已被注册' }));
                    return;
                }

                const userId = db.createUser(email, password, name || '');
                const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

                res.writeHead(200);
                res.end(JSON.stringify({ 
                    message: '注册成功', 
                    token, 
                    user: { id: userId, email, name: name || '' } 
                }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '注册失败: ' + err.message }));
            }
        });
    } else if (req.url === '/api/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { email, password } = JSON.parse(body);
                
                if (!email || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '邮箱和密码不能为空' }));
                    return;
                }

                const user = db.getUserByEmail(email);
                if (!user) {
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: '邮箱或密码错误' }));
                    return;
                }

                const isValidPassword = bcrypt.compareSync(password, user.password);
                if (!isValidPassword) {
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: '邮箱或密码错误' }));
                    return;
                }

                const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

                res.writeHead(200);
                res.end(JSON.stringify({ 
                    message: '登录成功', 
                    token, 
                    user: { id: user.id, email: user.email, name: user.name } 
                }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '登录失败: ' + err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
}

function handleUserRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const token = getTokenFromHeader(req);
    if (!token) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: '未登录' }));
        return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Token无效或已过期' }));
        return;
    }

    if (req.url === '/api/user/data' && req.method === 'GET') {
        try {
            const userData = db.getUserData(decoded.id);
            if (userData) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    watchlist: userData.watchlist || [],
                    portfolio: userData.portfolio || []
                }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: '用户不存在' }));
            }
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: '获取数据失败' }));
        }
    } else if (req.url === '/api/user/watchlist' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { watchlist } = JSON.parse(body);
                db.updateUserWatchlist(decoded.id, watchlist);
                res.writeHead(200);
                res.end(JSON.stringify({ message: '自选股已保存' }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '保存失败' }));
            }
        });
    } else if (req.url === '/api/user/portfolio' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { portfolio } = JSON.parse(body);
                db.updateUserPortfolio(decoded.id, portfolio);
                res.writeHead(200);
                res.end(JSON.stringify({ message: '持仓已保存' }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '保存失败' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
}

async function handleChatRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const token = getTokenFromHeader(req);
    if (!token) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: '请先登录' }));
        return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Token无效或已过期' }));
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { messages, model } = JSON.parse(body);
                
                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '消息格式错误' }));
                    return;
                }

                const selectedModel = model || 'doubao-pro-32k';
                
                const response = await fetch(`${DOUBAN_API_BASE}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${DOUBAN_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: messages,
                        stream: false
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[Doubao API Error]', response.status, errorText);
                    res.writeHead(502);
                    res.end(JSON.stringify({ error: 'AI服务请求失败', details: errorText }));
                    return;
                }

                const data = await response.json();
                
                if (data.error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: data.error.message || 'AI服务错误' }));
                    return;
                }

                const assistantMessage = data.choices[0].message;
                
                const userId = decoded.id;
                db.saveChatHistory(userId, messages, assistantMessage, selectedModel);

                res.writeHead(200);
                res.end(JSON.stringify({
                    message: assistantMessage.content,
                    usage: data.usage,
                    model: selectedModel,
                    id: data.id
                }));
            } catch (err) {
                console.error('[Chat Error]', err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: '处理失败: ' + err.message }));
            }
        });
    } else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: '不支持的请求方法' }));
    }
}

function handleChatHistoryRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const token = getTokenFromHeader(req);
    if (!token) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: '请先登录' }));
        return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Token无效或已过期' }));
        return;
    }

    if (req.url.startsWith('/api/ai/history') && req.method === 'GET') {
        try {
            const stockCode = new URL(req.url, 'http://localhost').searchParams.get('stockCode');
            const history = db.getChatHistory(decoded.id, stockCode);
            res.writeHead(200);
            res.end(JSON.stringify({ history }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: '获取历史记录失败' }));
        }
    } else if (req.url.startsWith('/api/ai/history/') && req.method === 'DELETE') {
        const chatId = req.url.split('/').pop();
        try {
            db.deleteChatHistory(decoded.id, chatId);
            res.writeHead(200);
            res.end(JSON.stringify({ message: '删除成功' }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: '删除失败' }));
        }
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
}

function handleChatModelsRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const models = [
        { id: 'doubao-pro-32k', name: '豆包Pro 32K', description: '适合日常对话和投资分析，性价比高', contextWindow: 32000 },
        { id: 'doubao-pro-128k', name: '豆包Pro 128K', description: '超长上下文，可分析年报、财报等长文档', contextWindow: 128000 },
        { id: 'doubao-thinking-pro', name: '豆包思考Pro', description: '深度推理能力，适合复杂投资策略分析', contextWindow: 32000 }
    ];

    res.writeHead(200);
    res.end(JSON.stringify({ models }));
}

const server = http.createServer((req, res) => {
    console.log('[Server] Request:', req.method, req.url);
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    let isProxyRequest = false;
    for (const [proxyPath, proxyConfig] of Object.entries(API_PROXIES)) {
        if (req.url.startsWith(proxyPath)) {
            proxyRequest(req, res, proxyConfig);
            isProxyRequest = true;
            break;
        }
    }

    if (isProxyRequest) return;

    if (req.url.startsWith('/api/auth/')) {
        handleAuthRequest(req, res);
        return;
    }

    if (req.url.startsWith('/api/user/')) {
        handleUserRequest(req, res);
        return;
    }

    if (req.url.startsWith('/api/ai/chat')) {
        handleChatRequest(req, res);
        return;
    }

    if (req.url.startsWith('/api/ai/history')) {
        handleChatHistoryRequest(req, res);
        return;
    }

    if (req.url === '/api/ai/models') {
        handleChatModelsRequest(req, res);
        return;
    }

    const cleanUrl = req.url.split('?')[0];
    let filePath = path.join(publicDir, cleanUrl === '/' ? 'index.html' : cleanUrl);

    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found\n');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code + '\n');
            }
        } else {
            const headers = { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            };
            
            if (extname === '.js' || extname === '.css' || extname === '.html') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                headers['Pragma'] = 'no-cache';
                headers['Expires'] = '0';
            }
            
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log(`AITrader server running at http://localhost:${port}`);
    console.log(`API Proxy enabled:`);
    console.log(`  - /api/tencent/* -> https://qt.gtimg.cn`);
    console.log(`  - /api/eastmoney/* -> https://push2.eastmoney.com`);
    console.log(`  - /api/163/* -> https://api.money.126.net`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});
