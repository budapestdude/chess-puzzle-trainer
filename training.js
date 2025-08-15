// Define puzzle categories for mate-in-2 puzzles
const puzzleCategories = {
    checkmate: { 
        name: 'Checkmate', 
        icon: '♔', 
        color: '#e74c3c',
        description: 'Find the checkmate in 2 moves'
    }
};

// Define themes for mate-in-2 puzzles
const themes = {
    mateIn2: 'Mate in 2',
    tactics: 'Tactics',
    sacrifice: 'Sacrifice',
    pin: 'Pin',
    fork: 'Fork',
    skewer: 'Skewer',
    deflection: 'Deflection',
    decoy: 'Decoy',
    discovery: 'Discovery',
    doubleAttack: 'Double Attack',
    removeDefender: 'Remove Defender',
    interference: 'Interference',
    clearance: 'Clearance',
    xray: 'X-Ray',
    zugzwang: 'Zugzwang'
};

class TrainingSystem {
    constructor() {
        this.userData = this.loadUserData();
        this.currentSession = {
            startTime: Date.now(),
            puzzlesSolved: 0,
            puzzlesFailed: 0,
            totalTime: 0,
            streakCount: 0,
            mode: 'practice'
        };
        this.failedPuzzles = [];
        this.completedPuzzles = new Set();
    }

    loadUserData() {
        const saved = localStorage.getItem('chessTrainingData');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            rating: 1200,
            totalPuzzlesSolved: 0,
            totalPuzzlesFailed: 0,
            categoryProgress: {},
            puzzleHistory: [],
            achievements: [],
            streakRecord: 0,
            dailyGoal: 10,
            lastTrainingDate: null,
            totalTrainingTime: 0,
            preferredDifficulty: 1
        };
    }

    saveUserData() {
        localStorage.setItem('chessTrainingData', JSON.stringify(this.userData));
    }

    updateRating(solved, difficulty) {
        const K = 32;
        const expectedScore = 1 / (1 + Math.pow(10, (difficulty * 400 - this.userData.rating) / 400));
        const actualScore = solved ? 1 : 0;
        const ratingChange = Math.round(K * (actualScore - expectedScore));
        
        this.userData.rating += ratingChange;
        this.saveUserData();
        
        return ratingChange;
    }

    recordPuzzleAttempt(puzzleId, solved, timeSpent, hintsUsed = 0) {
        // Try to find puzzle in old database first
        let puzzle = puzzleDatabase.find(p => p.id === puzzleId);
        
        // If not found, create a minimal puzzle object for tracking
        if (!puzzle) {
            puzzle = {
                id: puzzleId,
                category: 'tactics', // Default category for new puzzles
                difficulty: 2 // Default medium difficulty
            };
        }

        const attempt = {
            puzzleId,
            solved,
            timeSpent,
            hintsUsed,
            timestamp: Date.now(),
            category: puzzle.category,
            difficulty: puzzle.difficulty
        };

        this.userData.puzzleHistory.push(attempt);
        
        if (solved) {
            this.userData.totalPuzzlesSolved++;
            this.currentSession.puzzlesSolved++;
            this.currentSession.streakCount++;
            this.completedPuzzles.add(puzzleId);
            
            if (this.currentSession.streakCount > this.userData.streakRecord) {
                this.userData.streakRecord = this.currentSession.streakCount;
                this.checkAchievement('streak', this.currentSession.streakCount);
            }
            
            // Check speed achievements
            if (timeSpent <= 10) {
                this.checkAchievement('speed', 10);
            }
            if (timeSpent <= 5) {
                this.checkAchievement('speed', 5);
            }
            
            // Check daily achievements
            const today = new Date().toDateString();
            const todaysPuzzles = this.userData.puzzleHistory.filter(p => 
                new Date(p.timestamp).toDateString() === today && p.solved
            ).length;
            this.checkAchievement('daily', todaysPuzzles);
        } else {
            this.userData.totalPuzzlesFailed++;
            this.currentSession.puzzlesFailed++;
            this.currentSession.streakCount = 0;
            this.failedPuzzles.push(puzzleId);
        }

        if (!this.userData.categoryProgress[puzzle.category]) {
            this.userData.categoryProgress[puzzle.category] = {
                solved: 0,
                attempted: 0,
                avgTime: 0
            };
        }
        
        const catProgress = this.userData.categoryProgress[puzzle.category];
        catProgress.attempted++;
        if (solved) {
            catProgress.solved++;
        }
        catProgress.avgTime = (catProgress.avgTime * (catProgress.attempted - 1) + timeSpent) / catProgress.attempted;

        const ratingChange = this.updateRating(solved, puzzle.difficulty);
        
        this.saveUserData();
        
        return {
            ratingChange,
            newRating: this.userData.rating,
            streak: this.currentSession.streakCount
        };
    }

    getRecommendedPuzzle() {
        const userLevel = Math.floor(this.userData.rating / 400);
        const targetDifficulty = Math.min(3, Math.max(1, userLevel));
        
        const availablePuzzles = puzzleDatabase.filter(p => {
            if (this.completedPuzzles.has(p.id)) return false;
            return Math.abs(p.difficulty - targetDifficulty) <= 1;
        });

        if (this.failedPuzzles.length > 0 && Math.random() < 0.3) {
            const retryId = this.failedPuzzles.shift();
            const retryPuzzle = puzzleDatabase.find(p => p.id === retryId);
            if (retryPuzzle) return retryPuzzle;
        }

        if (availablePuzzles.length === 0) {
            this.completedPuzzles.clear();
            return this.getRecommendedPuzzle();
        }

        const weights = availablePuzzles.map(p => {
            const difficultyMatch = 1 / (1 + Math.abs(p.difficulty - targetDifficulty));
            const categoryBonus = this.getLeastPracticedCategoryBonus(p.category);
            return difficultyMatch * categoryBonus;
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < availablePuzzles.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return availablePuzzles[i];
            }
        }
        
        return availablePuzzles[0];
    }

    getLeastPracticedCategoryBonus(category) {
        const progress = this.userData.categoryProgress[category];
        if (!progress) return 2.0;
        
        const totalAttempts = Object.values(this.userData.categoryProgress)
            .reduce((sum, p) => sum + p.attempted, 0);
        
        if (totalAttempts === 0) return 1.0;
        
        const categoryRatio = progress.attempted / totalAttempts;
        return 1 + (0.25 - categoryRatio) * 4;
    }

    getStatistics() {
        const totalAttempts = this.userData.totalPuzzlesSolved + this.userData.totalPuzzlesFailed;
        const successRate = totalAttempts > 0 ? 
            (this.userData.totalPuzzlesSolved / totalAttempts * 100).toFixed(1) : 0;

        const categoryStats = Object.entries(this.userData.categoryProgress).map(([cat, stats]) => ({
            category: cat,
            name: puzzleCategories[cat]?.name || cat,
            ...stats,
            successRate: stats.attempted > 0 ? (stats.solved / stats.attempted * 100).toFixed(1) : 0
        }));

        const recentHistory = this.userData.puzzleHistory.slice(-20);
        const recentSuccessRate = recentHistory.length > 0 ?
            (recentHistory.filter(h => h.solved).length / recentHistory.length * 100).toFixed(1) : 0;

        return {
            rating: this.userData.rating,
            totalSolved: this.userData.totalPuzzlesSolved,
            totalFailed: this.userData.totalPuzzlesFailed,
            successRate,
            recentSuccessRate,
            streakRecord: this.userData.streakRecord,
            currentStreak: this.currentSession.streakCount,
            categoryStats,
            totalTrainingTime: this.userData.totalTrainingTime,
            sessionStats: {
                solved: this.currentSession.puzzlesSolved,
                failed: this.currentSession.puzzlesFailed,
                time: Math.floor((Date.now() - this.currentSession.startTime) / 1000)
            }
        };
    }

    checkAchievement(type, value) {
        const achievements = {
            streak: [
                { threshold: 5, name: "Hot Streak", description: "Solve 5 puzzles in a row", icon: "🔥" },
                { threshold: 10, name: "On Fire", description: "Solve 10 puzzles in a row", icon: "🔥" },
                { threshold: 20, name: "Unstoppable", description: "Solve 20 puzzles in a row", icon: "🔥" },
                { threshold: 50, name: "Legendary Streak", description: "Solve 50 puzzles in a row", icon: "💎" },
                { threshold: 100, name: "Perfect Storm", description: "Solve 100 puzzles in a row", icon: "⚡" },
                { threshold: 200, name: "Untouchable", description: "Solve 200 puzzles in a row", icon: "🌟" }
            ],
            total: [
                { threshold: 10, name: "Beginner", description: "Solve 10 puzzles", icon: "🎯" },
                { threshold: 50, name: "Enthusiast", description: "Solve 50 puzzles", icon: "🎯" },
                { threshold: 100, name: "Dedicated", description: "Solve 100 puzzles", icon: "🎯" },
                { threshold: 250, name: "Puzzle Master", description: "Solve 250 puzzles", icon: "👑" },
                { threshold: 500, name: "Grandmaster", description: "Solve 500 puzzles", icon: "👑" },
                { threshold: 1000, name: "Chess Legend", description: "Solve 1000 puzzles", icon: "🏆" },
                { threshold: 2500, name: "Tactical Genius", description: "Solve 2500 puzzles", icon: "🌟" },
                { threshold: 5000, name: "Puzzle Addict", description: "Solve 5000 puzzles", icon: "💎" },
                { threshold: 10000, name: "Chess Immortal", description: "Solve 10000 puzzles", icon: "⚡" }
            ],
            rating: [
                { threshold: 1400, name: "Rising Star", description: "Reach 1400 rating", icon: "⭐" },
                { threshold: 1600, name: "Strong Player", description: "Reach 1600 rating", icon: "⭐" },
                { threshold: 1800, name: "Expert", description: "Reach 1800 rating", icon: "⭐" },
                { threshold: 2000, name: "Master", description: "Reach 2000 rating", icon: "🌟" },
                { threshold: 2200, name: "Elite", description: "Reach 2200 rating", icon: "💫" }
            ],
            speed: [
                { threshold: 10, name: "Quick Thinker", description: "Solve a puzzle in under 10 seconds", icon: "⚡" },
                { threshold: 5, name: "Lightning Fast", description: "Solve a puzzle in under 5 seconds", icon: "⚡" }
            ],
            daily: [
                { threshold: 10, name: "Daily Champion", description: "Solve 10 puzzles in one day", icon: "📅" },
                { threshold: 25, name: "Marathon Runner", description: "Solve 25 puzzles in one day", icon: "📅" },
                { threshold: 50, name: "Puzzle Addict", description: "Solve 50 puzzles in one day", icon: "📅" }
            ],
            perfect: [
                { threshold: 10, name: "Perfectionist", description: "100% accuracy on 10 puzzles", icon: "💯" },
                { threshold: 25, name: "Flawless", description: "100% accuracy on 25 puzzles", icon: "💯" }
            ],
            rush: [
                { threshold: 10, name: "Rush Rookie", description: "Solve 10 puzzles in rush mode", icon: "🏃" },
                { threshold: 20, name: "Rush Expert", description: "Solve 20 puzzles in rush mode", icon: "🏃" },
                { threshold: 30, name: "Rush Master", description: "Solve 30 puzzles in rush mode", icon: "🥇" }
            ]
        };

        const relevantAchievements = achievements[type] || [];
        const newAchievements = [];

        for (const achievement of relevantAchievements) {
            if (value >= achievement.threshold) {
                const achievementId = `${type}_${achievement.threshold}`;
                if (!this.userData.achievements.includes(achievementId)) {
                    this.userData.achievements.push(achievementId);
                    newAchievements.push(achievement);
                }
            }
        }

        if (newAchievements.length > 0) {
            this.saveUserData();
        }

        return newAchievements;
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            localStorage.removeItem('chessTrainingData');
            this.userData = this.loadUserData();
            this.currentSession = {
                startTime: Date.now(),
                puzzlesSolved: 0,
                puzzlesFailed: 0,
                totalTime: 0,
                streakCount: 0,
                mode: 'practice'
            };
            this.failedPuzzles = [];
            this.completedPuzzles.clear();
            return true;
        }
        return false;
    }
}