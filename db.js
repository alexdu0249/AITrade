const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'users.json');

let users = [];

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            users = JSON.parse(data);
        } else {
            users = [];
            saveDB();
        }
    } catch (err) {
        users = [];
    }
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function initDB() {
    loadDB();
    console.log('Database initialized');
}

function getUserByEmail(email) {
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function createUser(email, password, name = '') {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = {
        id: Date.now(),
        email,
        password: hashedPassword,
        name,
        watchlist: [],
        portfolio: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    users.push(user);
    saveDB();
    return user.id;
}

function updateUserWatchlist(userId, watchlist) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.watchlist = watchlist;
        user.updated_at = new Date().toISOString();
        saveDB();
    }
}

function updateUserPortfolio(userId, portfolio) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.portfolio = portfolio;
        user.updated_at = new Date().toISOString();
        saveDB();
    }
}

function getUserData(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        return {
            watchlist: user.watchlist || [],
            portfolio: user.portfolio || []
        };
    }
    return null;
}

function saveChatHistory(userId, messages, assistantMessage, model) {
    const user = users.find(u => u.id === userId);
    if (user) {
        if (!user.chatHistory) {
            user.chatHistory = [];
        }
        
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        
        const chatRecord = {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userMessage: lastUserMessage ? lastUserMessage.content : '',
            assistantMessage: assistantMessage.content,
            model: model,
            stockCodes: extractStockCodes(lastUserMessage ? lastUserMessage.content : ''),
            createdAt: new Date().toISOString()
        };
        
        user.chatHistory.push(chatRecord);
        user.updated_at = new Date().toISOString();
        saveDB();
        return chatRecord.id;
    }
    return null;
}

function extractStockCodes(text) {
    if (!text) return [];
    
    const codes = [];
    const patterns = [
        /\b(60\d{3}|00\d{3}|30\d{3}|688\d{3})\b/g,
        /\b[A-Z]{1,5}\b/g,
    ];
    
    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            codes.push(...matches);
        }
    }

    const stockNames = {
        '贵州茅台': ['600519', '茅台'],
        '茅台': ['600519'],
        '腾讯': ['00700', '0700', 'TCEHY'],
        '阿里巴巴': ['09988', '9988', 'BABA'],
        '阿里': ['09988', '9988', 'BABA'],
        '美团': ['03690', '3690', 'MPNGF'],
        '京东': ['09618', '9618', 'JD'],
        '百度': ['09888', '9888', 'BIDU'],
        '拼多多': ['PDD'],
        '网易': ['09999', '9999', 'NTES'],
        '小米': ['01810', '1810', 'XIACF'],
        '比亚迪': ['002594', '2594', 'BYDDY'],
        '比亚迪': ['1211', 'BYDDF'],
        '宁德时代': ['300750', '750', 'CATL'],
        '招商银行': ['600036', '36', 'CMB'],
        '中国平安': ['601318', '1318', 'PNGAY'],
        '五粮液': ['000858', '858'],
        '中国石油': ['601857', '857', 'PTR'],
        '工商银行': ['601398', '1398', 'IDCBF'],
        '建设银行': ['601939', '939', 'CICHF'],
        '农业银行': ['601288', '1288', 'ACGBF'],
        '中国移动': ['600941', '941', 'CHL'],
        '中国银行': ['601988', '988', 'BACHF'],
        '中国人寿': ['601628', '628', 'LFC'],
        '苹果': ['AAPL', 'Apple'],
        '微软': ['MSFT', 'Microsoft'],
        '谷歌': ['GOOGL', 'GOOG', 'Google'],
        '亚马逊': ['AMZN', 'Amazon'],
        '特斯拉': ['TSLA', 'Tesla'],
        'Meta': ['META', 'Facebook'],
        '英伟达': ['NVDA', 'NVIDIA'],
        '台积电': ['TSM', 'TSMC']
    };

    for (const [name, nameCodes] of Object.entries(stockNames)) {
        if (text.includes(name)) {
            codes.push(...nameCodes);
            codes.push(name);
        }
    }

    return [...new Set(codes)];
}

function getChatHistory(userId, stockCode = null) {
    const user = users.find(u => u.id === userId);
    if (!user || !user.chatHistory) {
        return [];
    }
    
    let history = user.chatHistory;
    
    if (stockCode) {
        history = history.filter(chat => {
            const messageLower = chat.userMessage.toLowerCase();
            const codeLower = stockCode.toLowerCase();
            
            const exactMatch = chat.stockCodes && chat.stockCodes.some(code => 
                code.toLowerCase() === codeLower ||
                code.toLowerCase() === stockCode.toLowerCase()
            );
            
            const textMatch = messageLower.includes(stockCode.toLowerCase());
            
            const nameMatch = isStockRelated(messageLower, stockCode);

            return exactMatch || textMatch || nameMatch;
        });
    }
    
    return history.reverse().slice(0, 50);
}

function isStockRelated(message, stockCode) {
    const stockNameMap = {
        '600519': ['贵州茅台', '茅台'],
        '00700': ['腾讯', '騰訊'],
        '09988': ['阿里巴巴', '阿里', '阿里巴巴集团'],
        '03690': ['美团'],
        '09618': ['京东'],
        '09888': ['百度'],
        'PDD': ['拼多多'],
        '09999': ['网易'],
        '01810': ['小米'],
        '002594': ['比亚迪'],
        '300750': ['宁德时代'],
        '600036': ['招商银行'],
        '601318': ['中国平安'],
        '000858': ['五粮液'],
        '601857': ['中国石油'],
        '601398': ['工商银行'],
        '601939': ['建设银行'],
        '601288': ['农业银行'],
        '600941': ['中国移动'],
        '601988': ['中国银行'],
        '601628': ['中国人寿'],
        'AAPL': ['apple', '苹果', '苹果公司'],
        'MSFT': ['microsoft', '微软'],
        'GOOGL': ['google', '谷歌', 'alphabet'],
        'AMZN': ['amazon', '亚马逊'],
        'TSLA': ['tesla', '特斯拉'],
        'META': ['meta', 'facebook', '脸书'],
        'NVDA': ['nvidia', '英伟达'],
        'TSM': ['tsmc', '台积电', '台灣積體電路']
    };

    const names = stockNameMap[stockCode] || [];
    const messageLower = message.toLowerCase();

    return names.some(name => messageLower.includes(name.toLowerCase()));
}

function deleteChatHistory(userId, chatId) {
    const user = users.find(u => u.id === userId);
    if (user && user.chatHistory) {
        user.chatHistory = user.chatHistory.filter(chat => chat.id !== chatId);
        user.updated_at = new Date().toISOString();
        saveDB();
    }
}

module.exports = {
    initDB,
    getUserByEmail,
    createUser,
    updateUserWatchlist,
    updateUserPortfolio,
    getUserData,
    saveChatHistory,
    getChatHistory,
    deleteChatHistory
};
