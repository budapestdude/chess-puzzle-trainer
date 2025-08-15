// Rush Mode functionality for Chess Puzzle Trainer

const rushModeState = {
    active: false,
    mode: null, // '3min', '5min', or 'survival'
    score: 0,
    attempts: 0,
    startTime: null,
    timeLimit: null,
    timer: null,
    puzzleStartTime: null
};

function initRushMode() {
    // Add event listeners for rush type buttons
    document.querySelectorAll('.rush-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.rush-type-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            startRushMode(e.target.dataset.rush);
        });
    });
}

function startRushMode(mode) {
    // If already in a rush mode, stop the current one first
    if (rushModeState.active) {
        if (rushModeState.timer) {
            clearInterval(rushModeState.timer);
            rushModeState.timer = null;
        }
    }
    
    rushModeState.mode = mode;
    rushModeState.active = true;
    rushModeState.score = 0;
    rushModeState.attempts = 0;
    rushModeState.startTime = Date.now();
    
    // Ensure the global mode is set to rush
    if (window.currentMode) {
        window.currentMode = 'rush';
    }
    
    // Update mode-specific UI
    if (typeof updateModeSpecificUI === 'function') {
        updateModeSpecificUI();
    }
    
    // Set time limit based on mode
    if (mode === '3min') {
        rushModeState.timeLimit = 180; // 3 minutes in seconds
    } else if (mode === '5min') {
        rushModeState.timeLimit = 300; // 5 minutes
    } else {
        rushModeState.timeLimit = null; // Survival mode - no time limit
    }
    
    console.log('Starting rush mode:', mode, 'Time limit:', rushModeState.timeLimit);
    
    // Reset score display
    document.getElementById('rushScore').textContent = '0';
    
    // Show rush info, hide rating change
    document.getElementById('rushInfo').style.display = 'block';
    document.getElementById('ratingChange').style.display = 'none';
    
    // Start rush timer
    if (rushModeState.timer) {
        clearInterval(rushModeState.timer);
    }
    
    rushModeState.timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - rushModeState.startTime) / 1000);
        
        if (rushModeState.timeLimit) {
            const remaining = rushModeState.timeLimit - elapsed;
            if (remaining <= 0) {
                endRushMode();
                return;
            }
            // Display countdown timer
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            const timerElement = document.getElementById('timer');
            if (timerElement) {
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                // Add warning color when time is running out
                if (remaining <= 30) {
                    timerElement.style.color = '#e74c3c';
                } else if (remaining <= 60) {
                    timerElement.style.color = '#f39c12';
                } else {
                    timerElement.style.color = '#e74c3c'; // Keep red for rush mode
                }
            }
        } else {
            // Survival mode - count up
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timerElement = document.getElementById('timer');
            if (timerElement) {
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                timerElement.style.color = '#10b981'; // Green for survival
            }
        }
    }, 1000);
    
    // Load first puzzle
    rushModeState.puzzleStartTime = Date.now();
    loadNextPuzzle();
}

function stopRushMode() {
    if (rushModeState.timer) {
        clearInterval(rushModeState.timer);
        rushModeState.timer = null;
    }
    rushModeState.active = false;
    
    // Reset timer color and display
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.style.color = '';
        timerElement.textContent = '00:00';
    }
    
    // Hide rush info
    const rushInfo = document.getElementById('rushInfo');
    if (rushInfo) {
        rushInfo.style.display = 'none';
    }
    
    // Reset to practice mode
    if (window.currentMode) {
        window.currentMode = 'practice';
    }
    
    // Update UI for the new mode
    if (typeof updateModeSpecificUI === 'function') {
        updateModeSpecificUI();
    }
}

function endRushMode() {
    const wasActive = rushModeState.active;
    stopRushMode();
    
    if (!wasActive) return;
    
    const elapsed = Math.floor((Date.now() - rushModeState.startTime) / 1000);
    const accuracy = rushModeState.attempts > 0 ? Math.round((rushModeState.score / rushModeState.attempts) * 100) : 0;
    const avgTime = rushModeState.score > 0 ? Math.round(elapsed / rushModeState.score) : 0;
    
    // Check rush achievements
    trainingSystem.checkAchievement('rush', rushModeState.score);
    
    // Show results popup (smaller, centered)
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #0a0e27 0%, #1e1b4b 100%);
        border: 2px solid rgba(0, 212, 255, 0.3);
        border-radius: 20px;
        padding: 30px;
        z-index: 10000;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 100px rgba(0, 212, 255, 0.2);
        backdrop-filter: blur(10px);
        width: 400px;
        max-width: 90vw;
        animation: popupSlideIn 0.3s ease;
    `;
    
    popup.innerHTML = `
        <style>
            @keyframes popupSlideIn {
                from { opacity: 0; transform: translate(-50%, -40%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
        </style>
        <div style="position: relative;">
            <button onclick="this.parentElement.parentElement.remove(); document.querySelector('.rush-backdrop').remove(); document.querySelector('[data-mode=practice]').click();" 
                    style="position: absolute; top: -10px; right: -10px; background: rgba(255,255,255,0.1); 
                           border: 1px solid rgba(255,255,255,0.2); color: white; width: 30px; height: 30px; 
                           border-radius: 50%; cursor: pointer; font-size: 18px;">&times;</button>
            
            <h2 style="text-align: center; color: #00d4ff; margin: 0 0 25px 0; font-size: 24px;">
                🏁 Rush Mode Results
            </h2>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="text-align: center; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: #00d4ff; margin-bottom: 5px;">${rushModeState.score}</div>
                    <div style="color: rgba(255,255,255,0.6); font-size: 12px; text-transform: uppercase;">Puzzles Solved</div>
                </div>
                <div style="text-align: center; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: #10b981; margin-bottom: 5px;">${accuracy}%</div>
                    <div style="color: rgba(255,255,255,0.6); font-size: 12px; text-transform: uppercase;">Accuracy</div>
                </div>
                <div style="text-align: center; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: #f59e0b; margin-bottom: 5px;">${avgTime}s</div>
                    <div style="color: rgba(255,255,255,0.6); font-size: 12px; text-transform: uppercase;">Avg Time</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="this.parentElement.parentElement.remove(); document.querySelector('.rush-backdrop').remove(); document.querySelector('[data-mode=rush]').click();" 
                        style="flex: 1; padding: 12px; background: linear-gradient(135deg, #00d4ff, #06b6d4); 
                               color: #0a0e27; border: none; border-radius: 8px; cursor: pointer; 
                               font-weight: 600; transition: transform 0.2s;">
                    Play Again
                </button>
                <button onclick="this.parentElement.parentElement.remove(); document.querySelector('.rush-backdrop').remove(); document.querySelector('[data-mode=practice]').click();" 
                        style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); 
                               color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; 
                               cursor: pointer; font-weight: 600; transition: transform 0.2s;">
                    Exit Rush Mode
                </button>
            </div>
        </div>
    `;
    
    // Add semi-transparent backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'rush-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(3px);
        z-index: 9999;
    `;
    backdrop.onclick = function() {
        popup.remove();
        backdrop.remove();
        document.querySelector('[data-mode=practice]').click();
    };
    
    document.body.appendChild(backdrop);
    document.body.appendChild(popup);
}

function handleRushPuzzleSolved() {
    rushModeState.score++;
    rushModeState.attempts++;
    document.getElementById('rushScore').textContent = rushModeState.score;
    
    // Quick feedback (shorter message)
    showNotification(`✓ +1`, 'success');
    
    // Track puzzle time
    const puzzleTime = (Date.now() - rushModeState.puzzleStartTime) / 1000;
    
    // Check rush achievements
    if (typeof trainingSystem !== 'undefined') {
        trainingSystem.checkAchievement('rush', rushModeState.score);
    }
    
    // Load next puzzle immediately
    rushModeState.puzzleStartTime = Date.now();
    loadNextPuzzle();
}

function handleRushPuzzleFailed() {
    rushModeState.attempts++;
    
    if (rushModeState.mode === 'survival') {
        // End survival mode on first failure
        showNotification('✗ Game Over!', 'error');
        setTimeout(() => endRushMode(), 500);
    } else {
        // In timed modes, just skip to next puzzle immediately
        showNotification('✗', 'error');
        rushModeState.puzzleStartTime = Date.now();
        loadNextPuzzle();
    }
}

// Export functions for use in main app
window.rushModeState = rushModeState;
window.initRushMode = initRushMode;
window.startRushMode = startRushMode;
window.stopRushMode = stopRushMode;
window.endRushMode = endRushMode;
window.handleRushPuzzleSolved = handleRushPuzzleSolved;
window.handleRushPuzzleFailed = handleRushPuzzleFailed;