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

module.exports = {
    initDB,
    getUserByEmail,
    createUser,
    updateUserWatchlist,
    updateUserPortfolio,
    getUserData
};
