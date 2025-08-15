// Learning Mode System for Chess Puzzle Trainer
class LearningMode {
    constructor() {
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.currentHints = [];
        this.explanationMode = false;
        this.patternLibrary = this.initializePatternLibrary();
        this.loadSettings();
    }

    loadSettings() {
        const settings = localStorage.getItem('learningModeSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.explanationMode = parsed.explanationMode || false;
            this.showPatternHints = parsed.showPatternHints !== false;
            this.autoAnalyze = parsed.autoAnalyze || false;
        }
    }

    saveSettings() {
        localStorage.setItem('learningModeSettings', JSON.stringify({
            explanationMode: this.explanationMode,
            showPatternHints: this.showPatternHints,
            autoAnalyze: this.autoAnalyze
        }));
    }

    initializePatternLibrary() {
        return {
            fork: {
                name: 'Fork',
                description: 'A single piece attacks two or more enemy pieces simultaneously',
                hints: [
                    'Look for pieces that can attack multiple targets',
                    'Knights are especially good at creating forks',
                    'Check if you can attack the king and another piece'
                ],
                indicators: ['knight moves', 'double attack', 'royal fork']
            },
            pin: {
                name: 'Pin',
                description: 'An attack on a piece that cannot move without exposing a more valuable piece',
                hints: [
                    'Look for pieces lined up with the king or queen',
                    'Bishops and rooks are excellent pinning pieces',
                    'The pinned piece cannot move without losing material'
                ],
                indicators: ['linear attack', 'immobilized piece', 'x-ray']
            },
            skewer: {
                name: 'Skewer',
                description: 'Forcing a valuable piece to move and expose a less valuable piece behind it',
                hints: [
                    'Similar to a pin but in reverse',
                    'Force the more valuable piece to move first',
                    'Look for lined up pieces with the valuable one in front'
                ],
                indicators: ['linear attack', 'forced move', 'reverse pin']
            },
            discoveredAttack: {
                name: 'Discovered Attack',
                description: 'Moving one piece to reveal an attack from another piece',
                hints: [
                    'Look for your pieces blocking other pieces',
                    'The moving piece can also create a threat',
                    'Double attacks are possible with discoveries'
                ],
                indicators: ['hidden attacker', 'double threat', 'unveiling']
            },
            sacrifice: {
                name: 'Sacrifice',
                description: 'Giving up material for a tactical or positional advantage',
                hints: [
                    'Calculate forcing moves after the sacrifice',
                    'Look for weaknesses in the king\'s position',
                    'Sometimes you get the material back with interest'
                ],
                indicators: ['material loss', 'king exposure', 'forcing sequence']
            },
            backRankMate: {
                name: 'Back Rank Mate',
                description: 'Checkmate delivered on the opponent\'s first rank',
                hints: [
                    'Look for trapped kings on the back rank',
                    'Check if pawns are blocking escape squares',
                    'Rooks and queens deliver back rank mates'
                ],
                indicators: ['trapped king', 'first rank', 'no escape squares']
            },
            smotheredMate: {
                name: 'Smothered Mate',
                description: 'Checkmate where the king is surrounded by its own pieces',
                hints: [
                    'Knights deliver smothered mates',
                    'The king must be blocked by its own pieces',
                    'Often involves a queen sacrifice to set up'
                ],
                indicators: ['knight check', 'blocked king', 'own pieces blocking']
            }
        };
    }

    generateHints(puzzle, position) {
        this.currentHints = [];
        const pattern = this.detectPattern(puzzle, position);
        
        // Level 1 Hint: General direction
        this.currentHints.push({
            level: 1,
            text: this.getGeneralHint(puzzle, pattern),
            cost: 10 // XP cost
        });
        
        // Level 2 Hint: Specific piece or square
        this.currentHints.push({
            level: 2,
            text: this.getSpecificHint(puzzle, position),
            cost: 20
        });
        
        // Level 3 Hint: First move
        this.currentHints.push({
            level: 3,
            text: this.getSolutionHint(puzzle),
            cost: 30
        });
        
        return this.currentHints;
    }

    detectPattern(puzzle, position) {
        // Analyze the puzzle theme to detect tactical patterns
        const themes = puzzle.themes || puzzle.theme || [];
        const themeString = Array.isArray(themes) ? themes.join(' ') : themes;
        
        for (const [key, pattern] of Object.entries(this.patternLibrary)) {
            for (const indicator of pattern.indicators) {
                if (themeString.toLowerCase().includes(indicator)) {
                    return key;
                }
            }
        }
        
        // Advanced pattern detection based on position
        return this.analyzePosition(position);
    }

    analyzePosition(position) {
        // This would analyze the actual chess position
        // For now, return a general pattern
        return 'tactics';
    }

    getGeneralHint(puzzle, pattern) {
        if (pattern && this.patternLibrary[pattern]) {
            const patternHints = this.patternLibrary[pattern].hints;
            return patternHints[0];
        }
        
        const generalHints = [
            'Look for undefended pieces',
            'Check all forcing moves (checks, captures, threats)',
            'Consider the weakest point in the opponent\'s position',
            'Look for tactical patterns like forks, pins, or skewers',
            'Think about the most active move'
        ];
        
        return generalHints[Math.floor(Math.random() * generalHints.length)];
    }

    getSpecificHint(puzzle, position) {
        const moves = puzzle.moves || [];
        if (moves.length > 0) {
            const firstMove = moves[0];
            const piece = this.getPieceFromMove(firstMove);
            const targetSquare = firstMove.slice(-2);
            
            const hints = [
                `Focus on your ${piece}`,
                `Look at the ${targetSquare} square`,
                `Consider moves to the ${this.getFile(targetSquare)} file`,
                `Think about attacking the ${this.getRank(targetSquare)} rank`
            ];
            
            return hints[Math.floor(Math.random() * hints.length)];
        }
        
        return 'Look for the most forcing move available';
    }

    getSolutionHint(puzzle) {
        const moves = puzzle.moves || [];
        if (moves.length > 0) {
            const firstMove = moves[0];
            return `The solution starts with ${this.formatMove(firstMove)}`;
        }
        return 'Calculate all forcing variations';
    }

    getPieceFromMove(move) {
        // Parse algebraic notation to get piece type
        const pieces = {
            'N': 'knight',
            'B': 'bishop',
            'R': 'rook',
            'Q': 'queen',
            'K': 'king'
        };
        
        const pieceChar = move[0];
        return pieces[pieceChar] || 'pawn';
    }

    formatMove(move) {
        // Format move for display
        if (move.includes('O-O')) return 'castling';
        if (move.length === 2) return `pawn to ${move}`;
        
        const piece = this.getPieceFromMove(move);
        const target = move.slice(-2);
        const capture = move.includes('x') ? 'captures on' : 'to';
        
        return `${piece} ${capture} ${target}`;
    }

    getFile(square) {
        return square[0];
    }

    getRank(square) {
        return square[1];
    }

    useHint(level) {
        if (this.hintsUsed >= this.maxHints) {
            return { success: false, message: 'No more hints available for this puzzle' };
        }
        
        const hint = this.currentHints[level - 1];
        if (!hint) {
            return { success: false, message: 'Hint not available' };
        }
        
        this.hintsUsed++;
        
        // Deduct XP if gamification is enabled
        if (window.gamification) {
            window.gamification.awardXP(-hint.cost, `Hint used (Level ${level})`);
        }
        
        return {
            success: true,
            hint: hint.text,
            hintsRemaining: this.maxHints - this.hintsUsed
        };
    }

    resetHints() {
        this.hintsUsed = 0;
        this.currentHints = [];
    }

    explainMove(move, position, isCorrect) {
        if (!this.explanationMode) return null;
        
        const explanation = {
            move: move,
            isCorrect: isCorrect,
            reasons: []
        };
        
        if (isCorrect) {
            explanation.reasons = [
                'This move creates immediate threats',
                'It follows the principle of forcing moves',
                'This is the most accurate continuation'
            ];
        } else {
            explanation.reasons = this.explainWhyMoveIsWrong(move, position);
        }
        
        return explanation;
    }

    explainWhyMoveIsWrong(move, position) {
        const reasons = [];
        
        // Analyze why the move is incorrect
        reasons.push('This move doesn\'t create enough pressure');
        
        if (this.allowsCounterplay(move, position)) {
            reasons.push('It allows strong counterplay');
        }
        
        if (this.missesBetterMove(move, position)) {
            reasons.push('There\'s a stronger move available');
        }
        
        if (this.hangspiece(move, position)) {
            reasons.push('This move hangs material');
        }
        
        return reasons;
    }

    allowsCounterplay(move, position) {
        // Check if move allows opponent counterplay
        return Math.random() > 0.5; // Placeholder
    }

    missesBetterMove(move, position) {
        // Check if there's a better move
        return Math.random() > 0.3; // Placeholder
    }

    hangspiece(move, position) {
        // Check if move hangs a piece
        return Math.random() > 0.7; // Placeholder
    }

    // Pattern Training Mode
    startPatternTraining(pattern) {
        const trainingSession = {
            pattern: pattern,
            puzzles: this.getPuzzlesForPattern(pattern),
            currentIndex: 0,
            correct: 0,
            total: 0,
            startTime: Date.now()
        };
        
        localStorage.setItem('patternTraining', JSON.stringify(trainingSession));
        return trainingSession;
    }

    getPuzzlesForPattern(pattern) {
        // This would fetch puzzles from the database filtered by pattern
        // For now, return placeholder
        return [
            { id: 1, theme: pattern, difficulty: 'easy' },
            { id: 2, theme: pattern, difficulty: 'medium' },
            { id: 3, theme: pattern, difficulty: 'hard' }
        ];
    }

    // Mistake Review System
    saveMistake(puzzle, wrongMove, correctMove) {
        const mistakes = JSON.parse(localStorage.getItem('mistakes') || '[]');
        
        mistakes.push({
            puzzleId: puzzle.id,
            wrongMove: wrongMove,
            correctMove: correctMove,
            timestamp: Date.now(),
            theme: puzzle.theme,
            rating: puzzle.rating
        });
        
        // Keep only last 100 mistakes
        if (mistakes.length > 100) {
            mistakes.shift();
        }
        
        localStorage.setItem('mistakes', JSON.stringify(mistakes));
    }

    getMistakePatterns() {
        const mistakes = JSON.parse(localStorage.getItem('mistakes') || '[]');
        const patterns = {};
        
        mistakes.forEach(mistake => {
            const theme = mistake.theme || 'general';
            if (!patterns[theme]) {
                patterns[theme] = {
                    count: 0,
                    examples: []
                };
            }
            patterns[theme].count++;
            if (patterns[theme].examples.length < 3) {
                patterns[theme].examples.push(mistake);
            }
        });
        
        return patterns;
    }

    // Adaptive Difficulty
    recommendDifficulty(userStats) {
        const recentAccuracy = userStats.recentAccuracy || 0;
        const averageTime = userStats.averageTime || 60;
        const currentRating = userStats.rating || 1200;
        
        let recommendedRating = currentRating;
        
        if (recentAccuracy > 80 && averageTime < 30) {
            recommendedRating += 100; // Increase difficulty
        } else if (recentAccuracy < 50 || averageTime > 120) {
            recommendedRating -= 100; // Decrease difficulty
        }
        
        return {
            rating: recommendedRating,
            reason: this.getDifficultyReason(recentAccuracy, averageTime)
        };
    }

    getDifficultyReason(accuracy, time) {
        if (accuracy > 80 && time < 30) {
            return 'You\'re solving puzzles quickly and accurately. Time for harder challenges!';
        } else if (accuracy < 50) {
            return 'Focus on accuracy. Let\'s practice with slightly easier puzzles.';
        } else if (time > 120) {
            return 'Take your time, but these puzzles might be too complex. Try easier ones.';
        }
        return 'Your current difficulty level seems appropriate.';
    }
}

// Add hint UI styles
const style = document.createElement('style');
style.textContent = `
    .hint-panel {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(0, 212, 255, 0.1));
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        padding: 15px;
        margin: 15px 0;
    }

    .hint-buttons {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
    }

    .hint-btn {
        flex: 1;
        padding: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 12px;
    }

    .hint-btn:hover {
        background: rgba(0, 212, 255, 0.2);
        border-color: var(--primary);
    }

    .hint-btn.used {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .hint-content {
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border-left: 3px solid var(--primary);
        font-size: 14px;
        line-height: 1.5;
    }

    .hint-cost {
        font-size: 11px;
        color: var(--warning);
        margin-left: 5px;
    }

    .explanation-box {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin: 10px 0;
    }

    .explanation-title {
        font-weight: 600;
        color: var(--success);
        margin-bottom: 8px;
        font-size: 14px;
    }

    .explanation-text {
        font-size: 13px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.9);
    }

    .pattern-indicator {
        display: inline-block;
        background: linear-gradient(135deg, var(--secondary), var(--primary));
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-right: 8px;
    }
`;
document.head.appendChild(style);

// Export for use
window.LearningMode = LearningMode;