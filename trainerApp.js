let board = null;
let game = null;
let trainingSystem = null;
let userAuth = null;
let currentPuzzle = null;
let puzzleMoves = [];
let currentMoveIndex = 0;
let startTime = null;
let timerInterval = null;
let hintsRemaining = 3;
let isShowingSolution = false;
let selectedCategories = new Set(['checkmate']);
let selectedDifficulties = new Set(['1', '2', '3']);
let selectedSquare = null; // For click-click moves
let selectedThemes = new Set(['all']);
let currentMode = 'practice';
let pendingPromotion = null;
let filteredPuzzles = [];
let totalPuzzleCount = 0;

// API functions to fetch puzzles from database
async function fetchPuzzleCount(minRating = 0, maxRating = 3000, themes = null) {
    try {
        let url = `/api/puzzles/count?minRating=${minRating}&maxRating=${maxRating}`;
        if (themes && themes.length > 0) {
            url += `&themes=${themes.join(',')}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        return data.success ? data.count : 0;
    } catch (error) {
        console.error('Failed to fetch puzzle count:', error);
        return 0;
    }
}

async function fetchRandomPuzzle(minRating = null, maxRating = null, themes = null) {
    try {
        let url = '/api/puzzles/random?';
        const params = [];
        
        if (minRating !== null) params.push(`minRating=${minRating}`);
        if (maxRating !== null) params.push(`maxRating=${maxRating}`);
        if (themes && themes.length > 0) params.push(`themes=${themes.join(',')}`);
        
        url += params.join('&');
        
        console.log('Fetching puzzle from:', url); // Debug log
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('API response:', data); // Debug log
        
        if (data.success && data.puzzle) {
            console.log('Successfully loaded puzzle from new database:', data.puzzle.puzzle_id);
            return data.puzzle;
        } else {
            console.log('No puzzle returned from API:', data);
            return null;
        }
    } catch (error) {
        console.error('Failed to fetch random puzzle:', error);
        return null;
    }
}

// Convert UCI notation (e.g., "e2e4") to move object
function uciToMove(uciMove) {
    if (!uciMove || uciMove.length < 4) return null;
    
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
    
    return {
        from: from,
        to: to,
        promotion: promotion
    };
}

// Load puzzle from new database API
function loadPuzzleFromAPI(puzzle) {
    if (!puzzle) {
        showNotification('No puzzle found', 'error');
        return;
    }
    
    // Convert API puzzle format to our expected format
    // Lichess uses UCI format (e.g., "e2e4" instead of "e4")
    let moves = [];
    if (puzzle.moves) {
        // Store the UCI moves as-is, we'll convert them when needed
        moves = puzzle.moves.split(' ');
    }
    
    currentPuzzle = {
        id: puzzle.puzzle_id || puzzle.id,
        fen: puzzle.fen,
        moves: moves, // These are in UCI format
        rating: puzzle.rating,
        themes: puzzle.themes,
        category: 'tactics', // Default category
        difficulty: Math.floor((puzzle.rating - 800) / 200) + 1, // Convert rating to difficulty 1-5
        description: `Puzzle ${puzzle.puzzle_id} (Rating: ${puzzle.rating})`,
        isUCI: true // Flag to indicate moves are in UCI format
    };
    
    // Set up the puzzle
    puzzleMoves = currentPuzzle.moves;
    currentMoveIndex = 0;
    hintsRemaining = currentMode === 'rated' ? 3 : 10;
    isShowingSolution = false;
    
    // Update UI
    updatePuzzleCounter();
    
    // Update hint button (with null checks)
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
        hintBtn.textContent = `💡 Hint (${hintsRemaining})`;
        hintBtn.disabled = false;
    }
    
    const solutionBtn = document.getElementById('solutionBtn');
    if (solutionBtn) solutionBtn.disabled = false;
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.disabled = true;
    
    const puzzleDesc = document.getElementById('puzzleDescription');
    if (puzzleDesc) puzzleDesc.textContent = currentPuzzle.description;
    
    const puzzleTheme = document.getElementById('puzzleTheme');
    if (puzzleTheme && currentPuzzle.themes) {
        // Format themes nicely instead of showing raw data
        const themeList = currentPuzzle.themes.split(' ').filter(t => t.trim());
        const formattedThemes = themeList.slice(0, 2).map(theme => {
            // Convert camelCase to readable format
            return theme
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace('Mate In', 'Mate in')
                .replace('One Move', '')
                .replace('On Move', '')
                .trim();
        }).filter(t => t.length > 0);
        
        if (formattedThemes.length > 0) {
            puzzleTheme.textContent = formattedThemes.join(', ');
        } else {
            puzzleTheme.parentElement.style.display = 'none';
        }
    }
    
    // Set up the board
    game = new Chess(currentPuzzle.fen);
    
    // For Lichess puzzles, the first move is the opponent's move that sets up the puzzle
    // We need to make that move automatically
    if (currentPuzzle.isUCI && puzzleMoves.length > 0) {
        const setupMove = puzzleMoves[0];
        const moveObj = uciToMove(setupMove);
        if (moveObj) {
            const move = game.move(moveObj);
            if (move) {
                currentMoveIndex = 1; // Start from move 1 (user's first move)
                
                // Add the setup move to history
                addMoveToHistory(move.san + ' (setup)', 'setup');
            }
        }
    }
    
    if (board) {
        board.position(game.fen());
        // After the setup move, orient board for the player's perspective
        // The player is always the side to move after the setup
        board.orientation(game.turn() === 'w' ? 'white' : 'black');
    }
    
    // Determine whose turn it is and update the UI
    const currentPlayer = game.turn() === 'w' ? 'White' : 'Black';
    const currentPlayerEl = document.getElementById('currentPlayer');
    if (currentPlayerEl) {
        currentPlayerEl.textContent = `${currentPlayer} to move`;
    }
    
    startTimer();
    
    // Hide any existing notifications
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.remove('show');
    }
}

async function updatePuzzleCounter() {
    // Hide the puzzle counter element - we don't want to show puzzle IDs
    const puzzleCounter = document.getElementById('puzzleCounter');
    if (puzzleCounter && puzzleCounter.parentElement) {
        puzzleCounter.parentElement.style.display = 'none';
    }
}

// rushModeState is defined in rushMode.js which loads before this file

async function initializeTraining() {
    // Check if user is logged in, redirect to home if not
    const currentUser = localStorage.getItem('currentChessUser');
    if (!currentUser) {
        window.location.href = '/';
        return;
    }
    
    userAuth = new UserAuth();
    // Wait for userAuth to initialize before proceeding
    await userAuth.initializeAuth();
    
    console.log('UserAuth initialized, current user:', userAuth.getCurrentUser()); // Debug log
    
    trainingSystem = new TrainingSystem();
    
    // Initialize focused mode if coming from landing page
    const isFocused = initializeFocusedMode();
    
    // Check URL parameters for mode
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    if (modeParam) {
        currentMode = modeParam;
        
        // Auto-start the appropriate mode
        if (isFocused) {
            setTimeout(() => {
                switch(modeParam) {
                    case 'rush':
                        // Show rush options and auto-start 3-min mode
                        const rushOptionsElement = document.getElementById('rushOptions');
                        if (rushOptionsElement) {
                            rushOptionsElement.style.display = 'block';
                        }
                        // Initialize rush mode if not already done
                        if (typeof initRushMode === 'function') {
                            initRushMode();
                        }
                        startRushMode('3min');
                        break;
                    case 'review':
                        loadFailedPuzzles();
                        break;
                    case 'practice':
                    case 'rated':
                    default:
                        // For practice, rated, and any other mode, load a puzzle immediately
                        loadNextPuzzle();
                        break;
                }
            }, 100);
        } else {
            // Not focused mode, use the old behavior
            setTimeout(() => {
                const modeBtn = document.querySelector(`[data-mode="${modeParam}"]`);
                if (modeBtn) {
                    modeBtn.click();
                }
            }, 100);
        }
    }
    
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    
    // Check if board element exists before initializing
    const boardElement = document.getElementById('board');
    if (!boardElement) {
        console.error('Board element not found! Cannot initialize chessboard.');
        return;
    }
    
    board = Chessboard('board', config);
    
    // Add click-click move functionality
    setupClickClickMoves();
    
    setupEventListeners();
    setupAuthEventListeners();
    setupThemeToggle();
    
    // Initialize rush mode buttons
    if (typeof initRushMode === 'function') {
        initRushMode();
    }
    
    // Only render filters if not in focused mode
    if (!isFocused) {
        renderCategories();
        renderThemes();
        updateFilters();
    }
    
    updateUI();
    loadNextPuzzle();
    
    window.addEventListener('resize', () => {
        board.resize();
    });
    
    // Initialize keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Mobile menu toggle
    document.getElementById('mobileMenuToggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('mobile-open');
    });
}

function setupEventListeners() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
            
            // Update UI for the new mode
            updateModeSpecificUI();
            
            // Handle special modes
            if (currentMode === 'review') {
                loadFailedPuzzles();
            } else if (currentMode === 'rush') {
                // Show rush options
                document.getElementById('rushOptions').style.display = 'block';
            } else {
                // Hide rush options for non-rush modes
                document.getElementById('rushOptions').style.display = 'none';
                loadNextPuzzle();
            }
        });
    });
    
    // Difficulty checkboxes
    document.querySelectorAll('input[name="difficulty"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedDifficulties.add(e.target.value);
            } else {
                selectedDifficulties.delete(e.target.value);
            }
            if (selectedDifficulties.size === 0) {
                e.target.checked = true;
                selectedDifficulties.add(e.target.value);
            }
            updateFilters();
        });
    });
    
    // Filter buttons
    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        loadNextPuzzle();
    });
    
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        // Reset all filters
        selectedCategories = new Set(['checkmate']);
        selectedDifficulties = new Set(['1', '2', '3']);
        selectedThemes = new Set(['all']);
        
        // Update UI
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.name === 'difficulty') {
                cb.checked = true;
            } else if (cb.value === 'checkmate' || cb.value === 'all') {
                cb.checked = true;
            } else {
                cb.checked = false;
            }
        });
        
        updateFilters();
        loadNextPuzzle();
    });
    
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
        hintBtn.addEventListener('click', showHint);
    } else {
        console.error('Hint button not found!');
    }
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzePosition);
    
    const resetBtn = document.getElementById('resetPuzzleBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetPuzzle);
    } else {
        console.error('Reset button not found!');
    }
    
    const solutionBtn = document.getElementById('solutionBtn');
    if (solutionBtn) {
        solutionBtn.addEventListener('click', showSolution);
    } else {
        console.error('Solution button not found!');
    }
    
    const nextButton = document.getElementById('nextBtn');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            loadNextPuzzle();
        });
    } else {
        console.error('Next button not found!');
    }
    
    // Stats buttons (only if they exist - not in focused mode)
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) statsBtn.addEventListener('click', showStatistics);
    
    const analyticsBtn = document.getElementById('analyticsBtn');
    if (analyticsBtn) analyticsBtn.addEventListener('click', showAnalytics);
    
    const achievementsBtn = document.getElementById('achievementsBtn');
    if (achievementsBtn) achievementsBtn.addEventListener('click', showAchievements);
    
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', showLeaderboard);
    
    // Add export button listener (only if actions panel exists)
    const actionsPanel = document.querySelector('.actions');
    if (actionsPanel) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportBtn';
        exportBtn.className = 'action-btn';
        exportBtn.innerHTML = '📥 Export Data';
        exportBtn.addEventListener('click', showExportOptions);
        const resetBtn = document.querySelector('.actions #resetBtn');
        if (resetBtn) {
            actionsPanel.insertBefore(exportBtn, resetBtn);
            resetBtn.addEventListener('click', () => {
                if (trainingSystem.resetProgress()) {
                    location.reload();
                }
            });
        }
    }
    
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Keyboard shortcuts
        switch(e.key.toLowerCase()) {
            case 'n':
                // Next puzzle (N)
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    loadNextPuzzle();
                }
                break;
                
            case 'h':
                // Hint (H)
                if (!e.ctrlKey && !e.metaKey && !document.getElementById('hintBtn').disabled) {
                    e.preventDefault();
                    showHint();
                }
                break;
                
            case 's':
                // Show solution (S)
                if (!e.ctrlKey && !e.metaKey && !document.getElementById('solutionBtn').disabled) {
                    e.preventDefault();
                    showSolution();
                }
                break;
                
            case 'r':
                // Reset puzzle (R)
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    resetPuzzle();
                }
                break;
                
            case 'd':
                // Toggle dark mode (D)
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    document.getElementById('themeToggle').click();
                }
                break;
                
            case 'l':
                // Leaderboard (L)
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    showLeaderboard();
                }
                break;
                
            case 'a':
                // Analytics (A)
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    showAnalytics();
                }
                break;
                
            case '?':
                // Help - Show shortcuts (?)
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    showKeyboardShortcuts();
                }
                break;
                
            case 'escape':
                // Close any open modal
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'block') {
                        modal.style.display = 'none';
                    }
                });
                break;
                
            case 'arrowleft':
                // Previous move in solution
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Implementation would require move history navigation
                }
                break;
                
            case 'arrowright':
                // Next move in solution
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Implementation would require move history navigation
                }
                break;
        }
        
        // Number keys 1-3 for difficulty selection
        if (e.key >= '1' && e.key <= '3') {
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const difficultyCheckbox = document.querySelector(`input[name="difficulty"][value="${e.key}"]`);
                if (difficultyCheckbox) {
                    difficultyCheckbox.click();
                }
            }
        }
    });
}

// Data export functionality
function showExportOptions() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>📥 Export Training Data</h2>
            <div class="export-options" style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                <button class="export-btn" style="padding: 15px; font-size: 16px; cursor: pointer; background: #3498db; color: white; border: none; border-radius: 5px;" onclick="exportDataAsCSV()">📊 Export as CSV</button>
                <button class="export-btn" style="padding: 15px; font-size: 16px; cursor: pointer; background: #2ecc71; color: white; border: none; border-radius: 5px;" onclick="exportDataAsJSON()">📝 Export as JSON</button>
                <button class="export-btn" style="padding: 15px; font-size: 16px; cursor: pointer; background: #e74c3c; color: white; border: none; border-radius: 5px;" onclick="exportDataAsPDF()">📄 Export as PDF Report</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function exportDataAsCSV() {
    const stats = trainingSystem.getStatistics();
    const history = trainingSystem.userData.puzzleHistory;
    
    // Create CSV content
    let csv = 'Training Data Export\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Summary stats
    csv += 'Summary Statistics\n';
    csv += `Rating,${stats.rating}\n`;
    csv += `Total Solved,${stats.totalSolved}\n`;
    csv += `Total Failed,${stats.totalFailed}\n`;
    csv += `Success Rate,${stats.successRate}%\n`;
    csv += `Best Streak,${stats.streakRecord}\n\n`;
    
    // Category breakdown
    csv += 'Category Performance\n';
    csv += 'Category,Solved,Attempted,Success Rate,Avg Time\n';
    stats.categoryStats.forEach(cat => {
        csv += `${cat.name},${cat.solved},${cat.attempted},${cat.successRate}%,${cat.avgTime.toFixed(1)}s\n`;
    });
    csv += '\n';
    
    // Puzzle history
    csv += 'Puzzle History\n';
    csv += 'Date,Puzzle ID,Category,Difficulty,Solved,Time(s),Hints Used\n';
    history.slice(-100).forEach(h => {
        const date = new Date(h.timestamp).toLocaleDateString();
        csv += `${date},${h.puzzleId},${h.category},${h.difficulty},${h.solved ? 'Yes' : 'No'},${h.timeSpent},${h.hintsUsed}\n`;
    });
    
    // Download file
    downloadFile(csv, 'chess_training_data.csv', 'text/csv');
    showNotification('Data exported as CSV', 'success');
    document.querySelector('.modal').remove();
}

function exportDataAsJSON() {
    const exportData = {
        exportDate: new Date().toISOString(),
        userData: trainingSystem.userData,
        statistics: trainingSystem.getStatistics(),
        currentSession: trainingSystem.currentSession
    };
    
    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, 'chess_training_data.json', 'application/json');
    showNotification('Data exported as JSON', 'success');
    document.querySelector('.modal').remove();
}

function exportDataAsPDF() {
    const stats = trainingSystem.getStatistics();
    
    // Create HTML content for PDF
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Chess Training Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                h2 { color: #34495e; margin-top: 20px; }
                .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
                .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; }
                .stat-label { font-weight: bold; color: #7f8c8d; }
                .stat-value { font-size: 24px; color: #2c3e50; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #3498db; color: white; }
                .achievement { display: inline-block; margin: 5px; padding: 8px; background: #f39c12; color: white; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>Chess Training Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            
            <h2>Performance Overview</h2>
            <div class="stat-grid">
                <div class="stat-box">
                    <div class="stat-label">Current Rating</div>
                    <div class="stat-value">${stats.rating}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Success Rate</div>
                    <div class="stat-value">${stats.successRate}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Puzzles Solved</div>
                    <div class="stat-value">${stats.totalSolved}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Best Streak</div>
                    <div class="stat-value">${stats.streakRecord}</div>
                </div>
            </div>
            
            <h2>Category Performance</h2>
            <table>
                <tr>
                    <th>Category</th>
                    <th>Solved</th>
                    <th>Attempted</th>
                    <th>Success Rate</th>
                    <th>Avg Time</th>
                </tr>
                ${stats.categoryStats.map(cat => `
                    <tr>
                        <td>${cat.name}</td>
                        <td>${cat.solved}</td>
                        <td>${cat.attempted}</td>
                        <td>${cat.successRate}%</td>
                        <td>${cat.avgTime.toFixed(1)}s</td>
                    </tr>
                `).join('')}
            </table>
            
            <h2>Achievements Earned</h2>
            <div>
                ${trainingSystem.userData.achievements.map(a => 
                    `<span class="achievement">${a.replace(/_/g, ' ').toUpperCase()}</span>`
                ).join('')}
            </div>
            
            <h2>Recent Activity</h2>
            <p>Last 7 days: ${getRecentActivity(7)} puzzles solved</p>
            <p>Last 30 days: ${getRecentActivity(30)} puzzles solved</p>
        </body>
        </html>
    `;
    
    // Create a new window and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    
    showNotification('PDF report opened in new window', 'success');
    document.querySelector('.modal').remove();
}

function getRecentActivity(days) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return trainingSystem.userData.puzzleHistory.filter(h => 
        h.timestamp > cutoff && h.solved
    ).length;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Make export functions globally accessible
window.exportDataAsCSV = exportDataAsCSV;
window.exportDataAsJSON = exportDataAsJSON;
window.exportDataAsPDF = exportDataAsPDF;

function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'N', action: 'Next puzzle' },
        { key: 'H', action: 'Show hint' },
        { key: 'S', action: 'Show solution' },
        { key: 'R', action: 'Reset puzzle' },
        { key: 'D', action: 'Toggle dark mode' },
        { key: 'L', action: 'Show leaderboard' },
        { key: 'A', action: 'Show analytics' },
        { key: '1-3', action: 'Select difficulty' },
        { key: 'ESC', action: 'Close modal' },
        { key: '?', action: 'Show this help' }
    ];
    
    const shortcutList = shortcuts.map(s => 
        `<div style="display: flex; justify-content: space-between; padding: 8px; background: #f0f0f0; margin: 4px 0; border-radius: 4px;">
            <kbd style="background: white; padding: 4px 8px; border-radius: 3px; font-family: monospace; font-weight: bold;">${s.key}</kbd>
            <span>${s.action}</span>
        </div>`
    ).join('');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>⌨️ Keyboard Shortcuts</h2>
            ${shortcutList}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function setupThemeToggle() {
    // Check for saved theme preference or default to light
    const currentTheme = localStorage.getItem('chessTheme') || 'light';
    const themeIcon = document.getElementById('themeIcon');
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeIcon) {
            themeIcon.textContent = '☀️';
        }
    }
    
    // Theme toggle button (may not exist on trainer page)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && themeIcon) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            
            // Update icon
            themeIcon.textContent = isDark ? '☀️' : '🌙';
        
        // Save preference
        localStorage.setItem('chessTheme', isDark ? 'dark' : 'light');
        
        // Optional: Animate the transition
        if (isDark) {
            showNotification('Dark mode enabled 🌙', 'success');
        } else {
            showNotification('Light mode enabled ☀️', 'success');
        }
        });
    }
}

function setupAuthEventListeners() {
    // Login button (may not exist on trainer page)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            document.getElementById('loginModal').style.display = 'block';
        });
    }
    
    // Signup button (may not exist on trainer page)
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            document.getElementById('signupModal').style.display = 'block';
        });
    }
    
    // Logout button (may not exist on trainer page)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            userAuth.logout();
            updateUI();
            showNotification('Logged out successfully', 'success');
        });
    }
    
    // Sidebar logout button
    const sidebarLogout = document.getElementById('sidebarLogout');
    if (sidebarLogout) {
        sidebarLogout.addEventListener('click', () => {
            userAuth.logout();
            // Redirect to home after logout
            window.location.href = '/';
        });
    }
    
    // Login form (may not exist on trainer page)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                await userAuth.login(username, password);
                document.getElementById('loginModal').style.display = 'none';
                updateUI();
                showNotification(`Welcome back, ${username}!`, 'success');
                // Clear form
                document.getElementById('loginForm').reset();
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }
    
    // Signup form (may not exist on trainer page)
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            await userAuth.register(username, email, password);
            document.getElementById('signupModal').style.display = 'none';
            updateUI();
            showNotification(`Welcome, ${username}! Account created successfully.`, 'success');
            // Clear form
            document.getElementById('signupForm').reset();
        } catch (error) {
            showNotification(error.message, 'error');
        }
        });
    }
    
    // Switch between login and signup (may not exist on trainer page)
    const switchToSignup = document.getElementById('switchToSignup');
    if (switchToSignup) {
        switchToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('signupModal').style.display = 'block';
        });
    }
    
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signupModal').style.display = 'none';
            document.getElementById('loginModal').style.display = 'block';
        });
    }
    
    // Close modals when clicking outside
    document.querySelectorAll('.auth-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close buttons for auth modals
    document.getElementById('loginClose').addEventListener('click', () => {
        document.getElementById('loginModal').style.display = 'none';
    });
    
    document.getElementById('signupClose').addEventListener('click', () => {
        document.getElementById('signupModal').style.display = 'none';
    });
}

function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    
    Object.entries(puzzleCategories).forEach(([key, category]) => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <input type="checkbox" id="cat_${key}" value="${key}" checked>
            <span class="category-icon">${category.icon}</span>
            <label for="cat_${key}">${category.name}</label>
        `;
        
        item.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedCategories.add(key);
            } else {
                selectedCategories.delete(key);
            }
            if (selectedCategories.size === 0) {
                e.target.checked = true;
                selectedCategories.add(key);
            }
            updateFilters();
        });
        
        categoryList.appendChild(item);
    });
}

function renderThemes() {
    const themeList = document.getElementById('themeList');
    
    // Get all unique themes from puzzles
    const allThemes = new Set();
    puzzleDatabase.forEach(puzzle => {
        if (puzzle.theme && Array.isArray(puzzle.theme)) {
            puzzle.theme.forEach(t => allThemes.add(t));
        }
    });
    
    // Clear existing content except "All Themes"
    themeList.innerHTML = '<label><input type="checkbox" name="theme" value="all" checked> All Themes</label>';
    
    // Add theme checkboxes
    Array.from(allThemes).sort().forEach(theme => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="theme" value="${theme}"> ${themes[theme] || theme}`;
        
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.value === 'all') {
                if (e.target.checked) {
                    selectedThemes = new Set(['all']);
                    document.querySelectorAll('input[name="theme"]').forEach(cb => {
                        if (cb.value !== 'all') cb.checked = false;
                    });
                }
            } else {
                if (e.target.checked) {
                    selectedThemes.delete('all');
                    document.querySelector('input[value="all"]').checked = false;
                    selectedThemes.add(e.target.value);
                } else {
                    selectedThemes.delete(e.target.value);
                    if (selectedThemes.size === 0) {
                        selectedThemes.add('all');
                        document.querySelector('input[value="all"]').checked = true;
                    }
                }
            }
            updateFilters();
        });
        
        themeList.appendChild(label);
    });
    
    // Add listener to "All Themes" checkbox
    document.querySelector('input[value="all"]').addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedThemes = new Set(['all']);
            document.querySelectorAll('input[name="theme"]').forEach(cb => {
                if (cb.value !== 'all') cb.checked = false;
            });
        } else {
            e.target.checked = true; // Keep at least one selected
        }
        updateFilters();
    });
}

function updateFilters() {
    // Filter puzzles based on selected criteria
    filteredPuzzles = puzzleDatabase.filter(puzzle => {
        // Check category
        if (!selectedCategories.has(puzzle.category)) return false;
        
        // Check difficulty
        const difficulty = puzzle.difficulty ? puzzle.difficulty.toString() : '1';
        if (!selectedDifficulties.has(difficulty)) return false;
        
        // Check themes
        if (!selectedThemes.has('all')) {
            if (!puzzle.theme || !Array.isArray(puzzle.theme)) return false;
            const hasSelectedTheme = puzzle.theme.some(t => selectedThemes.has(t));
            if (!hasSelectedTheme) return false;
        }
        
        return true;
    });
    
    // Update puzzle count display
    document.getElementById('availablePuzzles').textContent = filteredPuzzles.length;
}

function updateUserStats() {
    // Always update stats since user is always logged in on this page
    const stats = trainingSystem.getStatistics();
    
    // Update sidebar stats
    const sidebarRating = document.getElementById('sidebarRating');
    const sidebarStreak = document.getElementById('sidebarStreak');
    const sidebarToday = document.getElementById('sidebarToday');
    
    if (sidebarRating) sidebarRating.textContent = stats.rating;
    if (sidebarStreak) sidebarStreak.textContent = stats.currentStreak;
    if (sidebarToday) sidebarToday.textContent = stats.sessionStats.solved;
    
    // Update the user's local data
    const user = userAuth.getCurrentUser();
    if (user) {
        user.trainingData = trainingSystem.userData;
        userAuth.updateUserData(trainingSystem.userData);
    }
}

function updateUI() {
    // Since users must be logged in to access this page, we always show user info
    const user = userAuth.getCurrentUser();
    
    // Also try to get user from localStorage as backup
    const storedUser = JSON.parse(localStorage.getItem('currentChessUser') || '{}');
    const displayUser = user || storedUser;
    
    console.log('updateUI called - user:', displayUser); // Debug log
    
    // Update sidebar username
    const sidebarUsername = document.getElementById('sidebarUsername');
    if (sidebarUsername) {
        sidebarUsername.textContent = displayUser?.username || 'Guest';
    }
    
    // Update sidebar stats
    const sidebarRating = document.getElementById('sidebarRating');
    const sidebarStreak = document.getElementById('sidebarStreak');
    const sidebarToday = document.getElementById('sidebarToday');
    
    if (displayUser?.trainingData) {
        const data = displayUser.trainingData;
        if (sidebarRating) sidebarRating.textContent = data.rating || 1200;
        if (sidebarStreak) sidebarStreak.textContent = data.streakCount || 0;
        if (sidebarToday) {
            // Count today's solved puzzles
            const today = new Date().toDateString();
            const todayCount = data.puzzleHistory ? 
                data.puzzleHistory.filter(p => 
                    new Date(p.timestamp).toDateString() === today && p.solved
                ).length : 0;
            sidebarToday.textContent = todayCount;
        }
    }
    
    // Load user's training data into training system
    if (user && user.trainingData) {
        trainingSystem.userData = { ...trainingSystem.userData, ...user.trainingData };
    }
    
    updateUserStats();
}

async function loadNextPuzzle() {
    stopTimer();
    clearMoveHistory();
    clearHighlights();
    selectedSquare = null;
    
    // Try to load from new database first
    try {
        // Check for theme-based training
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const theme = urlParams.get('theme');
        
        let puzzle;
        if (mode === 'theme' && theme) {
            // Load puzzle with specific theme
            puzzle = await fetchRandomPuzzle(null, null, [theme]);
        } else {
            // Load any puzzle
            puzzle = await fetchRandomPuzzle();
        }
        
        if (puzzle) {
            loadPuzzleFromAPI(puzzle);
            return;
        }
    } catch (error) {
        console.error('Failed to load from new database, falling back to old:', error);
    }
    
    // Fallback to old database
    // Check if we're in focused mode (no filters)
    const isFocusedMode = document.body.classList.contains('focused-mode');
    
    // Use all puzzles if in focused mode or if filteredPuzzles is empty
    const puzzlePool = (isFocusedMode || filteredPuzzles.length === 0) ? puzzleDatabase : filteredPuzzles;
    
    // Get available puzzles
    const availablePuzzles = puzzlePool.filter(p => 
        !trainingSystem.completedPuzzles.has(p.id)
    );
    
    if (availablePuzzles.length === 0) {
        // Try resetting completed puzzles if all are done
        if (puzzlePool.length > 0) {
            trainingSystem.completedPuzzles.clear();
            return loadNextPuzzle();
        }
        showNotification('No puzzles available!', 'error');
        return;
    }
    
    // Select a puzzle based on difficulty preference or randomly
    currentPuzzle = availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)];
    
    if (!currentPuzzle) {
        showNotification('No more puzzles available. Try changing filters!', 'error');
        return;
    }
    
    game = new Chess(currentPuzzle.fen);
    board.position(currentPuzzle.fen);
    
    puzzleMoves = currentPuzzle.moves;
    currentMoveIndex = 0;
    hintsRemaining = 3;
    isShowingSolution = false;
    
    updatePuzzleInfo();
    startTimer();
    
    document.getElementById('hintBtn').textContent = `💡 Hint (${hintsRemaining})`;
    document.getElementById('hintBtn').disabled = false;
    document.getElementById('solutionBtn').disabled = false;
    document.getElementById('nextBtn').disabled = true;
}

function loadFailedPuzzles() {
    if (trainingSystem.failedPuzzles.length === 0) {
        showNotification('No failed puzzles to review! Loading a new puzzle...', 'info');
        currentMode = 'practice';
        // Load a regular puzzle instead
        loadNextPuzzle();
        return;
    }
    
    const puzzleId = trainingSystem.failedPuzzles[0];
    currentPuzzle = puzzleDatabase.find(p => p.id === puzzleId);
    
    if (currentPuzzle) {
        game = new Chess(currentPuzzle.fen);
        board.position(currentPuzzle.fen);
        puzzleMoves = currentPuzzle.moves;
        currentMoveIndex = 0;
        hintsRemaining = 3;
        isShowingSolution = false;
        
        // Check if it's Black to move - if so, the computer (White) should make the first move
        const playerToMove = game.turn();
        
        updatePuzzleInfo();
        clearMoveHistory();
        startTimer();
        
        // If it's Black to move, the computer (White) should have already played
        // So we need to play the first move automatically
        if (playerToMove === 'b' && puzzleMoves.length > 0) {
            // The first move in the solution should be Black's move
            // But we need to make White's move that led to this position
            // Since our puzzles start from the position where the player needs to find the solution,
            // we don't need to make any automatic moves
        }
    }
}

function updatePuzzleInfo() {
    const category = puzzleCategories[currentPuzzle.category];
    document.getElementById('puzzleCategory').textContent = category.name;
    document.getElementById('puzzleDifficulty').textContent = '⭐'.repeat(currentPuzzle.difficulty);
    
    // Mode-specific UI updates
    updateModeSpecificUI();
    
    // Set side to move
    const sideToMove = game.turn() === 'w' ? 'White' : 'Black';
    const sideElement = document.getElementById('sideToMove');
    sideElement.textContent = `${sideToMove} to move`;
    sideElement.className = `side-to-move ${sideToMove.toLowerCase()}`;
    
    // Orient board based on who moves first
    board.orientation(game.turn() === 'w' ? 'white' : 'black');
    
    const themeText = currentPuzzle.theme.map(t => themes[t] || t).join(', ');
    document.getElementById('puzzleTheme').textContent = themeText;
    document.getElementById('puzzleDescription').textContent = currentPuzzle.description;
}

function updateModeSpecificUI() {
    const timerElement = document.getElementById('timer');
    const puzzleCounter = document.getElementById('puzzleCounter');
    const puzzleInfoDiv = document.querySelector('.puzzle-info');
    const rushInfo = document.getElementById('rushInfo');
    const ratingChange = document.getElementById('ratingChange');
    
    // Reset visibility first
    if (rushInfo) rushInfo.style.display = 'none';
    if (ratingChange) ratingChange.style.display = 'none';
    
    switch(currentMode) {
        case 'practice':
            // Practice mode: Show timer counting up, hide puzzle counter
            if (timerElement) {
                timerElement.style.display = 'block';
                timerElement.style.color = 'var(--primary)';
            }
            if (puzzleCounter && puzzleCounter.parentElement) {
                puzzleCounter.parentElement.style.display = 'none';
            }
            break;
            
        case 'rated':
            // Rated mode: Show timer counting up (for personal records), show puzzle count
            if (timerElement) {
                timerElement.style.display = 'block';
                timerElement.style.color = 'var(--accent)';
            }
            if (puzzleCounter && puzzleCounter.parentElement) {
                puzzleCounter.parentElement.style.display = 'block';
                const solvedCount = trainingSystem ? trainingSystem.userData.totalPuzzlesSolved : 0;
                puzzleCounter.textContent = `Solved: ${solvedCount}`;
            }
            if (ratingChange) {
                ratingChange.style.display = 'block';
                ratingChange.textContent = `Rating: ${trainingSystem ? trainingSystem.userData.rating : 1200}`;
            }
            break;
            
        case 'rush':
            // Rush mode: Timer is handled by rushMode.js but still needs to be visible
            if (timerElement) {
                timerElement.style.display = 'block';
                timerElement.style.color = 'var(--danger)'; // Red for urgency
            }
            if (rushInfo) {
                rushInfo.style.display = 'block';
            }
            if (puzzleCounter && puzzleCounter.parentElement) {
                puzzleCounter.parentElement.style.display = 'none';
            }
            break;
            
            
        case 'review':
            // Review mode: No timer (learning mode), show review progress
            if (timerElement) {
                timerElement.style.display = 'none';
            }
            if (puzzleCounter && puzzleCounter.parentElement) {
                puzzleCounter.parentElement.style.display = 'block';
                const remaining = trainingSystem ? trainingSystem.failedPuzzles.length : 0;
                puzzleCounter.textContent = `Review: ${remaining} left`;
                puzzleCounter.style.color = 'var(--danger)';
            }
            break;
            
        default:
            // Default behavior
            if (timerElement) {
                timerElement.style.display = 'block';
            }
            if (puzzleCounter && puzzleCounter.parentElement) {
                puzzleCounter.parentElement.style.display = 'none';
            }
    }
}

function startTimer() {
    // Don't start timer in certain modes
    if (rushModeState && rushModeState.active) return;
    if (currentMode === 'review') return; // No timer in review mode
    
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
}

function stopTimer() {
    // Don't stop timer in rush mode (it has its own timer)
    if (rushModeState && rushModeState.active) return;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    if (!startTime) return;
    
    // Don't update timer display in rush mode or review mode
    if (rushModeState && rushModeState.active) return;
    if (currentMode === 'review') return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) {
        console.log('Game is over, cannot drag');
        return false;
    }
    if (isShowingSolution) {
        console.log('Solution is showing, cannot drag');
        return false;
    }
    
    const turn = game.turn();
    console.log(`Drag start: turn=${turn}, piece=${piece}, currentMoveIndex=${currentMoveIndex}`);
    
    if ((turn === 'w' && piece.search(/^b/) !== -1) ||
        (turn === 'b' && piece.search(/^w/) !== -1)) {
        console.log('Wrong color piece for current turn');
        return false;
    }
}

function onDrop(source, target) {
    // Clear any click-click selections when dragging
    clearHighlights();
    selectedSquare = null;
    
    // Check if this is a pawn promotion
    const piece = game.get(source);
    const targetRank = target[1];
    const isPromotion = piece && piece.type === 'p' && 
                       ((piece.color === 'w' && targetRank === '8') || 
                        (piece.color === 'b' && targetRank === '1'));
    
    if (isPromotion) {
        // Store the move details and show promotion dialog
        pendingPromotion = { source, target };
        showPromotionDialog();
        return;
    }
    
    // Normal move (non-promotion)
    const move = game.move({
        from: source,
        to: target
    });
    
    if (move === null) return 'snapback';
    
    const isCorrect = checkMove(move);
    addMoveToHistory(move.san, isCorrect);
    
    if (isCorrect) {
        currentMoveIndex++;
        
        // Check if there are more moves in the puzzle
        if (currentMoveIndex < puzzleMoves.length) {
            // Check if the next move is a computer move
            setTimeout(makeComputerMove, 250);
        } else {
            // All moves completed - puzzle solved!
            puzzleSolved();
        }
    }
}

function onSnapEnd() {
    board.position(game.fen());
}

function setupClickClickMoves() {
    // Use event delegation on the board container for better performance
    // and to handle dynamically updated board
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    
    // Remove any existing listener to avoid duplicates
    boardEl.removeEventListener('click', handleBoardClick);
    boardEl.addEventListener('click', handleBoardClick);
}

function handleBoardClick(e) {
    // Find the square element that was clicked
    const squareEl = e.target.closest('.square-55d63');
    if (!squareEl) return;
    
    handleSquareClick({ currentTarget: squareEl, target: e.target });
}

function handleSquareClick(e) {
    // Don't handle clicks if dragging is in progress
    if (e.target.classList.contains('dragging')) return;
    
    // Get the square that was clicked
    const clickedSquare = e.currentTarget.getAttribute('data-square');
    
    if (!clickedSquare) return;
    
    // Check if there's a piece on the clicked square
    const piece = game.get(clickedSquare);
    
    if (selectedSquare === null) {
        // First click - select a piece
        if (piece && piece.color === game.turn()) {
            // Select this square
            selectedSquare = clickedSquare;
            highlightSquare(clickedSquare);
            
            // Show legal moves for this piece
            showLegalMoves(clickedSquare);
        }
    } else {
        // Second click - try to move
        if (clickedSquare === selectedSquare) {
            // Clicking the same square - deselect
            clearHighlights();
            selectedSquare = null;
        } else if (piece && piece.color === game.turn()) {
            // Clicking another piece of the same color - select it instead
            clearHighlights();
            selectedSquare = clickedSquare;
            highlightSquare(clickedSquare);
            showLegalMoves(clickedSquare);
        } else {
            // Try to make the move
            const move = game.move({
                from: selectedSquare,
                to: clickedSquare,
                promotion: 'q' // Always promote to queen for simplicity
            });
            
            if (move) {
                // Valid move - update the board
                board.position(game.fen());
                
                // Check if this is a pawn promotion that needs user input
                const isPawnPromotion = move.flags.includes('p');
                if (isPawnPromotion && move.promotion === 'q') {
                    // For now, we auto-promoted to queen
                    // You could show a promotion dialog here if needed
                }
                
                // Process the move through the puzzle system
                const isCorrect = checkMove(move);
                addMoveToHistory(move.san, isCorrect);
                
                if (isCorrect) {
                    currentMoveIndex++;
                                
                    // Check if there are more moves in the puzzle
                    if (currentMoveIndex < puzzleMoves.length) {
                        // Check if the next move is a computer move
                                    setTimeout(makeComputerMove, 250);
                    } else {
                        // All moves completed - puzzle solved!
                                    puzzleSolved();
                    }
                }
            } else {
                // Invalid move - undo the move visually
                game.undo();
            }
            
            // Clear selection
            clearHighlights();
            selectedSquare = null;
        }
    }
}

function highlightSquare(square) {
    const squareEl = document.querySelector(`[data-square="${square}"]`);
    if (squareEl) {
        squareEl.classList.add('highlight-selected');
    }
}

function showLegalMoves(square) {
    // Get all legal moves for the piece on this square
    const moves = game.moves({ square: square, verbose: true });
    
    moves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquare) {
            targetSquare.classList.add('highlight-move');
        }
    });
}

function clearHighlights() {
    // Remove all highlight classes
    document.querySelectorAll('.highlight-selected').forEach(el => {
        el.classList.remove('highlight-selected');
    });
    document.querySelectorAll('.highlight-move').forEach(el => {
        el.classList.remove('highlight-move');
    });
}

function checkMove(move) {
    // Skip ".." placeholders and find the next actual move
    let expectedMove = puzzleMoves[currentMoveIndex];
    let checkIndex = currentMoveIndex;
    
    while (expectedMove === '..' && checkIndex < puzzleMoves.length) {
        checkIndex++;
        expectedMove = puzzleMoves[checkIndex];
    }
    
    if (!expectedMove || expectedMove === '..') {
        return false;
    }
    
    // First check if this move results in checkmate - if so, it's always correct
    if (game.in_checkmate()) {
        console.log('Move results in checkmate - accepting as correct solution');
        currentMoveIndex = checkIndex;
        return true;
    }
    
    // Check if puzzle uses UCI format
    if (currentPuzzle.isUCI) {
        // For UCI format, compare the from/to squares
        const uciMove = move.from + move.to + (move.promotion || '');
        if (uciMove === expectedMove) {
            currentMoveIndex = checkIndex;
            
            // Don't check for puzzle completion here - let onDrop handle it
            return true;
        }
    } else {
        // Original SAN format comparison
        const moveNotation = move.san.replace(/[+#]/g, '');
        const expectedNotation = expectedMove.replace(/[+#]/g, '');
        
        if (moveNotation === expectedNotation) {
            currentMoveIndex = checkIndex;
            
            // Don't check for puzzle completion here - let onDrop handle it
            return true;
        }
    }
    
    puzzleFailed();
    return false;
}

function makeComputerMove() {
    if (currentMoveIndex >= puzzleMoves.length) {
        // No more moves - puzzle is complete
        puzzleSolved();
        return;
    }
    
    // Skip ".." placeholders and find the next actual move
    let moveNotation = puzzleMoves[currentMoveIndex];
    
    while (moveNotation === '..' && currentMoveIndex < puzzleMoves.length) {
        currentMoveIndex++;
        moveNotation = puzzleMoves[currentMoveIndex];
    }
    
    if (!moveNotation || moveNotation === '..' || currentMoveIndex >= puzzleMoves.length) {
        // No valid move found - puzzle is complete
        puzzleSolved();
        return;
    }
    
    let move;
    if (currentPuzzle.isUCI) {
        // Convert UCI to move object
        const moveObj = uciToMove(moveNotation);
        if (moveObj) {
            move = game.move(moveObj);
        }
    } else {
        // Original SAN format
        move = game.move(moveNotation);
    }
    
    if (move) {
        board.position(game.fen());
        currentMoveIndex++;
        addMoveToHistory(move.san, true);
        
        // Check if puzzle is complete after computer's move
        if (currentMoveIndex >= puzzleMoves.length) {
            // No more moves - puzzle solved!
            puzzleSolved();
        }
        // If there are more moves, wait for player's next move
    }
}

function puzzleSolved() {
    stopTimer();
    
    // Handle rush mode separately
    if (rushModeState && rushModeState.active) {
        handleRushPuzzleSolved();
        return;
    }
    
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const hintsUsed = 3 - hintsRemaining;
    
    // Mode-specific handling
    switch(currentMode) {
        case 'practice':
            // Practice mode: Record attempt but no rating change
            trainingSystem.recordPuzzleAttempt(currentPuzzle.id, true, timeSpent, hintsUsed);
            showNotification('Puzzle solved! ✓', 'success');
            break;
            
        case 'rated':
            // Rated mode: Update rating and show change
            const result = trainingSystem.recordPuzzleAttempt(
                currentPuzzle.id, 
                true, 
                timeSpent, 
                hintsUsed
            );
            
            if (result) {
                showRatingChange(result.ratingChange);
                const currentRating = trainingSystem.userData.rating || 1200;
                showNotification(`Puzzle solved! Rating: ${currentRating} (${result.ratingChange >= 0 ? '+' : ''}${result.ratingChange})`, 'success');
            } else {
                showNotification('Puzzle solved!', 'success');
            }
            break;
            
            
        case 'review':
            // Review mode: Record attempt and remove from failed puzzles
            trainingSystem.recordPuzzleAttempt(currentPuzzle.id, true, timeSpent, hintsUsed);
            const idx = trainingSystem.failedPuzzles.indexOf(currentPuzzle.id);
            if (idx > -1) {
                trainingSystem.failedPuzzles.splice(idx, 1);
            }
            const remaining = trainingSystem.failedPuzzles.length;
            showNotification(`Puzzle mastered! ${remaining} left to review`, 'success');
            break;
            
        default:
            // Default case: Record attempt
            trainingSystem.recordPuzzleAttempt(currentPuzzle.id, true, timeSpent, hintsUsed);
            showNotification('Puzzle solved!', 'success');
    }
    
    // Save user data if logged in
    if (userAuth.isLoggedIn()) {
        // Pass both userData and current session data including achievements
        const dataToSave = {
            ...trainingSystem.userData,
            streakCount: trainingSystem.currentSession.streakCount,
            achievements: trainingSystem.userData.achievements || []
        };
        userAuth.updateUserData(dataToSave);
    }
    
    // Update UI to reflect any changes
    updateModeSpecificUI();
    
    updateUserStats();
    
    // Check achievements for all modes
    if (trainingSystem) {
        const achievements = [];
        
        // Check total puzzles solved achievement
        achievements.push(...trainingSystem.checkAchievement('total', trainingSystem.userData.totalPuzzlesSolved));
        
        // Check streak achievements
        achievements.push(...trainingSystem.checkAchievement('streak', trainingSystem.currentSession.streakCount));
        
        // Check speed achievements if puzzle was solved quickly
        if (timeSpent <= 10) {
            achievements.push(...trainingSystem.checkAchievement('speed', 10));
        }
        if (timeSpent <= 5) {
            achievements.push(...trainingSystem.checkAchievement('speed', 5));
        }
        
        // Check daily achievements
        const today = new Date().toDateString();
        const todaysPuzzles = trainingSystem.userData.puzzleHistory ? 
            trainingSystem.userData.puzzleHistory.filter(p => 
                new Date(p.timestamp).toDateString() === today && p.solved
            ).length : 0;
        achievements.push(...trainingSystem.checkAchievement('daily', todaysPuzzles));
        
        // Check rating achievements (mainly for rated mode)
        if (currentMode === 'rated') {
            achievements.push(...trainingSystem.checkAchievement('rating', trainingSystem.userData.rating));
        }
        
        // Show achievement notifications
        achievements.forEach(achievement => {
            setTimeout(() => {
                showNotification(`🏆 Achievement Unlocked: ${achievement.name}`, 'achievement');
            }, 1000);
        });
    }
    // Enable next button and disable other controls
    const nextBtn = document.getElementById('nextBtn');
    const hintBtn = document.getElementById('hintBtn');
    const solutionBtn = document.getElementById('solutionBtn');
    
    if (nextBtn) {
        nextBtn.disabled = false;
    }
    if (hintBtn) hintBtn.disabled = true;
    if (solutionBtn) solutionBtn.disabled = true;
}

function puzzleFailed() {
    // Handle rush mode
    if (rushModeState.active) {
        handleRushPuzzleFailed();
        return;
    }
    
    setTimeout(() => {
        game.undo();
        board.position(game.fen());
        showNotification('Incorrect move. Try again!', 'error');
    }, 1000);
}

function showHint() {
    if (hintsRemaining <= 0 || currentMoveIndex >= puzzleMoves.length) return;
    
    hintsRemaining--;
    document.getElementById('hintBtn').textContent = `💡 Hint (${hintsRemaining})`;
    
    if (hintsRemaining === 0) {
        document.getElementById('hintBtn').disabled = true;
    }
    
    const nextMove = puzzleMoves[currentMoveIndex];
    let move;
    
    if (currentPuzzle.isUCI) {
        // For UCI format, parse the move directly
        const moveObj = uciToMove(nextMove);
        if (moveObj) {
            move = new Chess(game.fen()).move(moveObj);
        }
    } else {
        move = new Chess(game.fen()).move(nextMove);
    }
    
    if (move) {
        const hintText = `Consider moving from ${move.from} to ${move.to}`;
        showNotification(hintText, 'hint');
        
        board.removeGreySquares();
        board.greySquare(move.from);
        board.greySquare(move.to);
        
        setTimeout(() => {
            board.removeGreySquares();
        }, 3000);
    }
}

function analyzePosition() {
    const fen = game.fen();
    const url = `https://lichess.org/analysis/${fen}`;
    window.open(url, '_blank');
}

function resetPuzzle() {
    game = new Chess(currentPuzzle.fen);
    board.position(currentPuzzle.fen);
    currentMoveIndex = 0;
    clearMoveHistory();
    startTime = Date.now();
}

function showSolution() {
    if (isShowingSolution) return;
    
    isShowingSolution = true;
    stopTimer();
    
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    trainingSystem.recordPuzzleAttempt(currentPuzzle.id, false, timeSpent, 3 - hintsRemaining);
    
    // Save user data if logged in
    if (userAuth.isLoggedIn()) {
        // Pass both userData and current session data including achievements
        const dataToSave = {
            ...trainingSystem.userData,
            streakCount: trainingSystem.currentSession.streakCount,
            achievements: trainingSystem.userData.achievements || []
        };
        userAuth.updateUserData(dataToSave);
    }
    
    updateUserStats();
    
    document.getElementById('solutionBtn').disabled = true;
    document.getElementById('hintBtn').disabled = true;
    
    game = new Chess(currentPuzzle.fen);
    board.position(currentPuzzle.fen);
    currentMoveIndex = 0;
    clearMoveHistory();
    
    function playNextMove() {
        if (currentMoveIndex >= puzzleMoves.length) {
            document.getElementById('nextBtn').disabled = false;
            return;
        }
        
        let moveNotation = puzzleMoves[currentMoveIndex];
        
        // Skip ".." placeholders
        while (moveNotation === '..' && currentMoveIndex < puzzleMoves.length) {
            currentMoveIndex++;
            moveNotation = puzzleMoves[currentMoveIndex];
        }
        
        if (!moveNotation || moveNotation === '..' || currentMoveIndex >= puzzleMoves.length) {
            document.getElementById('nextBtn').disabled = false;
            return;
        }
        
        let move;
        if (currentPuzzle.isUCI) {
            // Convert UCI to move object
            const moveObj = uciToMove(moveNotation);
            if (moveObj) {
                move = game.move(moveObj);
            }
        } else {
            move = game.move(moveNotation);
        }
        
        if (move) {
            board.position(game.fen());
            currentMoveIndex++;
            addMoveToHistory(move.san, true);
            setTimeout(playNextMove, 1000);
        } else {
            console.error('Failed to play move:', moveNotation, 'at position:', game.fen());
            console.error('Available moves:', game.moves());
            document.getElementById('nextBtn').disabled = false;
        }
    }
    
    setTimeout(playNextMove, 500);
}

function addMoveToHistory(san, isCorrect) {
    const moveList = document.getElementById('moveList');
    const moveNumber = Math.ceil((game.history().length) / 2);
    const isWhiteMove = game.history().length % 2 === 1;
    
    if (isWhiteMove) {
        const movePair = document.createElement('div');
        movePair.className = 'move-pair';
        movePair.innerHTML = `${moveNumber}. <span class="move ${isCorrect ? 'correct' : 'incorrect'}">${san}</span>`;
        moveList.appendChild(movePair);
    } else {
        const lastPair = moveList.lastElementChild;
        if (lastPair) {
            lastPair.innerHTML += ` <span class="move ${isCorrect ? 'correct' : 'incorrect'}">${san}</span>`;
        }
    }
}

function clearMoveHistory() {
    document.getElementById('moveList').innerHTML = '';
}

function showRatingChange(change) {
    const element = document.getElementById('ratingChange');
    element.textContent = change > 0 ? `+${change}` : `${change}`;
    element.className = change > 0 ? 'rating-change positive show' : 'rating-change negative show';
    
    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

function showAnalytics() {
    const modal = document.getElementById('analyticsModal');
    const content = document.getElementById('analyticsContent');
    
    // Set up tab switching
    const tabs = document.querySelectorAll('.analytics-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            loadAnalyticsView(e.target.dataset.view);
        });
    });
    
    // Load initial view
    loadAnalyticsView('overview');
    modal.style.display = 'block';
}

function loadAnalyticsView(view) {
    const content = document.getElementById('analyticsContent');
    const stats = trainingSystem.getStatistics();
    
    switch(view) {
        case 'overview':
            showAnalyticsOverview(content, stats);
            break;
        case 'progress':
            showAnalyticsProgress(content, stats);
            break;
        case 'patterns':
            showAnalyticsPatterns(content, stats);
            break;
        case 'history':
            showAnalyticsHistory(content, stats);
            break;
    }
}

function showAnalyticsOverview(content, stats) {
    const avgTime = stats.totalSolved > 0 ? 
        Math.round(stats.sessionStats.totalTime / stats.totalSolved) : 0;
    
    const winRate = stats.totalSolved + stats.totalFailed > 0 ?
        Math.round((stats.totalSolved / (stats.totalSolved + stats.totalFailed)) * 100) : 0;
    
    content.innerHTML = `
        <div class="analytics-grid">
            <div class="analytics-card">
                <div class="analytics-card-title">Current Rating</div>
                <div class="analytics-card-value">${stats.rating}</div>
                <div class="analytics-card-change ${stats.rating >= 1200 ? 'positive' : 'negative'}">
                    ${stats.rating >= 1200 ? '↑' : '↓'} ${Math.abs(stats.rating - 1200)}
                </div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-title">Win Rate</div>
                <div class="analytics-card-value">${winRate}%</div>
                <div class="analytics-card-change">${stats.totalSolved}W / ${stats.totalFailed}L</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-title">Average Time</div>
                <div class="analytics-card-value">${formatTime(avgTime)}</div>
                <div class="analytics-card-change">per puzzle</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-title">Best Streak</div>
                <div class="analytics-card-value">${stats.streakRecord}</div>
                <div class="analytics-card-change">Current: ${stats.currentStreak}</div>
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">Last 7 Days Performance</div>
            <div class="mini-chart">
                ${generateMiniChart(stats)}
            </div>
        </div>
    `;
}

function showAnalyticsProgress(content, stats) {
    const milestones = [
        { name: 'Novice', rating: 1000, puzzles: 10 },
        { name: 'Beginner', rating: 1200, puzzles: 50 },
        { name: 'Intermediate', rating: 1400, puzzles: 100 },
        { name: 'Advanced', rating: 1600, puzzles: 250 },
        { name: 'Expert', rating: 1800, puzzles: 500 },
        { name: 'Master', rating: 2000, puzzles: 1000 }
    ];
    
    let currentMilestone = milestones[0];
    let nextMilestone = milestones[1];
    
    for (let i = 0; i < milestones.length - 1; i++) {
        if (stats.rating >= milestones[i].rating) {
            currentMilestone = milestones[i];
            nextMilestone = milestones[i + 1];
        }
    }
    
    const ratingProgress = ((stats.rating - currentMilestone.rating) / 
                          (nextMilestone.rating - currentMilestone.rating)) * 100;
    
    content.innerHTML = `
        <div class="analytics-grid">
            <div class="analytics-card">
                <div class="analytics-card-title">Current Level</div>
                <div class="analytics-card-value">${currentMilestone.name}</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-title">Next Level</div>
                <div class="analytics-card-value">${nextMilestone.name}</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-title">Progress</div>
                <div class="analytics-card-value">${Math.round(ratingProgress)}%</div>
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">Rating Progress to ${nextMilestone.name}</div>
            <div style="background: #f0f0f0; border-radius: 8px; height: 30px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #667eea, #764ba2); 
                           height: 100%; width: ${ratingProgress}%; transition: width 0.5s;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.9em;">
                <span>${currentMilestone.rating} (${currentMilestone.name})</span>
                <span>${stats.rating}</span>
                <span>${nextMilestone.rating} (${nextMilestone.name})</span>
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">Category Mastery</div>
            ${stats.categoryStats.map(cat => `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>${cat.name}</span>
                        <span>${cat.successRate}%</span>
                    </div>
                    <div style="background: #f0f0f0; border-radius: 4px; height: 20px; overflow: hidden;">
                        <div style="background: #4CAF50; height: 100%; width: ${cat.successRate}%;"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAnalyticsPatterns(content, stats) {
    // Analyze patterns and weaknesses
    const patterns = {};
    
    if (trainingSystem.puzzleHistory) {
        trainingSystem.puzzleHistory.forEach(attempt => {
            const puzzle = puzzleDatabase.find(p => p.id === attempt.puzzleId);
            if (puzzle && puzzle.theme) {
                puzzle.theme.forEach(theme => {
                    if (!patterns[theme]) {
                        patterns[theme] = { attempts: 0, solved: 0 };
                    }
                    patterns[theme].attempts++;
                    if (attempt.solved) patterns[theme].solved++;
                });
            }
        });
    }
    
    const patternList = Object.entries(patterns).map(([theme, data]) => ({
        theme,
        successRate: data.attempts > 0 ? Math.round((data.solved / data.attempts) * 100) : 0,
        ...data
    })).sort((a, b) => b.attempts - a.attempts);
    
    content.innerHTML = `
        <div class="chart-container">
            <div class="chart-title">Pattern Recognition Success Rate</div>
            <ul class="pattern-list">
                ${patternList.map(pattern => `
                    <li class="pattern-item">
                        <span class="pattern-name">${themes[pattern.theme] || pattern.theme}</span>
                        <div class="pattern-stats">
                            <span class="pattern-success">${pattern.successRate}%</span>
                            <span class="pattern-attempts">${pattern.solved}/${pattern.attempts}</span>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card">
                <div class="analytics-card-title">Strongest Pattern</div>
                <div class="analytics-card-value">
                    ${patternList.length > 0 ? 
                      (themes[patternList[0].theme] || patternList[0].theme) : 'N/A'}
                </div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-title">Needs Work</div>
                <div class="analytics-card-value">
                    ${patternList.length > 0 ? 
                      (themes[patternList[patternList.length - 1].theme] || 
                       patternList[patternList.length - 1].theme) : 'N/A'}
                </div>
            </div>
        </div>
    `;
}

function showAnalyticsHistory(content, stats) {
    const recentHistory = trainingSystem.puzzleHistory.slice(-20).reverse();
    
    content.innerHTML = `
        <div class="chart-container">
            <div class="chart-title">Recent Puzzle History</div>
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Puzzle</th>
                        <th>Result</th>
                        <th>Time</th>
                        <th>Hints</th>
                        <th>Rating Change</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentHistory.map(attempt => {
                        const puzzle = puzzleDatabase.find(p => p.id === attempt.puzzleId);
                        return `
                            <tr>
                                <td>#${attempt.puzzleId}</td>
                                <td>
                                    <span class="history-result ${attempt.solved ? 'solved' : 'failed'}">
                                        ${attempt.solved ? 'Solved' : 'Failed'}
                                    </span>
                                </td>
                                <td>${formatTime(attempt.timeSpent)}</td>
                                <td>${attempt.hintsUsed}</td>
                                <td class="${attempt.ratingChange >= 0 ? 'positive' : 'negative'}">
                                    ${attempt.ratingChange >= 0 ? '+' : ''}${attempt.ratingChange || 0}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function generateMiniChart(stats) {
    // Generate simple bar chart for last 7 days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [3, 5, 2, 8, 6, 4, 7]; // Mock data - would be real in production
    
    const maxValue = Math.max(...data);
    
    return data.map((value, index) => `
        <div class="chart-bar" style="height: ${(value / maxValue) * 100}%;">
            <span class="chart-bar-label">${days[index]}</span>
        </div>
    `).join('');
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function showStatistics() {
    const stats = trainingSystem.getStatistics();
    const modal = document.getElementById('statsModal');
    const content = document.getElementById('statsContent');
    
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-value">${stats.rating}</div>
                <div class="stat-card-label">Rating</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-value">${stats.totalSolved}</div>
                <div class="stat-card-label">Solved</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-value">${stats.successRate}%</div>
                <div class="stat-card-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-value">${stats.streakRecord}</div>
                <div class="stat-card-label">Best Streak</div>
            </div>
        </div>
        
        <div class="category-stats">
            <h3>Category Progress</h3>
            ${stats.categoryStats.map(cat => `
                <div class="category-stat-item">
                    <span class="category-stat-name">${cat.name}</span>
                    <div class="category-stat-progress">
                        <span>${cat.solved}/${cat.attempted}</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${cat.successRate}%"></div>
                        </div>
                        <span>${cat.successRate}%</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.style.display = 'block';
}

function showAchievements() {
    const modal = document.getElementById('achievementsModal');
    const content = document.getElementById('achievementsContent');
    
    const allAchievements = [
        // Streak Achievements
        { id: 'streak_5', icon: '🔥', name: 'Hot Streak', desc: 'Solve 5 puzzles in a row' },
        { id: 'streak_10', icon: '🔥', name: 'On Fire', desc: 'Solve 10 puzzles in a row' },
        { id: 'streak_20', icon: '🔥', name: 'Unstoppable', desc: 'Solve 20 puzzles in a row' },
        { id: 'streak_50', icon: '💎', name: 'Legendary Streak', desc: 'Solve 50 puzzles in a row' },
        { id: 'streak_100', icon: '⚡', name: 'Perfect Storm', desc: 'Solve 100 puzzles in a row' },
        { id: 'streak_200', icon: '🌟', name: 'Untouchable', desc: 'Solve 200 puzzles in a row' },
        
        // Total Achievements
        { id: 'total_10', icon: '🎯', name: 'Beginner', desc: 'Solve 10 puzzles' },
        { id: 'total_50', icon: '🎯', name: 'Enthusiast', desc: 'Solve 50 puzzles' },
        { id: 'total_100', icon: '🎯', name: 'Dedicated', desc: 'Solve 100 puzzles' },
        { id: 'total_250', icon: '👑', name: 'Puzzle Master', desc: 'Solve 250 puzzles' },
        { id: 'total_500', icon: '👑', name: 'Grandmaster', desc: 'Solve 500 puzzles' },
        { id: 'total_1000', icon: '🏆', name: 'Chess Legend', desc: 'Solve 1000 puzzles' },
        { id: 'total_2500', icon: '🌟', name: 'Tactical Genius', desc: 'Solve 2500 puzzles' },
        { id: 'total_5000', icon: '💎', name: 'Puzzle Addict', desc: 'Solve 5000 puzzles' },
        { id: 'total_10000', icon: '⚡', name: 'Chess Immortal', desc: 'Solve 10000 puzzles' },
        
        // Rating Achievements
        { id: 'rating_1400', icon: '⭐', name: 'Rising Star', desc: 'Reach 1400 rating' },
        { id: 'rating_1600', icon: '⭐', name: 'Strong Player', desc: 'Reach 1600 rating' },
        { id: 'rating_1800', icon: '⭐', name: 'Expert', desc: 'Reach 1800 rating' },
        { id: 'rating_2000', icon: '🌟', name: 'Master', desc: 'Reach 2000 rating' },
        { id: 'rating_2200', icon: '💫', name: 'Elite', desc: 'Reach 2200 rating' },
        
        // Speed Achievements
        { id: 'speed_10', icon: '⚡', name: 'Quick Thinker', desc: 'Solve in under 10 seconds' },
        { id: 'speed_5', icon: '⚡', name: 'Lightning Fast', desc: 'Solve in under 5 seconds' },
        
        // Daily Achievements
        { id: 'daily_10', icon: '📅', name: 'Daily Champion', desc: 'Solve 10 puzzles in one day' },
        { id: 'daily_25', icon: '📅', name: 'Marathon Runner', desc: 'Solve 25 puzzles in one day' },
        { id: 'daily_50', icon: '📅', name: 'Puzzle Addict', desc: 'Solve 50 puzzles in one day' },
        
        // Rush Mode Achievements
        { id: 'rush_10', icon: '🏃', name: 'Rush Rookie', desc: 'Solve 10 in rush mode' },
        { id: 'rush_20', icon: '🏃', name: 'Rush Expert', desc: 'Solve 20 in rush mode' },
        { id: 'rush_30', icon: '🥇', name: 'Rush Master', desc: 'Solve 30 in rush mode' }
    ];
    
    const earnedAchievements = new Set(trainingSystem.userData.achievements);
    
    content.innerHTML = `
        <div class="achievement-grid">
            ${allAchievements.map(a => `
                <div class="achievement-card ${earnedAchievements.has(a.id) ? 'earned' : ''}">
                    <div class="achievement-icon">${a.icon}</div>
                    <div class="achievement-name">${a.name}</div>
                    <div class="achievement-desc">${a.desc}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.style.display = 'block';
}

function showLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const content = document.getElementById('leaderboardContent');
    
    // Set up tab switching
    const tabs = document.querySelectorAll('.leaderboard-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            // Load leaderboard for selected timeframe
            await loadLeaderboard(e.target.dataset.timeframe);
        });
    });
    
    // Load initial leaderboard
    loadLeaderboard('all');
    modal.style.display = 'block';
}

async function loadLeaderboard(timeframe = 'all') {
    const content = document.getElementById('leaderboardContent');
    content.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';
    
    try {
        // Fetch leaderboard data
        const response = await fetch(`/api/leaderboard?timeframe=${timeframe}&limit=20`);
        const data = await response.json();
        
        if (!data.success || !data.leaderboard) {
            content.innerHTML = '<div style="text-align: center; padding: 20px;">No data available</div>';
            return;
        }
        
        // Get current user rank if logged in
        let userRank = null;
        if (userAuth && userAuth.isLoggedIn()) {
            const user = userAuth.getCurrentUser();
            const rankResponse = await fetch(`/api/user/${user.id}/rank`);
            const rankData = await rankResponse.json();
            userRank = rankData.rank;
        }
        
        // Build leaderboard HTML
        let html = '';
        
        // Show user's rank if logged in
        if (userRank && userAuth.isLoggedIn()) {
            const user = userAuth.getCurrentUser();
            html += `
                <div class="user-rank-display">
                    <h3>Your Rank</h3>
                    <div class="user-rank-number">#${userRank}</div>
                </div>
            `;
        }
        
        // Create leaderboard table
        html += `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th style="width: 60px;">Rank</th>
                        <th>Player</th>
                        <th>Rating</th>
                        <th>Solved</th>
                        ${timeframe === 'all' ? '<th>Best Streak</th>' : ''}
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.leaderboard.forEach((player, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';
            
            const isCurrentUser = userAuth && userAuth.isLoggedIn() && 
                                  player.username === userAuth.getCurrentUser().username;
            
            html += `
                <tr ${isCurrentUser ? 'style="background: #f0f0ff;"' : ''}>
                    <td>
                        <span class="rank-number ${rankClass}">${rank}</span>
                    </td>
                    <td>
                        <span class="leaderboard-username ${isCurrentUser ? 'current-user' : ''}">
                            ${player.username}
                        </span>
                    </td>
                    <td>
                        <span class="leaderboard-rating">${player.rating || '-'}</span>
                    </td>
                    <td>${player.total_puzzles_solved || player.solved_today || 0}</td>
                    ${timeframe === 'all' ? `<td>${player.streak_record || 0}</td>` : ''}
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        if (data.leaderboard.length === 0) {
            html = '<div style="text-align: center; padding: 40px; color: #666;">No players found for this timeframe</div>';
        }
        
        content.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        content.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44336;">Failed to load leaderboard</div>';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Rush mode state is now defined in rushMode.js

// Old rush mode functions removed - now using rushMode.js

/*
function showRushScreen(screen) {
    document.querySelector('.rush-start-screen').style.display = screen === 'start' ? 'block' : 'none';
    document.querySelector('.rush-game-screen').style.display = screen === 'game' ? 'block' : 'none';
    document.querySelector('.rush-results-screen').style.display = screen === 'results' ? 'block' : 'none';
}

function startRushMode(mode) {
    rushMode.mode = mode;
    rushMode.active = true;
    rushMode.score = 0;
    rushMode.attempts = 0;
    rushMode.startTime = Date.now();
    
    // Set time limit based on mode
    if (mode === '3min') {
        rushMode.timeLimit = 180; // 3 minutes in seconds
    } else if (mode === '5min') {
        rushMode.timeLimit = 300; // 5 minutes
    } else {
        rushMode.timeLimit = null; // Survival mode - no time limit
    }
    
    // Initialize rush board
    if (!rushMode.board) {
        rushMode.board = Chessboard('rushBoard', {
            draggable: true,
            position: 'start',
            onDragStart: rushOnDragStart,
            onDrop: rushOnDrop,
            onSnapEnd: rushOnSnapEnd,
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        });
    }
    
    showRushScreen('game');
    loadRushPuzzle();
    
    // Start timer if timed mode
    if (rushMode.timeLimit) {
        startRushTimer();
    }
}

function startRushTimer() {
    updateRushTimer();
    rushMode.timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - rushMode.startTime) / 1000);
        const remaining = rushMode.timeLimit - elapsed;
        
        if (remaining <= 0) {
            endRushMode();
        } else {
            updateRushTimer();
        }
    }, 100);
}

function updateRushTimer() {
    if (!rushMode.timeLimit) return;
    
    const elapsed = Math.floor((Date.now() - rushMode.startTime) / 1000);
    const remaining = Math.max(0, rushMode.timeLimit - elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    
    document.getElementById('rushTimer').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function loadRushPuzzle() {
    // Get random puzzle
    const availablePuzzles = filteredPuzzles.length > 0 ? filteredPuzzles : puzzleDatabase;
    rushMode.currentPuzzle = availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)];
    
    rushMode.game = new Chess(rushMode.currentPuzzle.fen);
    rushMode.board.position(rushMode.currentPuzzle.fen);
    rushMode.puzzleMoves = rushMode.currentPuzzle.moves;
    rushMode.currentMoveIndex = 0;
    
    // Orient board based on who moves
    rushMode.board.orientation(rushMode.game.turn() === 'w' ? 'white' : 'black');
}

function rushOnDragStart(source, piece, position, orientation) {
    if (!rushMode.active) return false;
    if (rushMode.game.game_over()) return false;
    
    if ((rushMode.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (rushMode.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function rushOnDrop(source, target) {
    const move = rushMode.game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen in rush mode for speed
    });
    
    if (move === null) return 'snapback';
    
    const isCorrect = checkRushMove(move);
    
    if (isCorrect) {
        rushMode.currentMoveIndex++;
        
        if (rushMode.currentMoveIndex < rushMode.puzzleMoves.length) {
            setTimeout(makeRushComputerMove, 100); // Faster moves in rush mode
        } else {
            // Puzzle solved!
            rushMode.score++;
            document.getElementById('rushScore').textContent = rushMode.score;
            setTimeout(loadRushPuzzle, 500); // Quick transition to next puzzle
        }
    } else {
        // Wrong move in rush mode
        rushMode.attempts++;
        
        if (rushMode.mode === 'survival') {
            // End on first mistake in survival mode
            endRushMode();
        } else {
            // In timed modes, just load next puzzle
            setTimeout(loadRushPuzzle, 500);
        }
    }
}

function rushOnSnapEnd() {
    rushMode.board.position(rushMode.game.fen());
}

function checkRushMove(move) {
    let expectedMove = rushMode.puzzleMoves[rushMode.currentMoveIndex];
    let checkIndex = rushMode.currentMoveIndex;
    
    // Skip ".." placeholders
    while (expectedMove === '..' && checkIndex < rushMode.puzzleMoves.length) {
        checkIndex++;
        expectedMove = rushMode.puzzleMoves[checkIndex];
    }
    
    if (!expectedMove || expectedMove === '..') return false;
    
    // First check if this move results in checkmate - if so, it's always correct
    if (rushMode.game && rushMode.game.in_checkmate()) {
        console.log('Rush mode: Move results in checkmate - accepting as correct solution');
        rushMode.currentMoveIndex = checkIndex;
        return true;
    }
    
    const moveNotation = move.san.replace(/[+#]/g, '');
    const expectedNotation = expectedMove.replace(/[+#]/g, '');
    
    rushMode.currentMoveIndex = checkIndex;
    return moveNotation === expectedNotation;
}

function makeRushComputerMove() {
    if (rushMode.currentMoveIndex >= rushMode.puzzleMoves.length) return;
    
    let moveNotation = rushMode.puzzleMoves[rushMode.currentMoveIndex];
    
    while (moveNotation === '..' && rushMode.currentMoveIndex < rushMode.puzzleMoves.length) {
        rushMode.currentMoveIndex++;
        moveNotation = rushMode.puzzleMoves[rushMode.currentMoveIndex];
    }
    
    if (!moveNotation || moveNotation === '..') return;
    
    const move = rushMode.game.move(moveNotation);
    
    if (move) {
        rushMode.board.position(rushMode.game.fen());
        rushMode.currentMoveIndex++;
    }
}

function endRushMode() {
    rushMode.active = false;
    
    if (rushMode.timer) {
        clearInterval(rushMode.timer);
        rushMode.timer = null;
    }
    
    // Calculate stats
    const totalTime = Math.floor((Date.now() - rushMode.startTime) / 1000);
    const accuracy = rushMode.score + rushMode.attempts > 0 ? 
        Math.round((rushMode.score / (rushMode.score + rushMode.attempts)) * 100) : 0;
    const avgTime = rushMode.score > 0 ? Math.round(totalTime / rushMode.score) : 0;
    
    // Display results
    document.getElementById('rushFinalScore').textContent = rushMode.score;
    document.getElementById('rushAccuracy').textContent = accuracy + '%';
    document.getElementById('rushAvgTime').textContent = avgTime + 's';
    
    showRushScreen('results');
    
    // Record achievement if applicable
    if (rushMode.score >= 10) {
        showNotification(`Amazing rush! ${rushMode.score} puzzles solved!`, 'achievement');
    }
}

function resetRushMode() {
    rushMode = {
        active: false,
        mode: null,
        score: 0,
        attempts: 0,
        startTime: null,
        timeLimit: null,
        timer: null,
        board: rushMode.board, // Keep board instance
        game: null,
        currentPuzzle: null,
        puzzleMoves: [],
        currentMoveIndex: 0
    };
    
    document.getElementById('rushScore').textContent = '0';
    document.getElementById('rushTimer').textContent = '0:00';
}

document.addEventListener('DOMContentLoaded', initializeTraining);

// Success notification
function showSuccessNotification() {
    const notification = document.getElementById('successNotification');
    const message = document.getElementById('successMessage');
    
    // Update message based on puzzle type
    if (currentPuzzle.description && currentPuzzle.description.includes('Mate in 2')) {
        message.textContent = 'Checkmate! ♔';
    } else {
        message.textContent = 'Puzzle solved!';
    }
    
    // Show notification
    notification.style.display = 'flex';
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.style.display = 'none';
            notification.classList.remove('show', 'hide');
        }, 300);
    }, 2000);
}

// Promotion dialog functions
function showPromotionDialog() {
    const overlay = document.getElementById('promotionOverlay');
    overlay.style.display = 'flex';
    
    // Add click handlers for promotion pieces
    const pieces = document.querySelectorAll('.promotion-piece');
    pieces.forEach(piece => {
        piece.onclick = () => handlePromotion(piece.dataset.piece);
    });
}

function handlePromotion(promotionPiece) {
    const overlay = document.getElementById('promotionOverlay');
    overlay.style.display = 'none';
    
    if (!pendingPromotion) return;
    
    // Make the promotion move
    const move = game.move({
        from: pendingPromotion.source,
        to: pendingPromotion.target,
        promotion: promotionPiece
    });
    
    if (move === null) {
        // Invalid move, reset board
        board.position(game.fen());
        pendingPromotion = null;
        return;
    }
    
    // Update board position
    board.position(game.fen());
    
    const isCorrect = checkMove(move);
    addMoveToHistory(move.san, isCorrect);
    
    if (isCorrect) {
        currentMoveIndex++;
        
        if (currentMoveIndex < puzzleMoves.length) {
            setTimeout(makeComputerMove, 250);
        }
    }
    
    pendingPromotion = null;
}
*/

// Initialize the app when DOM is ready
$(document).ready(function() {
    initializeTraining();
});