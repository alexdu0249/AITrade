class AITraderApp {
    constructor() {
        this.watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        this.portfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');
        this.refreshInterval = null;
        this.watchlistFilter = 'all';
        this.portfolioFilter = 'all';
        this.scanResults = [];
        this.currentStock = null;
        this.currentNewsTab = 'news';
        this.newsPage = 1;
        this.newsPageSize = 5;
        this.newsLoading = false;
        this.newsHasMore = true;
        this.allNews = [];
        this.newsInitialized = false;
        this.newsObserver = null;
        this.currentChartRange = '1d';

        this.homeNewsPage = 1;
        this.homeNewsPageSize = 10;
        this.homeNewsLoading = false;
        this.homeNewsHasMore = true;
        this.homeNewsObserver = null;

        this.token = localStorage.getItem('token') || null;
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

        this.aiConversationHistory = [];
        this.selectedAiModel = localStorage.getItem('selectedAiModel') || 'doubao-pro-32k';

        this.init();
        this.registerSW();
    }

    registerSW() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    const registration = await navigator.serviceWorker.register('./sw.js?v=6', {
                        scope: './'
                    });
                    console.log('SW registered: ', registration);
                    
                    // Force update if there's a new SW waiting
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    
                    // Listen for controller change
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        console.log('SW controller changed, reloading...');
                        window.location.reload();
                    });
                } catch (registrationError) {
                    console.log('SW registration failed: ', registrationError);
                }
            });
        }
    }

    init() {
        this.bindEvents();
        this.updateAuthUI();
        this.renderWatchlist();
        this.renderPortfolio();
        this.loadMarketData();
        this.startAutoRefresh();
    }

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.querySelectorAll('.market-tab').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMarket(e.target.dataset.market));
        });

        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshAll());
        document.getElementById('addBtn').addEventListener('click', () => this.showAddModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideAddModal());
        document.getElementById('submitAdd').addEventListener('click', () => this.addStock());
        document.getElementById('closePortfolioModal').addEventListener('click', () => this.hidePortfolioModal());
        document.getElementById('submitPortfolio').addEventListener('click', () => this.addPortfolioItem());

        document.getElementById('searchInput').addEventListener('input', (e) => this.searchStocks(e.target.value));

        document.getElementById('addModal').addEventListener('click', (e) => {
            if (e.target.id === 'addModal') this.hideAddModal();
        });

        document.getElementById('portfolioModal').addEventListener('click', (e) => {
            if (e.target.id === 'portfolioModal') this.hidePortfolioModal();
        });

        document.getElementById('backBtn').addEventListener('click', () => this.hideStockDetail());
        document.getElementById('newsBackBtn').addEventListener('click', () => this.hideNewsDetail());

        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchChartRange(e.target.dataset.range));
        });

        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchFilter(e.target));
        });

        document.getElementById('scanBtn').addEventListener('click', () => this.showScanModal());
        document.getElementById('closeScanModal').addEventListener('click', () => this.hideScanModal());
        document.getElementById('scanUploadArea').addEventListener('click', () => document.getElementById('scanFileInput').click());
        document.getElementById('scanFileInput').addEventListener('change', (e) => this.handleScanImage(e));
        document.getElementById('submitScan').addEventListener('click', () => this.batchAddScanResults());

        document.getElementById('scanModal').addEventListener('click', (e) => {
            if (e.target.id === 'scanModal') this.hideScanModal();
        });

        document.getElementById('watchlistList').addEventListener('click', (e) => {
            const item = e.target.closest('.stock-item');
            if (item) {
                this.openStockDetail(item.dataset.code, item.dataset.name, item.dataset.market);
            }
        });

        document.getElementById('portfolioList').addEventListener('click', (e) => {
            const item = e.target.closest('.stock-item');
            if (item) {
                this.openStockDetail(item.dataset.code, item.dataset.name, item.dataset.market);
            }
        });

        document.getElementById('usMarketList').addEventListener('click', (e) => {
            const item = e.target.closest('.stock-item');
            if (item) {
                this.openStockDetail(item.dataset.code, item.dataset.name, item.dataset.market);
            }
        });

        document.getElementById('cnMarketList').addEventListener('click', (e) => {
            const item = e.target.closest('.stock-item');
            if (item) {
                this.openStockDetail(item.dataset.code, item.dataset.name, item.dataset.market);
            }
        });

        document.getElementById('newsList').addEventListener('click', (e) => {
            const item = e.target.closest('.news-item');
            if (item) {
                this.openNewsDetail({
                    title: item.dataset.title,
                    source: item.dataset.source,
                    time: item.dataset.time,
                    content: decodeURIComponent(item.dataset.content || '')
                });
            }
        });

        document.getElementById('homeNewsList').addEventListener('click', (e) => {
            const item = e.target.closest('.news-item');
            if (item) {
                this.openNewsDetail({
                    title: item.dataset.title,
                    source: item.dataset.source,
                    time: item.dataset.time,
                    content: decodeURIComponent(item.dataset.content || '')
                });
            }
        });

        document.getElementById('closeAuthModal').addEventListener('click', () => this.hideAuthModal());
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target.id === 'authModal') this.hideAuthModal();
        });

        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.auth));
        });

        document.getElementById('submitLogin').addEventListener('click', () => this.handleLogin());
        document.getElementById('submitRegister').addEventListener('click', () => this.handleRegister());

        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        document.getElementById('registerPasswordConfirm').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister();
        });

        document.getElementById('aiChatBtn').addEventListener('click', () => this.toggleAiChat());
        document.getElementById('closeAiChat').addEventListener('click', () => this.hideAiChat());
        document.getElementById('newChatBtn').addEventListener('click', () => this.newAiChat());
        document.getElementById('aiSendBtn').addEventListener('click', () => this.sendAiMessage());
        document.getElementById('aiInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendAiMessage();
            }
        });
        document.getElementById('aiInput').addEventListener('input', (e) => {
            this.autoResizeTextarea(e.target);
            this.updateTokenCount();
        });

        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const prompt = e.target.dataset.prompt;
                document.getElementById('aiInput').value = prompt;
                this.sendAiMessage();
            });
        });

        document.getElementById('switchModelBtn').addEventListener('click', () => this.showModelSelector());
        document.getElementById('closeModelSelector').addEventListener('click', () => this.hideModelSelector());

        document.querySelectorAll('.model-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const model = e.currentTarget.dataset.model;
                this.selectAiModel(model);
            });
        });

        document.querySelectorAll('.news-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchNewsTab(e.target.dataset.newsTab));
        });
    }

    switchNewsTab(tabName) {
        this.currentNewsTab = tabName;
        document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-news-tab="${tabName}"]`).classList.add('active');

        if (tabName === 'news') {
            document.getElementById('newsList').hidden = false;
            document.getElementById('aiNotesList').hidden = true;
        } else if (tabName === 'ainotes') {
            document.getElementById('newsList').hidden = true;
            document.getElementById('aiNotesList').hidden = false;
            this.loadAiNotesForStock();
        }
    }

    async loadAiNotesForStock() {
        if (!this.currentStock) return;

        const notesList = document.getElementById('aiNotesList');
        notesList.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>加载中...</p></div>';

        const notes = await this.loadAiNotes(this.currentStock.code);

        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>暂无AI笔记</p>
                    <p class="empty-hint">与AI讨论此股票后，对话将自动保存</p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = notes.map(note => `
            <div class="note-item" data-id="${note.id}">
                <div class="note-question">${this.escapeHtml(note.userMessage)}</div>
                <div class="note-time">${this.formatTime(note.createdAt)}</div>
            </div>
        `).join('');

        notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.id;
                const note = notes.find(n => n.id === noteId);
                if (note) {
                    this.showAiNoteDetail(note);
                }
            });
        });
    }

    showAiNoteDetail(note) {
        const notesList = document.getElementById('aiNotesList');
        notesList.innerHTML = `
            <div class="note-detail">
                <button class="back-btn" onclick="app.loadAiNotesForStock()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div class="note-question-full">${this.escapeHtml(note.userMessage)}</div>
                <div class="note-answer">${this.formatAiResponse(note.assistantMessage)}</div>
                <div class="note-actions">
                    <button class="note-action-btn" onclick="app.loadAiNotesForStock()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                        返回列表
                    </button>
                    <button class="note-action-btn" onclick="app.continueAiConversation('${note.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        继续对话
                    </button>
                    <button class="note-action-btn delete" onclick="app.confirmDeleteNote('${note.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        删除
                    </button>
                </div>
            </div>
        `;
    }

    async confirmDeleteNote(noteId) {
        if (confirm('确定要删除这条笔记吗？')) {
            await this.deleteAiNote(noteId);
            this.loadAiNotesForStock();
            this.showToast('笔记已删除');
        }
    }

    continueAiConversation(noteId) {
        if (!this.token) {
            this.showToast('请先登录');
            this.showAuthModal();
            return;
        }

        fetch(`/api/ai/history?stockCode=${encodeURIComponent(this.currentStock.code)}`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        })
        .then(res => res.json())
        .then(data => {
            const note = data.history.find(n => n.id === noteId);
            if (note) {
                this.aiConversationHistory = [
                    { role: 'user', content: note.userMessage },
                    { role: 'assistant', content: note.assistantMessage }
                ];

                this.hideStockDetail();
                this.showAiChat();

                document.getElementById('aiInput').value = note.userMessage;
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

        return date.toLocaleDateString('zh-CN');
    }

    setupNewsObserver() {
        if (this.newsObserver) {
            this.newsObserver.disconnect();
        }

        const sentinel = document.getElementById('newsSentinel');
        if (!sentinel) return;

        this.newsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadMoreNews();
                }
            });
        }, {
            root: document.getElementById('stockDetail'),
            rootMargin: '200px'
        });

        this.newsObserver.observe(sentinel);
    }

    openStockDetail(code, name, market) {
        if (code) {
            this.showStockDetail({ code, name, market });
        }
    }

    openNewsDetail(news) {
        if (news && news.title) {
            this.showNewsDetail(news);
        }
    }

    switchFilter(tab) {
        const filter = tab.dataset.filter;
        const parent = tab.closest('.tab-pane');
        
        parent.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (parent.id === 'watchlist') {
            this.watchlistFilter = filter;
            this.renderWatchlist();
        } else if (parent.id === 'portfolio') {
            this.portfolioFilter = filter;
            this.renderPortfolio();
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'home') {
            this.loadHomeData();
        } else if (tabName === 'markets') {
            this.loadMarketData();
        }
    }

    switchMarket(market) {
        document.querySelectorAll('.market-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.market-pane').forEach(pane => pane.classList.remove('active'));
        
        document.querySelector(`[data-market="${market}"]`).classList.add('active');
        document.getElementById(`market-${market}`).classList.add('active');
    }

    async fetchAStockData(codes) {
        const codeList = codes.map(code => {
            if (code.startsWith('6') || code.startsWith('9') || code.startsWith('5')) {
                return `sh${code}`;
            }
            return `sz${code}`;
        }).join(',');

        const url = `/api/tencent/q=${codeList}`;
        
        try {
            const response = await fetch(url);
            const text = await response.text();
            return this.parseTencentData(text);
        } catch (error) {
            console.error('A股数据获取失败:', error);
            return [];
        }
    }

    parseTencentData(text) {
        const lines = text.split(';').filter(line => line.trim());
        const results = [];

        lines.forEach(line => {
            const match = line.match(/v_(\w+)="(.*)"/);
            if (match) {
                const fullCode = match[1];
                const code = fullCode.substring(2);
                const fields = match[2].split('~');
                
                if (fields.length >= 40) {
                    const current = parseFloat(fields[3]);
                    const previousClose = parseFloat(fields[4]);
                    const change = current - previousClose;
                    const changePercent = (change / previousClose * 100).toFixed(2);

                    results.push({
                        code: code,
                        name: fields[1],
                        current: current,
                        previousClose: previousClose,
                        open: parseFloat(fields[5]),
                        high: parseFloat(fields[33]),
                        low: parseFloat(fields[34]),
                        change: change,
                        changePercent: changePercent,
                        volume: fields[6],
                        amount: fields[37],
                        market: 'cn'
                    });
                }
            }
        });

        return results;
    }

    async fetchUSStockData(symbols) {
        const results = [];
        
        for (const symbol of symbols) {
            try {
                const code = symbol.startsWith('^') ? symbol.substring(1) : symbol;
                const url = `/api/tencent/q=us${code}`;
                const response = await fetch(url);
                const text = await response.text();
                
                console.log(`[美股API] ${symbol} 原始数据:`, text.substring(0, 500));
                
                const match = text.match(/v_us\w+="(.*)"/);
                if (match) {
                    const fields = match[1].split('~');
                    console.log(`[美股API] ${symbol} 字段数量:`, fields.length);
                    console.log(`[美股API] ${symbol} 前10个字段:`, fields.slice(0, 10));
                    
                    if (fields.length >= 40) {
                        const current = parseFloat(fields[3]);
                        const previousClose = parseFloat(fields[4]);
                        const change = current - previousClose;
                        const changePercent = previousClose ? (change / previousClose * 100).toFixed(2) : '0.00';

                        results.push({
                            code: symbol,
                            name: fields[1] || symbol,
                            current: current,
                            previousClose: previousClose,
                            open: parseFloat(fields[5]),
                            high: parseFloat(fields[33]) || current,
                            low: parseFloat(fields[34]) || current,
                            change: change,
                            changePercent: changePercent,
                            volume: fields[6],
                            market: 'us'
                        });
                    }
                }
            } catch (error) {
                console.error(`美股${symbol}数据获取失败:`, error);
            }
        }

        return results;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderStockItem(stock, type = 'watchlist') {
        const changeClass = parseFloat(stock.changePercent) >= 0 ? 'price-up' : 'price-down';
        const changeSymbol = parseFloat(stock.changePercent) >= 0 ? '+' : '';
        
        const priceDisplay = stock.current?.toFixed(2) || '0.00';

        const actionsHtml = type === 'watchlist' ? `
            <div class="stock-actions">
                <button class="action-btn" onclick="app.removeStock('${stock.code}')" title="删除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        ` : `
            <div class="stock-actions">
                <button class="action-btn" onclick="app.removePortfolioItem('${stock.code}')" title="删除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        return `
            <div class="stock-item" data-code="${stock.code}" data-name="${stock.name}" data-market="${stock.market || 'us'}">
                <div class="stock-info">
                    <div class="stock-name">${stock.name}</div>
                    <div class="stock-code">${stock.code}</div>
                </div>
                <div class="stock-price">
                    <div class="price-value">${priceDisplay}</div>
                    <div class="price-change ${changeClass}">
                        ${changeSymbol}${stock.changePercent}%
                    </div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }

    renderWatchlist() {
        const container = document.getElementById('watchlistList');
        
        if (this.watchlist.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <p>点击 + 添加自选股</p>
                </div>
            `;
            return;
        }

        this.updateWatchlistData();
    }

    async updateWatchlistData() {
        const container = document.getElementById('watchlistList');
        let filteredList = this.watchlist;
        
        if (this.watchlistFilter !== 'all') {
            filteredList = this.watchlist.filter(s => s.market === this.watchlistFilter);
        }
        
        if (filteredList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <p>暂无${this.watchlistFilter === 'cn' ? 'A股' : '美股'}自选</p>
                </div>
            `;
            return;
        }
        
        const cnStocks = filteredList.filter(s => s.market === 'cn');
        const usStocks = filteredList.filter(s => s.market === 'us');

        let allData = [];

        if (cnStocks.length > 0) {
            const cnData = await this.fetchAStockData(cnStocks.map(s => s.code));
            allData = allData.concat(cnData);
        }

        if (usStocks.length > 0) {
            const usData = await this.fetchUSStockData(usStocks.map(s => s.code));
            allData = allData.concat(usData);
        }

        if (allData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <p>点击 + 添加自选股</p>
                </div>
            `;
            return;
        }

        container.innerHTML = allData.map(stock => this.renderStockItem(stock, 'watchlist')).join('');
    }

    renderPortfolio() {
        const container = document.getElementById('portfolioList');
        
        if (this.portfolio.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                    </svg>
                    <p>暂无持仓</p>
                </div>
            `;
            this.updatePortfolioSummary();
            return;
        }

        this.updatePortfolioData();
    }

    async updatePortfolioData() {
        const container = document.getElementById('portfolioList');
        
        let filteredPortfolio = this.portfolio;
        if (this.portfolioFilter !== 'all') {
            filteredPortfolio = this.portfolio.filter(p => {
                const stock = this.watchlist.find(s => s.code === p.code);
                return stock && stock.market === this.portfolioFilter;
            });
        }
        
        if (filteredPortfolio.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                    </svg>
                    <p>暂无${this.portfolioFilter === 'cn' ? 'A股' : '美股'}持仓</p>
                </div>
            `;
            this.updatePortfolioSummary();
            return;
        }
        
        const cnStocks = filteredPortfolio.filter(p => {
            const stock = this.watchlist.find(s => s.code === p.code);
            return stock && stock.market === 'cn';
        });
        const usStocks = filteredPortfolio.filter(p => {
            const stock = this.watchlist.find(s => s.code === p.code);
            return stock && stock.market === 'us';
        });

        let allData = [];

        if (cnStocks.length > 0) {
            const cnData = await this.fetchAStockData(cnStocks.map(s => s.code));
            allData = allData.concat(cnData);
        }

        if (usStocks.length > 0) {
            const usData = await this.fetchUSStockData(usStocks.map(s => s.code));
            allData = allData.concat(usData);
        }

        const portfolioHtml = filteredPortfolio.map(item => {
            const stockData = allData.find(s => s.code === item.code);
            if (!stockData) return '';

            const currentValue = stockData.current * item.quantity;
            const costValue = item.cost * item.quantity;
            const profit = currentValue - costValue;
            const profitPercent = (profit / costValue * 100).toFixed(2);
            const profitClass = profit >= 0 ? 'price-up' : 'price-down';
            const profitSymbol = profit >= 0 ? '+' : '';

            return `
                <div class="stock-item" data-code="${item.code}" data-name="${stockData.name}" data-market="${stockData.market || 'us'}">
                    <div class="stock-info">
                        <div class="stock-name">${stockData.name}</div>
                        <div class="stock-code">${item.code} · ${item.quantity}股</div>
                    </div>
                    <div class="stock-price">
                        <div class="price-value">${stockData.current.toFixed(2)}</div>
                        <div class="price-change ${profitClass}">
                            ${profitSymbol}${profit.toFixed(2)} (${profitSymbol}${profitPercent}%)
                        </div>
                    </div>
                    <div class="stock-actions">
                        <button class="action-btn" onclick="app.removePortfolioItem('${item.code}')" title="删除">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = portfolioHtml || '<div class="empty-state"><p>暂无持仓数据</p></div>';
        this.updatePortfolioSummary(allData);
    }

    updatePortfolioSummary(data = []) {
        let totalValue = 0;
        let totalCost = 0;

        this.portfolio.forEach(item => {
            const stockData = data.find(s => s.code === item.code);
            if (stockData) {
                totalValue += stockData.current * item.quantity;
                totalCost += item.cost * item.quantity;
            } else {
                totalValue += item.cost * item.quantity;
                totalCost += item.cost * item.quantity;
            }
        });

        const totalProfit = totalValue - totalCost;
        const profitClass = totalProfit >= 0 ? 'price-up' : 'price-down';

        document.getElementById('totalValue').textContent = `¥${totalValue.toFixed(2)}`;
        document.getElementById('totalProfit').textContent = `¥${totalProfit.toFixed(2)}`;
        document.getElementById('totalProfit').className = `value ${profitClass}`;
    }

    async loadMarketData() {
        this.loadUSMarket();
        this.loadCNMarket();
    }

    async loadHomeData() {
        this.loadHomeIndices();
        this.loadHomeNews();
    }

    async loadHomeIndices() {
        const container = document.getElementById('indexCards');
        const indices = [
            { code: '000001', name: '上证指数', market: 'cn' },
            { code: '399001', name: '深证成指', market: 'cn' },
            { code: 'SPY', name: '标普500', market: 'us' },
            { code: 'QQQ', name: '纳斯达克', market: 'us' }
        ];

        try {
            const cnIndices = indices.filter(i => i.market === 'cn');
            const usIndices = indices.filter(i => i.market === 'us');
            
            let allData = [];
            
            if (cnIndices.length > 0) {
                const cnData = await this.fetchAStockData(cnIndices.map(i => i.code));
                allData = allData.concat(cnData);
            }
            
            if (usIndices.length > 0) {
                const usData = await this.fetchUSStockData(usIndices.map(i => i.code));
                allData = allData.concat(usData);
            }

            container.innerHTML = allData.map(index => `
                <div class="index-card">
                    <div class="index-name">${index.name}</div>
                    <div class="index-value">${index.current.toFixed(2)}</div>
                    <div class="index-change ${index.change >= 0 ? 'up' : 'down'}">
                        ${index.change >= 0 ? '+' : ''}${index.changePercent}%
                    </div>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<div class="loading-state">数据加载失败</div>';
        }
    }

    async loadHomeNews() {
        const container = document.getElementById('homeNewsList');
        this.homeNewsPage = 1;
        this.homeNewsLoading = false;
        this.homeNewsHasMore = true;

        try {
            const url = `/api/emnews/comm/web/getNewsByColumns?client=web&biz=web_news_col&column=350&pageSize=${this.homeNewsPageSize}&pageIndex=1&req_trace=${Date.now()}`;
            const response = await fetch(url);
            const text = await response.text();
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                container.innerHTML = '<div class="empty-state"><p>资讯加载失败</p></div>';
                return;
            }

            if (data.data && data.data.list && data.data.list.length > 0) {
                this.homeNewsHasMore = data.data.list.length >= this.homeNewsPageSize;
                
                container.innerHTML = data.data.list.map(item => `
                    <div class="news-item" data-title="${item.title}" data-source="${item.mediaName}" data-time="${this.formatNewsTime(item.showTime)}" data-content="${encodeURIComponent(item.summary || '')}">
                        <div class="title">${item.title}</div>
                        <div class="meta">
                            <span class="source">${item.mediaName || '东方财富'}</span>
                            <span class="time">${this.formatNewsTime(item.showTime)}</span>
                        </div>
                    </div>
                `).join('') + '<div id="homeNewsSentinel" style="height:1px;"></div>';

                if (this.homeNewsHasMore) {
                    this.setupHomeNewsObserver();
                }
            } else {
                container.innerHTML = '<div class="empty-state"><p>暂无资讯</p></div>';
            }
        } catch (error) {
            container.innerHTML = '<div class="empty-state"><p>资讯加载失败</p></div>';
        }
    }

    setupHomeNewsObserver() {
        if (this.homeNewsObserver) {
            this.homeNewsObserver.disconnect();
        }

        const sentinel = document.getElementById('homeNewsSentinel');
        if (!sentinel) return;

        this.homeNewsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.homeNewsLoading && this.homeNewsHasMore) {
                    this.loadMoreHomeNews();
                }
            });
        }, {
            root: null,
            rootMargin: '200px'
        });

        this.homeNewsObserver.observe(sentinel);
    }

    async loadMoreHomeNews() {
        if (this.homeNewsLoading || !this.homeNewsHasMore) return;

        this.homeNewsLoading = true;
        this.homeNewsPage++;

        const container = document.getElementById('homeNewsList');
        const sentinel = document.getElementById('homeNewsSentinel');
        
        const loadingHtml = '<div class="loading-state" style="padding:20px;"><div class="loading-spinner"></div><p>加载中...</p></div>';
        
        if (sentinel) {
            sentinel.insertAdjacentHTML('beforebegin', loadingHtml);
        } else {
            container.insertAdjacentHTML('beforeend', loadingHtml);
        }

        try {
            const url = `/api/emnews/comm/web/getNewsByColumns?client=web&biz=web_news_col&column=350&pageSize=${this.homeNewsPageSize}&pageIndex=${this.homeNewsPage}&req_trace=${Date.now()}`;
            const response = await fetch(url);
            const text = await response.text();
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                this.removeLoadingState();
                return;
            }

            this.removeLoadingState();

            if (data.data && data.data.list && data.data.list.length > 0) {
                this.homeNewsHasMore = data.data.list.length >= this.homeNewsPageSize;
                
                const newsHtml = data.data.list.map(item => `
                    <div class="news-item" data-title="${item.title}" data-source="${item.mediaName}" data-time="${this.formatNewsTime(item.showTime)}" data-content="${encodeURIComponent(item.summary || '')}">
                        <div class="title">${item.title}</div>
                        <div class="meta">
                            <span class="source">${item.mediaName || '东方财富'}</span>
                            <span class="time">${this.formatNewsTime(item.showTime)}</span>
                        </div>
                    </div>
                `).join('');

                if (sentinel) {
                    sentinel.insertAdjacentHTML('beforebegin', newsHtml);
                } else {
                    container.insertAdjacentHTML('beforeend', newsHtml + '<div id="homeNewsSentinel" style="height:1px;"></div>');
                    this.setupHomeNewsObserver();
                }
            } else {
                this.homeNewsHasMore = false;
                if (sentinel) {
                    sentinel.remove();
                }
            }
        } catch (error) {
            this.removeLoadingState();
        } finally {
            this.homeNewsLoading = false;
        }
    }

    removeLoadingState() {
        const container = document.getElementById('homeNewsList');
        const loadingStates = container.querySelectorAll('.loading-state');
        loadingStates.forEach(el => el.remove());
    }

    async loadUSMarket() {
        const container = document.getElementById('usMarketList');
        const usIndices = [
            { code: 'SPY', name: '标普500' },
            { code: 'DIA', name: '道琼斯' },
            { code: 'QQQ', name: '纳斯达克' },
            { code: 'AAPL', name: '苹果' },
            { code: 'TSLA', name: '特斯拉' },
            { code: 'NVDA', name: '英伟达' },
            { code: 'MSFT', name: '微软' },
            { code: 'AMZN', name: '亚马逊' }
        ];

        try {
            const data = await this.fetchUSStockData(usIndices.map(i => i.code));
            
            if (data.length === 0) {
                container.innerHTML = '<div class="loading-state">数据加载失败，请稍后重试</div>';
                return;
            }

            container.innerHTML = data.map(stock => this.renderStockItem(stock, 'market')).join('');
        } catch (error) {
            container.innerHTML = '<div class="loading-state">数据加载失败，请稍后重试</div>';
        }
    }

    async loadCNMarket() {
        const container = document.getElementById('cnMarketList');
        const cnIndices = [
            { code: '000001', name: '上证指数' },
            { code: '399001', name: '深证成指' },
            { code: '399006', name: '创业板指' },
            { code: '600519', name: '贵州茅台' },
            { code: '000858', name: '五粮液' },
            { code: '300750', name: '宁德时代' },
            { code: '601318', name: '中国平安' },
            { code: '000001', name: '平安银行' }
        ];

        try {
            const data = await this.fetchAStockData(cnIndices.map(i => i.code));
            
            if (data.length === 0) {
                container.innerHTML = '<div class="loading-state">数据加载失败，请稍后重试</div>';
                return;
            }

            container.innerHTML = data.map(stock => this.renderStockItem(stock, 'market')).join('');
        } catch (error) {
            container.innerHTML = '<div class="loading-state">数据加载失败，请稍后重试</div>';
        }
    }

    showAddModal() {
        document.getElementById('addModal').classList.add('active');
    }

    hideAddModal() {
        document.getElementById('addModal').classList.remove('active');
        document.getElementById('stockCode').value = '';
    }

    detectMarket(input) {
        if (/^\d{6}$/.test(input)) {
            return 'cn';
        }
        return 'us';
    }

    async searchStockInfo(input) {
        const isCNCode = /^\d{6}$/.test(input);
        
        if (isCNCode) {
            const prefix = input.startsWith('6') || input.startsWith('9') || input.startsWith('5') ? 'sh' : 'sz';
            const url = `/api/tencent/q=${prefix}${input}`;
            try {
                const response = await fetch(url);
                const text = await response.text();
                const match = text.match(/v_(\w+)="(.*)"/);
                if (match) {
                    const fields = match[2].split('~');
                    if (fields.length >= 2 && fields[1]) {
                        return { code: input, name: fields[1], market: 'cn' };
                    }
                }
            } catch (e) {
                console.error('A股搜索失败:', e);
            }
            return null;
        }

        if (/^[\u4e00-\u9fa5a-zA-Z]/.test(input)) {
            const url = `/api/emsearch/api/suggest/get?input=${encodeURIComponent(input)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&markettype=&mktnum=&wbp=&uwp=&clientid=`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.QuotationCodeTable && data.QuotationCodeTable.Data) {
                    const first = data.QuotationCodeTable.Data[0];
                    if (first) {
                        const code = first.Code.replace(/^(\d{6})(SH|SZ)$/, '$1');
                        return { code: code, name: first.Name, market: 'cn' };
                    }
                }
            } catch (e) {
                console.error('A股名称搜索失败:', e);
            }
        }

        const url = `/api/tencent/q=us${input}`;
        try {
            const response = await fetch(url);
            const text = await response.text();
            const match = text.match(/v_us\w+="(.*)"/);
            if (match) {
                const fields = match[1].split('~');
                if (fields.length >= 2 && fields[2]) {
                    return { code: input.toUpperCase(), name: fields[2], market: 'us' };
                }
            }
        } catch (e) {
            console.error('美股搜索失败:', e);
        }
        return null;
    }

    async addStock() {
        const input = document.getElementById('stockCode').value.trim();

        if (!input) {
            this.showToast('请输入股票代码或名称');
            return;
        }

        const exists = this.watchlist.find(s => 
            s.code.toLowerCase() === input.toLowerCase() || 
            s.name.toLowerCase() === input.toLowerCase()
        );
        if (exists) {
            this.showToast('该股票已在自选列表');
            return;
        }

        this.showToast('正在搜索...');

        let result = await this.searchStockInfo(input);

        if (!result) {
            const cnPrefix = input.startsWith('6') || input.startsWith('9') || input.startsWith('5') ? 'sh' : 'sz';
            const url = `/api/tencent/q=${cnPrefix}${input}`;
            try {
                const response = await fetch(url);
                const text = await response.text();
                const match = text.match(/v_(\w+)="(.*)"/);
                if (match) {
                    const fields = match[2].split('~');
                    if (fields.length >= 2 && fields[1]) {
                        result = { code: input, name: fields[1], market: 'cn' };
                    }
                }
            } catch (e) {
                console.error('搜索失败:', e);
            }
        }

        if (!result) {
            this.showToast('未找到匹配的股票，请检查输入');
            return;
        }

        const codeExists = this.watchlist.find(s => s.code === result.code);
        if (codeExists) {
            this.showToast('该股票已在自选列表');
            return;
        }

        this.watchlist.push(result);
        localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
        
        this.hideAddModal();
        this.renderWatchlist();
        this.showToast(`已添加 ${result.name}`);
    }

    removeStock(code) {
        this.watchlist = this.watchlist.filter(s => s.code !== code);
        localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
        this.renderWatchlist();
        this.showToast('已删除');
    }

    showPortfolioModal() {
        document.getElementById('portfolioModal').classList.add('active');
    }

    hidePortfolioModal() {
        document.getElementById('portfolioModal').classList.remove('active');
        document.getElementById('portfolioStockCode').value = '';
        document.getElementById('portfolioQuantity').value = '';
        document.getElementById('portfolioCost').value = '';
    }

    addPortfolioItem() {
        const code = document.getElementById('portfolioStockCode').value.trim().toUpperCase();
        const quantity = parseFloat(document.getElementById('portfolioQuantity').value);
        const cost = parseFloat(document.getElementById('portfolioCost').value);

        if (!code || !quantity || !cost) {
            this.showToast('请填写完整信息');
            return;
        }

        const exists = this.portfolio.find(p => p.code === code);
        if (exists) {
            this.showToast('该股票已在持仓列表');
            return;
        }

        this.portfolio.push({ code, quantity, cost });
        localStorage.setItem('portfolio', JSON.stringify(this.portfolio));
        
        this.hidePortfolioModal();
        this.renderPortfolio();
        this.showToast('添加成功');
    }

    removePortfolioItem(code) {
        this.portfolio = this.portfolio.filter(p => p.code !== code);
        localStorage.setItem('portfolio', JSON.stringify(this.portfolio));
        this.renderPortfolio();
        this.showToast('已删除');
    }

    searchStocks(keyword) {
        if (!keyword) {
            this.renderWatchlist();
            return;
        }

        const filtered = this.watchlist.filter(s => 
            s.name.toLowerCase().includes(keyword.toLowerCase()) ||
            s.code.toLowerCase().includes(keyword.toLowerCase())
        );

        const container = document.getElementById('watchlistList');
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>未找到匹配的股票</p></div>';
            return;
        }

        this.updateWatchlistData();
    }

    refreshAll() {
        this.renderWatchlist();
        this.renderPortfolio();
        this.loadMarketData();
        this.showToast('刷新成功');
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            if (activeTab === 'watchlist') {
                this.updateWatchlistData();
            } else if (activeTab === 'portfolio') {
                this.updatePortfolioData();
            }
        }, 30000);
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    async showStockDetail(stock) {
        const detail = document.getElementById('stockDetail');
        detail.classList.add('active');
        document.body.style.overflow = 'hidden';

        this.currentStock = stock;
        this.currentNewsTab = 'news';
        
        document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-news-tab="news"]').classList.add('active');
        document.getElementById('newsList').hidden = false;

        document.getElementById('detailName').textContent = stock.name;
        document.getElementById('detailCode').textContent = stock.code;

        await this.loadStockDetailData(stock);
        await this.loadStockNews(stock);
    }

    hideStockDetail() {
        const detail = document.getElementById('stockDetail');
        detail.classList.remove('active');
        document.body.style.overflow = '';
    }

    async loadStockDetailData(stock) {
        let data = null;

        try {
            if (stock.market === 'cn') {
                const cnData = await this.fetchAStockData([stock.code]);
                data = cnData[0];
            } else if (stock.market === 'us') {
                const usData = await this.fetchUSStockData([stock.code]);
                data = usData[0];
            }
        } catch (error) {
            console.error('加载个股数据失败:', error);
            this.showToast('数据加载失败');
            return;
        }

        if (!data) {
            this.showToast('数据加载失败');
            return;
        }

        const changePercent = parseFloat(data.changePercent);
        const changeSymbol = changePercent >= 0 ? '+' : '';
        const changeClass = changePercent >= 0 ? 'up' : 'down';

        document.getElementById('detailPrice').textContent = data.current?.toFixed(2) || '--';
        document.getElementById('detailPrice').className = `current-price ${changeClass === 'up' ? 'price-up' : 'price-down'}`;
        
        const changeEl = document.getElementById('detailChange');
        changeEl.textContent = `${changeSymbol}${data.change?.toFixed(2)} (${changeSymbol}${changePercent}%)`;
        changeEl.className = `change-badge ${changeClass}`;

        document.getElementById('detailPrevClose').textContent = `昨收: ${data.previousClose?.toFixed(2) || '--'}`;

        document.getElementById('statOpen').textContent = data.open?.toFixed(2) || '--';
        document.getElementById('statHigh').textContent = data.high?.toFixed(2) || '--';
        document.getElementById('statLow').textContent = data.low?.toFixed(2) || '--';
        
        let volumeText = '--';
        if (data.volume) {
            const vol = parseFloat(data.volume);
            if (vol > 100000000) {
                volumeText = (vol / 100000000).toFixed(2) + '亿';
            } else if (vol > 10000) {
                volumeText = (vol / 10000).toFixed(2) + '万';
            } else {
                volumeText = vol.toFixed(0);
            }
        }
        document.getElementById('statVolume').textContent = volumeText;

        this.renderPriceChart(stock);
    }

    async renderPriceChart(stock) {
        const canvas = document.getElementById('priceChart');
        const ctx = canvas.getContext('2d');
        
        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        ctx.scale(dpr, dpr);

        const width = container.clientWidth;
        const height = container.clientHeight;

        ctx.clearRect(0, 0, width, height);

        let chartData = [];
        
        try {
            chartData = await this.fetchChartData(stock, this.currentChartRange);
        } catch (error) {
            console.error('获取图表数据失败:', error);
            chartData = this.generateMockChartData(50);
        }
        
        if (chartData.length < 2) {
            chartData = this.generateMockChartData(50);
        }
        
        if (chartData.length < 2) return;

        const minPrice = Math.min(...chartData);
        const maxPrice = Math.max(...chartData);
        const priceRange = maxPrice - minPrice || 1;

        const padding = { top: 10, bottom: 20, left: 10, right: 10 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const isUp = chartData[chartData.length - 1] >= chartData[0];
        const lineColor = isUp ? '#34c759' : '#ff3b30';
        const gradientTop = isUp ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)';
        const gradientBottom = isUp ? 'rgba(52, 199, 89, 0)' : 'rgba(255, 59, 48, 0)';

        ctx.beginPath();
        chartData.forEach((price, index) => {
            const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
            const y = padding.top + (1 - (price - minPrice) / priceRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, gradientTop);
        gradient.addColorStop(1, gradientBottom);

        ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        const lastPrice = chartData[chartData.length - 1];
        const lastX = padding.left + chartWidth;
        const lastY = padding.top + (1 - (lastPrice - minPrice) / priceRange) * chartHeight;

        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    async fetchChartData(stock, range) {
        let secid = '';
        if (stock.market === 'cn') {
            const code = stock.code.replace(/^sh|^sz/, '');
            secid = code.startsWith('6') || code.startsWith('9') || code.startsWith('5') ? `1.${code}` : `0.${code}`;
        } else {
            secid = `105.${stock.code.replace('^', '')}`;
        }

        const rangeMap = {
            '1d': { days: 1, type: '100' },
            '1w': { days: 7, type: '101' },
            '1m': { days: 30, type: '101' },
            '3m': { days: 90, type: '101' }
        };

        const config = rangeMap[range] || rangeMap['1d'];
        const url = `/api/eastmoney/api/qt/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55&klt=${config.type}&fqt=1&lmt=${config.days * 5}&cb=callback`;

        try {
            const response = await fetch(url);
            const text = await response.text();
            
            const match = text.match(/callback\((.*)\)/);
            if (match) {
                const data = JSON.parse(match[1]);
                if (data.data && data.data.klines) {
                    return data.data.klines.map(k => {
                        const parts = k.split(',');
                        return parseFloat(parts[1]);
                    });
                }
            }
        } catch (error) {
            console.error('东方财富K线数据获取失败:', error);
        }

        return this.generateMockChartData(50);
    }

    generateMockChartData(points) {
        const data = [];
        let price = 100 + Math.random() * 50;
        
        for (let i = 0; i < points; i++) {
            price += (Math.random() - 0.5) * 3;
            price = Math.max(price, 10);
            data.push(price);
        }
        
        return data;
    }

    switchChartRange(range) {
        document.querySelectorAll('.chart-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-range="${range}"]`).classList.add('active');
        this.currentChartRange = range;
        
        if (this.currentStock) {
            this.renderPriceChart(this.currentStock);
        }
    }

    async loadStockNews(stock) {
        const newsList = document.getElementById('newsList');
        this.newsPage = 1;
        this.newsLoading = false;
        this.newsHasMore = true;
        this.allNews = [];
        this.newsInitialized = false;

        console.log('[News] Loading news for stock:', stock.name, stock.code);

        newsList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>加载资讯中...</p>
            </div>
        `;

        try {
            const firstPage = await this.fetchStockNewsPage(stock, 1);
            console.log('[News] First page result:', firstPage.length, 'items');
            this.allNews = firstPage;
            this.newsHasMore = firstPage.length >= this.newsPageSize;
            
            this.renderNewsItems(firstPage, true);
            this.newsInitialized = true;

            if (this.newsHasMore) {
                this.setupNewsObserver();
            }
        } catch (error) {
            console.error('加载资讯失败:', error);
            newsList.innerHTML = '<div class="empty-state"><p>资讯加载失败</p></div>';
        }
    }

    async fetchStockNewsPage(stock, page) {
        let keyword = stock.name;
        let uid = stock.code.replace(/^sh|^sz/, '');
        
        const pageSize = this.newsPageSize;
        const pageIndex = page;
        
        const param = JSON.stringify({
            uid: uid,
            keyword: keyword,
            type: ["cmsArticleWebOld"],
            client: "web",
            clientType: "web",
            clientVersion: "curr",
            param: {
                cmsArticleWebOld: {
                    searchScope: "default",
                    sort: "default",
                    pageIndex: pageIndex,
                    pageSize: pageSize,
                    preTag: "<em>",
                    postTag: "</em>"
                }
            }
        });
        
        const url = `/api/emstocknews/search/jsonp?cb=jQuery&param=${encodeURIComponent(param)}`;

        console.log('[NewsAPI] Request URL:', url);

        try {
            const response = await fetch(url);
            const text = await response.text();
            
            console.log('[NewsAPI] Raw response (first 500 chars):', text.substring(0, 500));
            
            let data;
            try {
                const match = text.match(/jQuery\((.*)\)/);
                if (match) {
                    data = JSON.parse(match[1]);
                } else {
                    data = JSON.parse(text);
                }
            } catch (e) {
                console.error('[NewsAPI] Cannot parse JSON response:', e.message);
                return [];
            }

            console.log('[NewsAPI] Full parsed data structure:', JSON.stringify(data).substring(0, 800));

            if (data.result && data.result.cmsArticleWebOld && data.result.cmsArticleWebOld.length > 0) {
                console.log('[NewsAPI] Found', data.result.cmsArticleWebOld.length, 'news items');
                return data.result.cmsArticleWebOld.map(item => ({
                    title: (item.title || '无标题').replace(/<[^>]*>/g, ''),
                    source: item.mediaName || '东方财富',
                    time: this.formatNewsTime(item.date),
                    content: (item.content || '').replace(/<[^>]*>/g, ''),
                    url: item.url || ''
                }));
            } else {
                console.warn('[NewsAPI] No news list found in response, code:', data.code);
            }
        } catch (e) {
            console.error('[NewsAPI] Fetch error:', e.message);
        }

        return [];
    }

    renderNewsItems(news, isInitial = false) {
        const newsList = document.getElementById('newsList');
        
        console.log('[News] renderNewsItems called with', news.length, 'items, isInitial:', isInitial);
        
        if (!news || news.length === 0) {
            newsList.innerHTML = '<div class="empty-state"><p>暂无相关资讯</p></div>';
            return;
        }
        
        const html = news.map(item => `
            <div class="news-item" data-title="${item.title}" data-source="${item.source}" data-time="${item.time}" data-content="${encodeURIComponent(item.content || '')}">
                <div class="title">${item.title}</div>
                <div class="meta">
                    <span class="source">${item.source}</span>
                    <span class="time">${item.time}</span>
                </div>
            </div>
        `).join('');
        
        console.log('[News] Generated HTML length:', html.length, 'chars');
        
        if (isInitial) {
            newsList.innerHTML = html + '<div id="newsSentinel" style="height:1px;"></div>';
        } else {
            const sentinel = document.getElementById('newsSentinel');
            if (sentinel) {
                sentinel.insertAdjacentHTML('beforebegin', html);
            } else {
                newsList.insertAdjacentHTML('beforeend', html + '<div id="newsSentinel" style="height:1px;"></div>');
            }
        }
        
        console.log('[News] News list HTML updated');
    }

    handleNewsScroll() {
        if (this.newsLoading || !this.newsHasMore || !this.newsInitialized) {
            console.log('[NewsScroll] Skipped:', {
                loading: this.newsLoading,
                hasMore: this.newsHasMore,
                initialized: this.newsInitialized
            });
            return;
        }

        const detail = document.getElementById('stockDetail');
        const newsList = document.getElementById('newsList');
        
        if (!newsList || !this.currentStock) return;

        const scrollBottom = detail.scrollTop + detail.clientHeight;
        const documentHeight = detail.scrollHeight;
        
        console.log('[NewsScroll]', {
            scrollBottom,
            documentHeight,
            threshold: documentHeight - 300,
            shouldLoad: scrollBottom >= documentHeight - 300
        });
        
        if (scrollBottom >= documentHeight - 300) {
            this.loadMoreNews();
        }
    }

    async loadMoreNews() {
        if (this.newsLoading || !this.newsHasMore) return;
        
        this.newsLoading = true;
        this.newsPage++;

        const newsList = document.getElementById('newsList');
        const loadingHtml = '<div class="loading-state" id="newsLoading"><div class="loading-spinner"></div><p>加载更多...</p></div>';
        newsList.insertAdjacentHTML('beforeend', loadingHtml);

        try {
            const moreNews = await this.fetchStockNewsPage(this.currentStock, this.newsPage);

            const loadingEl = document.getElementById('newsLoading');
            if (loadingEl) loadingEl.remove();

            if (moreNews.length > 0) {
                this.allNews = this.allNews.concat(moreNews);
                this.renderNewsItems(moreNews);
            }

            if (moreNews.length < this.newsPageSize) {
                this.newsHasMore = false;
                if (this.newsObserver) {
                    this.newsObserver.disconnect();
                    this.newsObserver = null;
                }
            } else {
                this.setupNewsObserver();
            }
        } catch (error) {
            console.error('加载更多资讯失败:', error);
            const loadingEl = document.getElementById('newsLoading');
            if (loadingEl) loadingEl.remove();
        }

        this.newsLoading = false;
    }

    formatNewsTime(timestamp) {
        if (!timestamp) return '';
        
        let newsTime;
        if (typeof timestamp === 'string') {
            newsTime = new Date(timestamp.replace(/-/g, '/'));
        } else {
            newsTime = new Date(timestamp * 1000);
        }
        
        if (isNaN(newsTime.getTime())) return timestamp;
        
        const now = new Date();
        const diff = now - newsTime;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        const month = newsTime.getMonth() + 1;
        const day = newsTime.getDate();
        return `${month}月${day}日`;
    }

    showNewsDetail(news) {
        const detail = document.getElementById('newsDetail');
        detail.classList.add('active');
        document.body.style.overflow = 'hidden';

        document.getElementById('newsDetailTitle').textContent = news.title;
        document.getElementById('newsDetailSource').textContent = news.source || '--';
        document.getElementById('newsDetailTime').textContent = news.time || '--';

        const contentEl = document.getElementById('newsDetailContent');
        if (news.content) {
            const decodedContent = decodeURIComponent(news.content);
            const paragraphs = decodedContent.split('\n\n').filter(p => p.trim());
            contentEl.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
        } else {
            contentEl.innerHTML = '<p class="placeholder-text">暂无详细内容</p>';
        }
    }

    hideNewsDetail() {
        const detail = document.getElementById('newsDetail');
        detail.classList.remove('active');
        document.body.style.overflow = '';
    }

    showScanModal() {
        document.getElementById('scanModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        this.resetScanModal();
    }

    hideScanModal() {
        document.getElementById('scanModal').classList.remove('active');
        document.body.style.overflow = '';
        this.resetScanModal();
    }

    resetScanModal() {
        document.getElementById('scanFileInput').value = '';
        document.getElementById('scanPreview').hidden = true;
        document.getElementById('uploadPlaceholder').hidden = false;
        document.getElementById('scanResult').hidden = true;
        document.getElementById('scanLoading').hidden = true;
        document.getElementById('submitScan').disabled = true;
        this.scanResults = [];
    }

    handleScanImage(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('scanPreview');
            preview.src = event.target.result;
            preview.hidden = false;
            document.getElementById('uploadPlaceholder').hidden = true;

            this.performOCR(event.target.result);
        };
        reader.readAsDataURL(file);
    }

    async performOCR(imageData) {
        document.getElementById('scanLoading').hidden = false;
        document.getElementById('scanResult').hidden = true;

        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            document.head.appendChild(script);

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });

            const result = await Tesseract.recognize(imageData, 'chi_sim+eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log('OCR progress:', Math.round(m.progress * 100) + '%');
                    }
                }
            });

            const text = result.data.text;
            console.log('OCR result:', text);

            this.parseStockNames(text);
        } catch (error) {
            console.error('OCR error:', error);
            this.showToast('识别失败，请重试');
            document.getElementById('scanLoading').hidden = true;
        }
    }

    parseStockNames(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const stockPatterns = [
            /([\u4e00-\u9fa5]{2,10})(?:股份|科技|集团|有限|公司|银行|证券|保险|地产|能源|医药|生物|电子|通信|网络|软件|信息|智能|新能源|新材料|环保|文化|传媒|教育|医疗|健康|食品|农业|化工|机械|制造|建设|工程|设计|咨询|服务|管理|投资|控股|发展|实业|企业|国际|中国|中华|全国|上海|深圳|北京|广州|杭州|南京|成都|武汉|西安|重庆|天津|苏州|无锡|常州|宁波|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|南昌|昆明|贵阳|南宁|海口|拉萨|乌鲁木齐|兰州|西宁|银川|呼和浩特|石家庄|太原|哈尔滨|长春|沈阳|茅台|五粮液|宁德时代|比亚迪|腾讯|阿里|百度|京东|美团|拼多多|小米|华为|中兴|联想|海尔|格力|美的|万科|保利|招商|平安|中信|光大|民生|兴业|浦发|交通|工商|建设|农业|中国|工商|建设|农业|交通|招商|中信|光大|民生|兴业|浦发|平安)/g,
            /([A-Z]{1,5})/g
        ];

        const foundNames = new Set();
        
        lines.forEach(line => {
            const cleanLine = line.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
            
            const cnMatch = cleanLine.match(/[\u4e00-\u9fa5]{2,8}/g);
            if (cnMatch) {
                cnMatch.forEach(name => {
                    if (name.length >= 2 && name.length <= 8) {
                        foundNames.add(name);
                    }
                });
            }

            const usMatch = cleanLine.match(/[A-Z]{2,5}/g);
            if (usMatch) {
                usMatch.forEach(code => {
                    foundNames.add(code);
                });
            }
        });

        this.scanResults = Array.from(foundNames).filter(name => name.length >= 2);
        this.displayScanResults();
    }

    async displayScanResults() {
        document.getElementById('scanLoading').hidden = true;
        document.getElementById('scanResult').hidden = false;

        const resultList = document.getElementById('resultList');
        const resultCount = document.getElementById('resultCount');
        const submitBtn = document.getElementById('submitScan');

        if (this.scanResults.length === 0) {
            resultList.innerHTML = '<div class="empty-state"><p>未识别到股票信息</p></div>';
            submitBtn.disabled = true;
            resultCount.textContent = '0个';
            return;
        }

        resultCount.textContent = `${this.scanResults.length}个`;
        submitBtn.disabled = false;

        resultList.innerHTML = this.scanResults.map(name => `
            <div class="result-item">
                <div>
                    <div class="name">${name}</div>
                </div>
                <span class="market-tag">待识别</span>
            </div>
        `).join('');

        this.showToast(`识别到 ${this.scanResults.length} 个股票/证券`);
    }

    async batchAddScanResults() {
        if (this.scanResults.length === 0) return;

        this.showToast('正在批量添加...');
        let addedCount = 0;
        let failedCount = 0;

        for (const name of this.scanResults) {
            const exists = this.watchlist.find(s => 
                s.code.toLowerCase() === name.toLowerCase() || 
                s.name.toLowerCase() === name.toLowerCase()
            );
            
            if (exists) {
                failedCount++;
                continue;
            }

            const result = await this.searchStockInfo(name);
            if (result) {
                const codeExists = this.watchlist.find(s => s.code === result.code);
                if (!codeExists) {
                    this.watchlist.push(result);
                    addedCount++;
                } else {
                    failedCount++;
                }
            } else {
                failedCount++;
            }
        }

        localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
        this.renderWatchlist();
        this.hideScanModal();

        let message = `成功添加 ${addedCount} 个`;
        if (failedCount > 0) {
            message += `，${failedCount} 个未找到`;
        }
        this.showToast(message);
    }

    updateAuthUI() {
        const header = document.querySelector('.app-header');
        if (!header) return;

        let userSection = header.querySelector('.user-section');
        if (!userSection) {
            userSection = document.createElement('div');
            userSection.className = 'user-section';
            header.appendChild(userSection);
        }

        if (this.currentUser) {
            const displayName = this.currentUser.name || this.currentUser.email.split('@')[0];
            const initial = displayName.charAt(0).toUpperCase();
            userSection.innerHTML = `
                <div class="user-info" id="userInfo">
                    <div class="user-avatar">${initial}</div>
                    <span class="user-name">${displayName}</span>
                </div>
            `;
            document.getElementById('userInfo').addEventListener('click', () => this.showUserMenu());
        } else {
            userSection.innerHTML = `<button class="login-btn" id="loginBtn">登录</button>`;
            document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal());
        }
    }

    showAuthModal() {
        document.getElementById('authModal').classList.add('active');
    }

    hideAuthModal() {
        document.getElementById('authModal').classList.remove('active');
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.auth-tab[data-auth="${tab}"]`).classList.add('active');

        if (tab === 'login') {
            document.getElementById('loginForm').hidden = false;
            document.getElementById('registerForm').hidden = true;
            document.getElementById('authTitle').textContent = '登录';
        } else {
            document.getElementById('loginForm').hidden = true;
            document.getElementById('registerForm').hidden = false;
            document.getElementById('authTitle').textContent = '注册';
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showToast('请填写邮箱和密码');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.hideAuthModal();
                this.updateAuthUI();
                this.showToast('登录成功');
                this.loadUserData();
            } else {
                this.showToast(data.error || '登录失败');
            }
        } catch (err) {
            this.showToast('登录失败: ' + err.message);
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (!email || !password) {
            this.showToast('请填写邮箱和密码');
            return;
        }

        if (password.length < 6) {
            this.showToast('密码至少6位');
            return;
        }

        if (password !== passwordConfirm) {
            this.showToast('两次密码输入不一致');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.hideAuthModal();
                this.updateAuthUI();
                this.showToast('注册成功');
            } else {
                this.showToast(data.error || '注册失败');
            }
        } catch (err) {
            this.showToast('注册失败: ' + err.message);
        }
    }

    showUserMenu() {
        if (confirm('确定要退出登录吗？')) {
            this.logout();
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        this.updateAuthUI();
        this.showToast('已退出登录');
    }

    async loadUserData() {
        if (!this.token) return;

        try {
            const response = await fetch('/api/user/data', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.watchlist && data.watchlist.length > 0) {
                    this.watchlist = data.watchlist;
                    localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
                    this.renderWatchlist();
                }
                if (data.portfolio && data.portfolio.length > 0) {
                    this.portfolio = data.portfolio;
                    localStorage.setItem('portfolio', JSON.stringify(this.portfolio));
                    this.renderPortfolio();
                }
            }
        } catch (err) {
            console.error('加载用户数据失败:', err);
        }
    }

    async saveUserData() {
        if (!this.token) return;

        try {
            await fetch('/api/user/watchlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ watchlist: this.watchlist })
            });

            await fetch('/api/user/portfolio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ portfolio: this.portfolio })
            });
        } catch (err) {
            console.error('保存用户数据失败:', err);
        }
    }

    toggleAiChat() {
        const panel = document.getElementById('aiChatPanel');
        if (panel.classList.contains('active')) {
            this.hideAiChat();
        } else {
            this.showAiChat();
        }
    }

    showAiChat() {
        document.getElementById('aiChatPanel').classList.add('active');
    }

    hideAiChat() {
        document.getElementById('aiChatPanel').classList.remove('active');
    }

    newAiChat() {
        this.aiMessages = [];
        this.aiConversationHistory = [];
        this.renderAiWelcome();
    }

    renderAiWelcome() {
        const container = document.getElementById('aiMessages');
        container.innerHTML = `
            <div class="ai-welcome">
                <div class="welcome-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <h3>您好，我是AI投资助手</h3>
                <p>我可以帮您分析股票、解读财报、制定投资策略</p>
                <div class="suggestion-chips">
                    <button class="suggestion-chip" data-prompt="帮我分析贵州茅台的财务状况和投资价值">分析贵州茅台</button>
                    <button class="suggestion-chip" data-prompt="解释什么是市盈率(PE)和市净率(PB)">什么是PE和PB</button>
                    <button class="suggestion-chip" data-prompt="帮我比较苹果公司和微软公司的投资价值">比较苹果和微软</button>
                    <button class="suggestion-chip" data-prompt="分析当前A股市场的走势和热点板块">分析A股市场</button>
                </div>
            </div>
        `;

        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const prompt = e.target.dataset.prompt;
                document.getElementById('aiInput').value = prompt;
                this.sendAiMessage();
            });
        });
    }

    async sendAiMessage() {
        if (!this.token) {
            this.showToast('请先登录');
            this.showAuthModal();
            return;
        }

        const input = document.getElementById('aiInput');
        const message = input.value.trim();

        if (!message) return;

        input.value = '';
        this.autoResizeTextarea(input);
        this.updateTokenCount();

        this.addAiMessage(message, 'user');
        this.aiConversationHistory.push({ role: 'user', content: message });

        this.showAiTyping();

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    messages: this.aiConversationHistory,
                    model: this.selectedAiModel || 'doubao-pro-32k'
                })
            });

            this.hideAiTyping();

            if (response.ok) {
                const data = await response.json();
                this.addAiMessage(data.message, 'assistant');
                this.aiConversationHistory.push({ role: 'assistant', content: data.message });
            } else {
                const error = await response.json();
                this.addAiMessage(`抱歉，发生了错误: ${error.error || '未知错误'}`, 'assistant');
            }
        } catch (err) {
            this.hideAiTyping();
            this.addAiMessage(`请求失败: ${err.message}`, 'assistant');
        }
    }

    addAiMessage(content, role) {
        const container = document.getElementById('aiMessages');
        const welcome = container.querySelector('.ai-welcome');
        if (welcome) {
            welcome.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${role}`;

        let formattedContent = this.formatAiResponse(content);

        messageDiv.innerHTML = `<div class="message-bubble">${formattedContent}</div>`;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    formatAiResponse(content) {
        let formatted = content
            .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');

        return formatted;
    }

    showAiTyping() {
        const container = document.getElementById('aiMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message assistant';
        typingDiv.id = 'aiTyping';
        typingDiv.innerHTML = `
            <div class="ai-typing">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        container.appendChild(typingDiv);
        container.scrollTop = container.scrollHeight;
    }

    hideAiTyping() {
        const typing = document.getElementById('aiTyping');
        if (typing) {
            typing.remove();
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }

    updateTokenCount() {
        const input = document.getElementById('aiInput');
        const tokenCount = document.getElementById('tokenCount');
        const text = input.value;
        const tokens = Math.ceil(text.length / 4);
        tokenCount.textContent = Math.min(tokens, 32000);
    }

    showModelSelector() {
        document.getElementById('modelSelector').hidden = false;
        const selectedModel = this.selectedAiModel || 'doubao-pro-32k';
        document.querySelectorAll('.model-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.model === selectedModel);
        });
    }

    hideModelSelector() {
        document.getElementById('modelSelector').hidden = true;
    }

    selectAiModel(model) {
        this.selectedAiModel = model;
        localStorage.setItem('selectedAiModel', model);
        const modelNames = {
            'doubao-pro-32k': '豆包Pro 32K',
            'doubao-pro-128k': '豆包Pro 128K',
            'doubao-thinking-pro': '豆包思考Pro'
        };
        document.getElementById('currentModel').textContent = modelNames[model] || model;
        this.hideModelSelector();
        this.showToast(`已切换到${modelNames[model]}`);
    }

    async loadAiNotes(stockCode) {
        if (!this.token) return [];

        try {
            const response = await fetch(`/api/ai/history?stockCode=${encodeURIComponent(stockCode)}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                return data.history || [];
            }
        } catch (err) {
            console.error('加载AI笔记失败:', err);
        }
        return [];
    }

    async deleteAiNote(chatId) {
        if (!this.token) return;

        try {
            await fetch(`/api/ai/history/${chatId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
        } catch (err) {
            console.error('删除AI笔记失败:', err);
        }
    }
}

const app = new AITraderApp();
