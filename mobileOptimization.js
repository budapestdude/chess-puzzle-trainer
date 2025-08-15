// Mobile Optimization for Chess Puzzle Trainer
class MobileOptimization {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.isPWA = this.detectPWA();
        this.touchStartX = null;
        this.touchStartY = null;
        
        if (this.isMobile || this.isTablet) {
            this.initializeMobile();
        }
        
        this.initializePWA();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.innerWidth <= 768;
    }
    
    detectTablet() {
        return /iPad|Android/i.test(navigator.userAgent) 
            && window.innerWidth > 768 
            && window.innerWidth <= 1024;
    }
    
    detectPWA() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone
            || document.referrer.includes('android-app://');
    }
    
    initializeMobile() {
        // Add mobile class to body
        document.body.classList.add('mobile');
        
        // Create mobile navigation
        this.createMobileNav();
        
        // Create mobile header
        this.createMobileHeader();
        
        // Initialize touch gestures
        this.initializeTouchGestures();
        
        // Optimize board for mobile
        this.optimizeBoard();
        
        // Handle orientation changes
        this.handleOrientationChange();
        
        // Prevent zoom on double tap
        this.preventDoubleTapZoom();
        
        // Add viewport meta tag
        this.setViewportMeta();
        
        // Initialize haptic feedback
        this.initializeHaptics();
    }
    
    createMobileNav() {
        const mobileNav = document.createElement('div');
        mobileNav.className = 'mobile-nav';
        mobileNav.innerHTML = `
            <button class="mobile-nav-btn active" data-panel="board">
                <span class="mobile-nav-icon">♟️</span>
                <span>Board</span>
            </button>
            <button class="mobile-nav-btn" data-panel="filters">
                <span class="mobile-nav-icon">⚙️</span>
                <span>Filters</span>
            </button>
            <button class="mobile-nav-btn" data-panel="stats">
                <span class="mobile-nav-icon">📊</span>
                <span>Stats</span>
            </button>
            <button class="mobile-nav-btn" data-panel="controls">
                <span class="mobile-nav-icon">🎮</span>
                <span>Controls</span>
            </button>
            <button class="mobile-nav-btn" data-panel="profile">
                <span class="mobile-nav-icon">👤</span>
                <span>Profile</span>
            </button>
        `;
        
        document.body.appendChild(mobileNav);
        
        // Add click handlers
        mobileNav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleMobileNavClick(e.currentTarget);
            });
        });
    }
    
    createMobileHeader() {
        const mobileHeader = document.createElement('div');
        mobileHeader.className = 'mobile-header';
        mobileHeader.innerHTML = `
            <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
            <div class="mobile-title">ChessTactics</div>
            <div class="mobile-stats">
                <span class="mobile-rating">1200</span>
                <span class="mobile-streak">🔥 0</span>
            </div>
        `;
        
        document.body.insertBefore(mobileHeader, document.body.firstChild);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        // Menu button handler
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            this.toggleSidebar('left');
        });
        
        // Overlay click handler
        overlay.addEventListener('click', () => {
            this.closeSidebars();
        });
    }
    
    handleMobileNavClick(btn) {
        // Remove active class from all buttons
        document.querySelectorAll('.mobile-nav-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        const panel = btn.dataset.panel;
        
        // Close any open sidebars
        this.closeSidebars();
        
        switch(panel) {
            case 'board':
                // Just show the board
                break;
            case 'filters':
                this.toggleSidebar('left');
                break;
            case 'controls':
                this.toggleSidebar('right');
                break;
            case 'stats':
                document.getElementById('statsBtn').click();
                break;
            case 'profile':
                window.location.href = '/profile';
                break;
        }
        
        // Haptic feedback
        this.triggerHaptic('light');
    }
    
    toggleSidebar(side) {
        const sidebar = document.querySelector(`.${side}-sidebar`);
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        } else {
            this.closeSidebars();
            sidebar.classList.add('active');
            overlay.classList.add('active');
        }
    }
    
    closeSidebars() {
        document.querySelectorAll('.left-sidebar, .right-sidebar').forEach(sidebar => {
            sidebar.classList.remove('active');
        });
        document.querySelector('.sidebar-overlay').classList.remove('active');
    }
    
    initializeTouchGestures() {
        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartY = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY);
        }, { passive: true });
    }
    
    handleSwipe(startX, endX, startY, endY) {
        const diffX = endX - startX;
        const diffY = endY - startY;
        const threshold = 50;
        
        // Check if horizontal swipe is stronger than vertical
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe right - open left sidebar
                if (startX < 50) {
                    this.toggleSidebar('left');
                    this.triggerHaptic('light');
                }
            } else {
                // Swipe left - open right sidebar
                if (startX > window.innerWidth - 50) {
                    this.toggleSidebar('right');
                    this.triggerHaptic('light');
                }
            }
        }
    }
    
    optimizeBoard() {
        // Adjust board size for mobile
        const board = document.getElementById('board');
        if (!board) return;
        
        const resizeBoard = () => {
            const container = document.querySelector('.board-container');
            const availableHeight = window.innerHeight - 140; // Account for header and nav
            const availableWidth = window.innerWidth - 20;
            const size = Math.min(availableWidth, availableHeight);
            
            container.style.width = `${size}px`;
            container.style.height = `${size}px`;
        };
        
        resizeBoard();
        window.addEventListener('resize', resizeBoard);
        window.addEventListener('orientationchange', resizeBoard);
    }
    
    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            // Force layout recalculation
            setTimeout(() => {
                this.optimizeBoard();
                document.body.classList.toggle('landscape', window.orientation === 90 || window.orientation === -90);
            }, 100);
        });
    }
    
    preventDoubleTapZoom() {
        let lastTouchEnd = 0;
        
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
    
    setViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }
    
    initializeHaptics() {
        this.canVibrate = 'vibrate' in navigator;
    }
    
    triggerHaptic(intensity = 'medium') {
        if (!this.canVibrate) return;
        
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 20, 30],
            error: [50, 100, 50]
        };
        
        navigator.vibrate(patterns[intensity] || patterns.medium);
    }
    
    // PWA Installation
    initializePWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered:', registration);
                        
                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    this.showUpdateNotification();
                                }
                            });
                        });
                    })
                    .catch(err => console.log('SW registration failed:', err));
            });
        }
        
        // Handle install prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button
            this.showInstallButton(deferredPrompt);
        });
        
        // Handle successful installation
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallButton();
        });
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => {
                this.requestNotificationPermission();
            }, 30000); // Ask after 30 seconds
        }
        
        // Enable offline mode
        this.enableOfflineMode();
    }
    
    showInstallButton(deferredPrompt) {
        const installBanner = document.createElement('div');
        installBanner.className = 'install-banner';
        installBanner.innerHTML = `
            <div class="install-content">
                <div class="install-icon">📱</div>
                <div class="install-text">
                    <div class="install-title">Install Chess Trainer</div>
                    <div class="install-subtitle">Add to home screen for offline play</div>
                </div>
                <button class="install-btn" id="installBtn">Install</button>
                <button class="install-close" id="installClose">×</button>
            </div>
        `;
        
        document.body.appendChild(installBanner);
        
        setTimeout(() => installBanner.classList.add('show'), 100);
        
        document.getElementById('installBtn').addEventListener('click', async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted installation');
            }
            
            deferredPrompt = null;
            this.hideInstallButton();
        });
        
        document.getElementById('installClose').addEventListener('click', () => {
            this.hideInstallButton();
        });
    }
    
    hideInstallButton() {
        const banner = document.querySelector('.install-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 300);
        }
    }
    
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <div class="update-text">A new version is available!</div>
                <button class="update-btn" id="updateBtn">Update</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        document.getElementById('updateBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permissionBanner = document.createElement('div');
            permissionBanner.className = 'permission-banner';
            permissionBanner.innerHTML = `
                <div class="permission-content">
                    <div class="permission-icon">🔔</div>
                    <div class="permission-text">
                        <div class="permission-title">Enable Notifications</div>
                        <div class="permission-subtitle">Get daily puzzle reminders</div>
                    </div>
                    <button class="permission-btn" id="enableNotifications">Enable</button>
                    <button class="permission-close" id="notificationClose">×</button>
                </div>
            `;
            
            document.body.appendChild(permissionBanner);
            
            setTimeout(() => permissionBanner.classList.add('show'), 100);
            
            document.getElementById('enableNotifications').addEventListener('click', async () => {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    new Notification('Chess Trainer', {
                        body: 'Notifications enabled! You\'ll receive daily puzzle reminders.',
                        icon: '/icons/icon-192x192.png'
                    });
                }
                
                permissionBanner.remove();
            });
            
            document.getElementById('notificationClose').addEventListener('click', () => {
                permissionBanner.remove();
            });
        }
    }
    
    enableOfflineMode() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.showConnectionStatus('online');
        });
        
        window.addEventListener('offline', () => {
            this.showConnectionStatus('offline');
        });
        
        // Cache puzzle data for offline use
        this.cachePuzzleData();
    }
    
    showConnectionStatus(status) {
        const statusBanner = document.createElement('div');
        statusBanner.className = `connection-status ${status}`;
        statusBanner.innerHTML = status === 'online' 
            ? '✅ Back online' 
            : '📵 Offline mode - Progress will sync when connected';
        
        document.body.appendChild(statusBanner);
        
        setTimeout(() => statusBanner.classList.add('show'), 100);
        
        setTimeout(() => {
            statusBanner.classList.remove('show');
            setTimeout(() => statusBanner.remove(), 300);
        }, 3000);
    }
    
    cachePuzzleData() {
        // Cache puzzles in IndexedDB for offline use
        if ('indexedDB' in window) {
            const request = indexedDB.open('ChessTrainerDB', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('puzzles')) {
                    const puzzleStore = db.createObjectStore('puzzles', { keyPath: 'id' });
                    puzzleStore.createIndex('difficulty', 'difficulty', { unique: false });
                    puzzleStore.createIndex('theme', 'theme', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('progress')) {
                    const progressStore = db.createObjectStore('progress', { keyPath: 'id', autoIncrement: true });
                    progressStore.createIndex('synced', 'synced', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB initialized for offline storage');
            };
        }
    }
    
    // Save progress locally when offline
    async saveOfflineProgress(puzzleData) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['progress'], 'readwrite');
        const store = transaction.objectStore('progress');
        
        const progressData = {
            ...puzzleData,
            timestamp: Date.now(),
            synced: false
        };
        
        await store.add(progressData);
        
        // Try to sync when back online
        if (navigator.onLine) {
            this.syncOfflineProgress();
        }
    }
    
    async syncOfflineProgress() {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['progress'], 'readonly');
        const store = transaction.objectStore('progress');
        const index = store.index('synced');
        const unsyncedData = await index.getAll(false);
        
        for (const data of unsyncedData) {
            try {
                // Send to server
                await fetch('/api/sync-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                // Mark as synced
                const updateTx = this.db.transaction(['progress'], 'readwrite');
                const updateStore = updateTx.objectStore('progress');
                data.synced = true;
                await updateStore.put(data);
            } catch (error) {
                console.error('Failed to sync progress:', error);
            }
        }
    }
}

// CSS for mobile optimization components
const mobileStyles = document.createElement('style');
mobileStyles.textContent = `
    .install-banner,
    .permission-banner,
    .update-notification {
        position: fixed;
        bottom: -100px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        border-radius: 12px;
        padding: 16px;
        transition: bottom 0.3s ease;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .install-banner.show,
    .permission-banner.show,
    .update-notification.show {
        bottom: 100px;
    }
    
    .install-content,
    .permission-content,
    .update-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .install-icon,
    .permission-icon {
        font-size: 32px;
    }
    
    .install-text,
    .permission-text {
        flex: 1;
    }
    
    .install-title,
    .permission-title {
        font-weight: 600;
        margin-bottom: 4px;
    }
    
    .install-subtitle,
    .permission-subtitle {
        font-size: 14px;
        opacity: 0.9;
    }
    
    .install-btn,
    .permission-btn,
    .update-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 20px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
    }
    
    .install-close,
    .permission-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.7;
    }
    
    .connection-status {
        position: fixed;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        transition: top 0.3s ease;
        z-index: 10001;
    }
    
    .connection-status.show {
        top: 70px;
    }
    
    .connection-status.online {
        background: rgba(16, 185, 129, 0.9);
    }
    
    .connection-status.offline {
        background: rgba(239, 68, 68, 0.9);
    }
`;
document.head.appendChild(mobileStyles);

// Initialize mobile optimization
window.MobileOptimization = MobileOptimization;