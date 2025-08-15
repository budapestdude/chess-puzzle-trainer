// Enhanced Mobile Optimization for Chess Puzzle Trainer
class MobileEnhanced {
    constructor() {
        this.isMobile = window.innerWidth <= 768 || this.detectMobileDevice();
        this.isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        if (this.isMobile || this.isTablet) {
            this.init();
        }
    }
    
    detectMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    init() {
        // Add mobile class to body
        document.body.classList.add('mobile-device');
        
        // Initialize mobile UI
        this.createMobileUI();
        this.initializeGestures();
        this.initializeControls();
        this.optimizeBoard();
        this.handleOrientation();
        
        // Prevent default behaviors
        this.preventDefaults();
        
        // Set viewport
        this.setViewport();
        
        // Initialize haptics
        this.haptics = 'vibrate' in navigator;
    }
    
    createMobileUI() {
        // Remove existing desktop elements if they exist
        this.cleanupDesktopUI();
        
        // Create mobile header
        this.createHeader();
        
        // Create puzzle info card
        this.createPuzzleInfo();
        
        // Create mobile controls
        this.createControls();
        
        // Create bottom navigation
        this.createBottomNav();
        
        // Create sidebar headers
        this.enhanceSidebars();
        
        // Create overlay
        this.createOverlay();
        
        // Create notification container
        this.createNotificationContainer();
    }
    
    cleanupDesktopUI() {
        // Hide desktop-specific elements
        const desktopElements = document.querySelectorAll('.desktop-only');
        desktopElements.forEach(el => el.style.display = 'none');
    }
    
    createHeader() {
        // Remove existing header if present
        const existingHeader = document.querySelector('.mobile-header');
        if (existingHeader) existingHeader.remove();
        
        const header = document.createElement('div');
        header.className = 'mobile-header';
        header.innerHTML = `
            <div class="mobile-header-left">
                <button class="mobile-menu-btn" id="mobileMenuBtn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                    </svg>
                </button>
                <div class="mobile-logo">
                    <span>♟️</span>
                    <span>Chess</span>
                </div>
            </div>
            <div class="mobile-header-right">
                <div class="mobile-stat-badge">
                    <span id="mobileRating">1200</span>
                </div>
                <div class="mobile-stat-badge">
                    <span>🔥</span>
                    <span id="mobileStreak">0</span>
                </div>
            </div>
        `;
        
        document.body.insertBefore(header, document.body.firstChild);
        
        // Add menu button handler
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            this.toggleSidebar('left');
            this.vibrate('light');
        });
    }
    
    createPuzzleInfo() {
        const info = document.createElement('div');
        info.className = 'mobile-puzzle-info';
        info.innerHTML = `
            <div class="puzzle-info-left">
                <div class="puzzle-difficulty">
                    <span id="mobileDifficulty">⭐</span>
                    <span id="mobilePuzzleTheme">Tactics</span>
                </div>
                <div class="puzzle-theme" id="mobileCategory">Fork</div>
            </div>
            <div class="puzzle-timer" id="mobileTimer">00:00</div>
        `;
        
        document.body.appendChild(info);
    }
    
    createControls() {
        const controls = document.createElement('div');
        controls.className = 'mobile-controls';
        controls.innerHTML = `
            <div class="controls-primary">
                <button class="control-btn-mobile" id="mobileHintBtn">
                    <span class="icon">💡</span>
                    <span class="label">Hint</span>
                </button>
                <button class="control-btn-mobile" id="mobileResetBtn">
                    <span class="icon">↺</span>
                    <span class="label">Reset</span>
                </button>
                <button class="control-btn-mobile primary" id="mobileNextBtn">
                    <span class="icon">→</span>
                    <span class="label">Next</span>
                </button>
            </div>
            <div class="controls-secondary">
                <button class="control-btn-small" id="mobileSolutionBtn">Solution</button>
                <button class="control-btn-small" id="mobileAnalyzeBtn">Analyze</button>
                <button class="control-btn-small" id="mobileMovesBtn">Moves</button>
            </div>
        `;
        
        document.body.appendChild(controls);
        
        // Add control handlers
        this.initializeControlHandlers();
    }
    
    createBottomNav() {
        const nav = document.createElement('div');
        nav.className = 'mobile-nav';
        nav.innerHTML = `
            <button class="mobile-nav-btn active" data-panel="board">
                <span class="mobile-nav-icon">♟️</span>
                <span>Play</span>
            </button>
            <button class="mobile-nav-btn" data-panel="puzzles">
                <span class="mobile-nav-icon">🎯</span>
                <span>Puzzles</span>
            </button>
            <button class="mobile-nav-btn" data-panel="stats">
                <span class="mobile-nav-icon">📊</span>
                <span>Stats</span>
            </button>
            <button class="mobile-nav-btn" data-panel="learn">
                <span class="mobile-nav-icon">📚</span>
                <span>Learn</span>
            </button>
            <button class="mobile-nav-btn" data-panel="profile">
                <span class="mobile-nav-icon">👤</span>
                <span>Profile</span>
            </button>
        `;
        
        document.body.appendChild(nav);
        
        // Add navigation handlers
        nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleNavigation(e.currentTarget);
            });
        });
    }
    
    enhanceSidebars() {
        // Add mobile headers to sidebars
        const leftSidebar = document.querySelector('.left-sidebar');
        const rightSidebar = document.querySelector('.right-sidebar');
        
        if (leftSidebar && !leftSidebar.querySelector('.sidebar-mobile-header')) {
            const header = document.createElement('div');
            header.className = 'sidebar-mobile-header';
            header.innerHTML = `
                <div class="sidebar-mobile-title">Filters & Settings</div>
                <button class="sidebar-close-btn">×</button>
            `;
            leftSidebar.insertBefore(header, leftSidebar.firstChild);
            
            header.querySelector('.sidebar-close-btn').addEventListener('click', () => {
                this.closeSidebar('left');
            });
        }
        
        if (rightSidebar && !rightSidebar.querySelector('.sidebar-mobile-header')) {
            const header = document.createElement('div');
            header.className = 'sidebar-mobile-header';
            header.innerHTML = `
                <div class="sidebar-mobile-title">Game Info</div>
                <button class="sidebar-close-btn">×</button>
            `;
            rightSidebar.insertBefore(header, rightSidebar.firstChild);
            
            header.querySelector('.sidebar-close-btn').addEventListener('click', () => {
                this.closeSidebar('right');
            });
        }
    }
    
    createOverlay() {
        if (!document.querySelector('.sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', () => {
                this.closeAllSidebars();
            });
        }
    }
    
    createNotificationContainer() {
        if (!document.querySelector('.mobile-notification')) {
            const notification = document.createElement('div');
            notification.className = 'mobile-notification';
            notification.id = 'mobileNotification';
            document.body.appendChild(notification);
        }
    }
    
    initializeControlHandlers() {
        // Hint button
        document.getElementById('mobileHintBtn')?.addEventListener('click', () => {
            this.vibrate('light');
            document.getElementById('hintBtn')?.click();
        });
        
        // Reset button
        document.getElementById('mobileResetBtn')?.addEventListener('click', () => {
            this.vibrate('light');
            document.getElementById('resetPuzzleBtn')?.click();
        });
        
        // Next button
        document.getElementById('mobileNextBtn')?.addEventListener('click', () => {
            this.vibrate('medium');
            document.getElementById('nextBtn')?.click();
        });
        
        // Solution button
        document.getElementById('mobileSolutionBtn')?.addEventListener('click', () => {
            this.vibrate('light');
            document.getElementById('solutionBtn')?.click();
        });
        
        // Analyze button
        document.getElementById('mobileAnalyzeBtn')?.addEventListener('click', () => {
            this.vibrate('light');
            document.getElementById('analyzeBtn')?.click();
        });
        
        // Moves button
        document.getElementById('mobileMovesBtn')?.addEventListener('click', () => {
            this.toggleMovesHistory();
        });
    }
    
    toggleMovesHistory() {
        let movesPanel = document.querySelector('.mobile-moves');
        
        if (!movesPanel) {
            movesPanel = document.createElement('div');
            movesPanel.className = 'mobile-moves';
            movesPanel.innerHTML = `
                <div class="mobile-moves-content" id="mobileMovesList"></div>
            `;
            document.body.appendChild(movesPanel);
        }
        
        movesPanel.classList.toggle('visible');
        
        // Update moves content
        const moveHistory = document.getElementById('moveHistory');
        if (moveHistory) {
            document.getElementById('mobileMovesList').innerHTML = moveHistory.innerHTML;
        }
    }
    
    initializeGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        // Touch start
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        // Touch end
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY);
        }, { passive: true });
        
        // Show swipe hints
        this.showSwipeHints();
    }
    
    handleSwipe(startX, endX, startY, endY) {
        const diffX = endX - startX;
        const diffY = endY - startY;
        const threshold = 50;
        const edgeThreshold = 30;
        
        // Check for horizontal swipe
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
            if (diffX > 0 && startX < edgeThreshold) {
                // Swipe right from left edge
                this.toggleSidebar('left');
                this.vibrate('light');
            } else if (diffX < 0 && startX > window.innerWidth - edgeThreshold) {
                // Swipe left from right edge
                this.toggleSidebar('right');
                this.vibrate('light');
            }
        }
    }
    
    showSwipeHints() {
        // Create swipe hint indicators
        if (!document.querySelector('.swipe-hint')) {
            const leftHint = document.createElement('div');
            leftHint.className = 'swipe-hint left';
            leftHint.innerHTML = '<span class="swipe-arrow">›</span>';
            
            const rightHint = document.createElement('div');
            rightHint.className = 'swipe-hint right';
            rightHint.innerHTML = '<span class="swipe-arrow">‹</span>';
            
            document.body.appendChild(leftHint);
            document.body.appendChild(rightHint);
            
            // Show hints briefly on first load
            setTimeout(() => {
                leftHint.classList.add('visible');
                rightHint.classList.add('visible');
                
                setTimeout(() => {
                    leftHint.classList.remove('visible');
                    rightHint.classList.remove('visible');
                }, 2000);
            }, 1000);
        }
    }
    
    handleNavigation(btn) {
        // Remove active class from all buttons
        document.querySelectorAll('.mobile-nav-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        const panel = btn.dataset.panel;
        this.vibrate('light');
        
        switch(panel) {
            case 'board':
                this.closeAllSidebars();
                break;
            case 'puzzles':
                this.toggleSidebar('left');
                break;
            case 'stats':
                if (document.getElementById('statsBtn')) {
                    document.getElementById('statsBtn').click();
                }
                break;
            case 'learn':
                if (document.getElementById('achievementsBtn')) {
                    document.getElementById('achievementsBtn').click();
                }
                break;
            case 'profile':
                window.location.href = '/profile';
                break;
        }
    }
    
    toggleSidebar(side) {
        const sidebar = document.querySelector(`.${side}-sidebar`);
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (!sidebar) return;
        
        const isActive = sidebar.classList.contains('active');
        
        // Close all sidebars first
        this.closeAllSidebars();
        
        if (!isActive) {
            // Open requested sidebar
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeSidebar(side) {
        const sidebar = document.querySelector(`.${side}-sidebar`);
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        
        if (!document.querySelector('.left-sidebar.active') && 
            !document.querySelector('.right-sidebar.active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    closeAllSidebars() {
        document.querySelectorAll('.left-sidebar, .right-sidebar').forEach(sidebar => {
            sidebar.classList.remove('active');
        });
        
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        document.body.style.overflow = '';
    }
    
    optimizeBoard() {
        const resizeBoard = () => {
            const board = document.getElementById('board');
            if (!board) return;
            
            const container = document.querySelector('.board-container');
            if (!container) return;
            
            const headerHeight = 50;
            const controlsHeight = 140;
            const navHeight = 70;
            const infoHeight = 60;
            
            const availableHeight = window.innerHeight - headerHeight - controlsHeight - navHeight - infoHeight;
            const availableWidth = window.innerWidth - 20;
            
            const size = Math.min(availableWidth, availableHeight);
            
            container.style.width = `${size}px`;
            container.style.height = `${size}px`;
            
            // Force board resize if using chessboard.js
            if (window.board && typeof window.board.resize === 'function') {
                setTimeout(() => window.board.resize(), 100);
            }
        };
        
        resizeBoard();
        window.addEventListener('resize', resizeBoard);
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeBoard, 100);
        });
    }
    
    handleOrientation() {
        const checkOrientation = () => {
            this.isLandscape = window.innerWidth > window.innerHeight;
            document.body.classList.toggle('landscape', this.isLandscape);
        };
        
        checkOrientation();
        window.addEventListener('orientationchange', checkOrientation);
        window.addEventListener('resize', checkOrientation);
    }
    
    preventDefaults() {
        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Prevent pinch zoom on board
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });
        
        // Prevent scroll bounce
        document.body.addEventListener('touchmove', (e) => {
            if (e.target.closest('.left-sidebar, .right-sidebar, .modal-content')) {
                return; // Allow scrolling in sidebars and modals
            }
            e.preventDefault();
        }, { passive: false });
    }
    
    setViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }
    
    vibrate(intensity = 'medium') {
        if (!this.haptics) return;
        
        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30,
            success: [10, 20, 30],
            error: [50, 100, 50]
        };
        
        navigator.vibrate(patterns[intensity] || 20);
    }
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('mobileNotification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `mobile-notification ${type}`;
        notification.classList.add('show');
        
        this.vibrate(type === 'error' ? 'error' : 'success');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }
    
    updateStats(stats) {
        // Update mobile header stats
        if (stats.rating) {
            const ratingEl = document.getElementById('mobileRating');
            if (ratingEl) ratingEl.textContent = stats.rating;
        }
        
        if (stats.streak !== undefined) {
            const streakEl = document.getElementById('mobileStreak');
            if (streakEl) streakEl.textContent = stats.streak;
        }
    }
    
    updatePuzzleInfo(puzzle) {
        // Update puzzle info card
        if (puzzle.difficulty) {
            const diffEl = document.getElementById('mobileDifficulty');
            if (diffEl) diffEl.textContent = '⭐'.repeat(puzzle.difficulty);
        }
        
        if (puzzle.theme) {
            const themeEl = document.getElementById('mobilePuzzleTheme');
            if (themeEl) themeEl.textContent = puzzle.theme;
        }
        
        if (puzzle.category) {
            const catEl = document.getElementById('mobileCategory');
            if (catEl) catEl.textContent = puzzle.category;
        }
    }
    
    updateTimer(time) {
        const timerEl = document.getElementById('mobileTimer');
        if (timerEl) {
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileEnhanced = new MobileEnhanced();
    });
} else {
    window.mobileEnhanced = new MobileEnhanced();
}

// Export for use in other modules
window.MobileEnhanced = MobileEnhanced;