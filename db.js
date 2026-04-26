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
    const patterns = [
        /\b(60\d{3}|00\d{3}|30\d{3}|688\d{3})\b/g,
        /\b[A-Z]{1,5}\b/g,
    ];
    
    const codes = [];
    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            codes.push(...matches);
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
            if (!chat.stockCodes || chat.stockCodes.length === 0) {
                return chat.userMessage.toLowerCase().includes(stockCode.toLowerCase());
            }
            return chat.stockCodes.some(code => 
                code.toLowerCase() === stockCode.toLowerCase() ||
                chat.userMessage.toLowerCase().includes(code.toLowerCase())
            );
        });
    }
    
    return history.reverse().slice(0, 50);
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
