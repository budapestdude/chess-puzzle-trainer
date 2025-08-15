// Focused Mode Handler - Simplifies UI when entering from landing page

function initializeFocusedMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (!mode) return false; // Not in focused mode
    
    // Add focused mode class to body
    document.body.classList.add('focused-mode');
    document.body.dataset.mode = mode;
    
    // Customize the left sidebar for focused mode
    const leftSidebar = document.querySelector('.left-sidebar');
    if (leftSidebar) {
        // Hide all sections except for essentials
        leftSidebar.querySelectorAll('.sidebar-section').forEach(section => {
            const sectionId = section.id;
            
            // Keep user section and rush options (for rush mode only)
            if (sectionId === 'userSection' || (mode === 'rush' && sectionId === 'rushOptions')) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
        
        // Keep the sidebar header for navigation
        const sidebarHeader = leftSidebar.querySelector('.sidebar-header');
        if (sidebarHeader) {
            sidebarHeader.style.display = 'block';
        }
        
        // Add current mode indicator
        addModeIndicatorToSidebar(mode);
    }
    
    // Hide mobile menu toggle
    const mobileToggle = document.getElementById('mobileMenuToggle');
    if (mobileToggle) {
        mobileToggle.style.display = 'none';
    }
    
    // Adjust main content to center
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.justifyContent = 'center';
        mainContent.style.padding = '0';
    }
    
    // Make puzzle area full width
    const puzzleArea = document.querySelector('.puzzle-area');
    if (puzzleArea) {
        puzzleArea.style.maxWidth = '800px';
        puzzleArea.style.margin = '0 auto';
    }
    
    // Simplify controls based on mode
    simplifyControlsForMode(mode);
    
    // Add mode indicator
    addModeIndicator(mode);
    
    return true;
}

function simplifyControlsForMode(mode) {
    // Hide analyze button - not needed for focused solving
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.style.display = 'none';
    }
    
    // Mode-specific adjustments
    switch(mode) {
        case 'rush':
            // In rush mode, hide hints and solution
            const hintBtn = document.getElementById('hintBtn');
            const solutionBtn = document.getElementById('solutionBtn');
            if (hintBtn) hintBtn.style.display = 'none';
            if (solutionBtn) solutionBtn.style.display = 'none';
            
            // Don't add rush controls here - they should be in the sidebar
            break;
            
        case 'rated':
            // In rated mode, limit hints
            break;
            
        case 'review':
            // In review mode, show solution prominently
            break;
            
    }
}

function addModeIndicator(mode) {
    const modeNames = {
        'practice': '🎯 Practice Mode',
        'rated': '🏆 Rated Mode',
        'rush': '⚡ Rush Mode',
        'review': '📚 Review Mode',
        'theme': '🏷️ Theme Training'
    };
    
    const puzzleHeader = document.querySelector('.puzzle-header');
    if (puzzleHeader) {
        const modeIndicator = document.createElement('div');
        modeIndicator.className = 'mode-indicator';
        
        // Check for theme-based training
        const urlParams = new URLSearchParams(window.location.search);
        const theme = urlParams.get('theme');
        
        let badgeText = modeNames[mode] || mode;
        if (mode === 'theme' && theme) {
            const themeIcons = {
                'fork': '🍴',
                'pin': '📌',
                'skewer': '🗡️',
                'sacrifice': '💥',
                'mateIn1': '⚡',
                'mateIn2': '⚔️',
                'mateIn3': '🎯',
                'backRankMate': '🏰',
                'smotheredMate': '🐴',
                'endgame': '🏁',
                'rookEndgame': '♖',
                'pawnEndgame': '♟️',
                'promotion': '👑'
            };
            
            const icon = themeIcons[theme] || '🏷️';
            const themeName = theme.charAt(0).toUpperCase() + theme.slice(1);
            badgeText = `${icon} ${themeName} Training`;
        }
        
        modeIndicator.innerHTML = `
            <span class="mode-badge">${badgeText}</span>
        `;
        modeIndicator.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        `;
        puzzleHeader.style.position = 'relative';
        puzzleHeader.appendChild(modeIndicator);
    }
}

function addModeIndicatorToSidebar(mode) {
    const modeNames = {
        'practice': '🎯 Practice Mode',
        'rated': '🏆 Rated Mode',
        'rush': '⚡ Rush Mode',
        'review': '📚 Review Mode',
        'theme': '🏷️ Theme Training'
    };
    
    const leftSidebar = document.querySelector('.left-sidebar');
    if (!leftSidebar) return;
    
    // Create mode indicator section
    const modeSection = document.createElement('div');
    modeSection.className = 'sidebar-section focused-mode-indicator';
    modeSection.id = 'currentModeSection';
    
    // Check for theme-based training
    const urlParams = new URLSearchParams(window.location.search);
    const theme = urlParams.get('theme');
    
    let modeTitle = modeNames[mode] || mode;
    if (mode === 'theme' && theme) {
        const themeIcons = {
            'fork': '🍴',
            'pin': '📌',
            'skewer': '🗡️',
            'sacrifice': '💥',
            'mateIn1': '⚡',
            'mateIn2': '⚔️',
            'mateIn3': '🎯',
            'backRankMate': '🏰',
            'smotheredMate': '🐴',
            'endgame': '🏁',
            'rookEndgame': '♖',
            'pawnEndgame': '♟️',
            'promotion': '👑'
        };
        
        const icon = themeIcons[theme] || '🏷️';
        const themeName = theme.charAt(0).toUpperCase() + theme.slice(1);
        modeTitle = `${icon} ${themeName} Training`;
    }
    
    modeSection.innerHTML = `
        <h3>Current Mode</h3>
        <div class="current-mode-badge">
            ${modeTitle}
        </div>
    `;
    
    // Insert after the sidebar header
    const sidebarHeader = leftSidebar.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.after(modeSection);
    } else {
        leftSidebar.prepend(modeSection);
    }
}

// Export functions
window.initializeFocusedMode = initializeFocusedMode;