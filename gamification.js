// Gamification System for Chess Puzzle Trainer
class GamificationSystem {
    constructor() {
        this.xpLevels = this.generateXPLevels();
        this.badges = this.initializeBadges();
        this.dailyChallenge = null;
        this.loadUserProgress();
    }

    generateXPLevels() {
        const levels = [];
        let totalXP = 0;
        
        for (let i = 1; i <= 100; i++) {
            const xpRequired = Math.floor(100 * Math.pow(1.15, i - 1));
            totalXP += xpRequired;
            levels.push({
                level: i,
                xpRequired: xpRequired,
                totalXP: totalXP,
                title: this.getLevelTitle(i)
            });
        }
        
        return levels;
    }

    getLevelTitle(level) {
        if (level <= 10) return 'Novice';
        if (level <= 20) return 'Apprentice';
        if (level <= 30) return 'Club Player';
        if (level <= 40) return 'Expert';
        if (level <= 50) return 'Master';
        if (level <= 60) return 'International Master';
        if (level <= 70) return 'Grandmaster';
        if (level <= 80) return 'Super Grandmaster';
        if (level <= 90) return 'World Champion';
        return 'Chess Legend';
    }

    initializeBadges() {
        return [
            // Puzzle Solving Badges
            { id: 'first_puzzle', name: 'First Step', description: 'Solve your first puzzle', icon: '🎯', xp: 10 },
            { id: 'puzzle_10', name: 'Getting Started', description: 'Solve 10 puzzles', icon: '✨', xp: 50 },
            { id: 'puzzle_50', name: 'Dedicated Solver', description: 'Solve 50 puzzles', icon: '🌟', xp: 100 },
            { id: 'puzzle_100', name: 'Century', description: 'Solve 100 puzzles', icon: '💯', xp: 200 },
            { id: 'puzzle_500', name: 'Puzzle Master', description: 'Solve 500 puzzles', icon: '🎖️', xp: 500 },
            { id: 'puzzle_1000', name: 'Grandmaster Solver', description: 'Solve 1000 puzzles', icon: '👑', xp: 1000 },
            
            // Streak Badges
            { id: 'streak_3', name: 'Warming Up', description: '3 day streak', icon: '🔥', xp: 30 },
            { id: 'streak_7', name: 'Week Warrior', description: '7 day streak', icon: '💪', xp: 100 },
            { id: 'streak_30', name: 'Monthly Master', description: '30 day streak', icon: '🏆', xp: 500 },
            { id: 'streak_100', name: 'Century Streak', description: '100 day streak', icon: '💎', xp: 2000 },
            
            // Accuracy Badges
            { id: 'accuracy_80', name: 'Sharp Eye', description: 'Maintain 80% accuracy over 50 puzzles', icon: '👁️', xp: 150 },
            { id: 'accuracy_90', name: 'Precision Player', description: 'Maintain 90% accuracy over 100 puzzles', icon: '🎯', xp: 300 },
            { id: 'accuracy_95', name: 'Perfectionist', description: 'Maintain 95% accuracy over 200 puzzles', icon: '✨', xp: 500 },
            { id: 'perfect_10', name: 'Perfect Ten', description: 'Solve 10 puzzles in a row correctly', icon: '🔟', xp: 100 },
            
            // Speed Badges
            { id: 'speed_demon', name: 'Speed Demon', description: 'Solve a puzzle in under 5 seconds', icon: '⚡', xp: 50 },
            { id: 'rapid_solver', name: 'Rapid Solver', description: 'Solve 10 puzzles under 10 seconds each', icon: '🏃', xp: 150 },
            { id: 'blitz_master', name: 'Blitz Master', description: 'Complete Rush Mode with 30+ puzzles', icon: '⏱️', xp: 200 },
            
            // Pattern Badges
            { id: 'fork_master', name: 'Fork Master', description: 'Solve 50 fork puzzles', icon: '🍴', xp: 100 },
            { id: 'pin_expert', name: 'Pin Expert', description: 'Solve 50 pin puzzles', icon: '📌', xp: 100 },
            { id: 'sacrifice_hero', name: 'Sacrifice Hero', description: 'Solve 50 sacrifice puzzles', icon: '⚔️', xp: 150 },
            { id: 'endgame_expert', name: 'Endgame Expert', description: 'Solve 100 endgame puzzles', icon: '♔', xp: 200 },
            
            // Special Badges
            { id: 'night_owl', name: 'Night Owl', description: 'Solve puzzles after midnight', icon: '🦉', xp: 50 },
            { id: 'early_bird', name: 'Early Bird', description: 'Solve puzzles before 6 AM', icon: '🌅', xp: 50 },
            { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Solve 50 puzzles on weekends', icon: '🎮', xp: 100 },
            { id: 'comeback_king', name: 'Comeback King', description: 'Return after 7 days absence', icon: '🔄', xp: 75 },
            
            // Milestone Badges
            { id: 'rating_1500', name: 'Club Champion', description: 'Reach 1500 rating', icon: '🏅', xp: 200 },
            { id: 'rating_1800', name: 'Expert Level', description: 'Reach 1800 rating', icon: '🎖️', xp: 400 },
            { id: 'rating_2000', name: 'Master Achieved', description: 'Reach 2000 rating', icon: '🏆', xp: 800 },
            { id: 'rating_2200', name: 'Elite Player', description: 'Reach 2200 rating', icon: '👑', xp: 1500 }
        ];
    }

    loadUserProgress() {
        const savedProgress = localStorage.getItem('gamificationProgress');
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            this.userXP = progress.xp || 0;
            this.userLevel = progress.level || 1;
            this.earnedBadges = progress.badges || [];
            this.dailyStreak = progress.dailyStreak || 0;
            this.lastActiveDate = progress.lastActiveDate || null;
        } else {
            this.userXP = 0;
            this.userLevel = 1;
            this.earnedBadges = [];
            this.dailyStreak = 0;
            this.lastActiveDate = null;
        }
    }

    saveProgress() {
        const progress = {
            xp: this.userXP,
            level: this.userLevel,
            badges: this.earnedBadges,
            dailyStreak: this.dailyStreak,
            lastActiveDate: this.lastActiveDate
        };
        localStorage.setItem('gamificationProgress', JSON.stringify(progress));
    }

    // XP System
    awardXP(amount, reason) {
        this.userXP += amount;
        
        // Check for level up
        const newLevel = this.calculateLevel(this.userXP);
        if (newLevel > this.userLevel) {
            this.levelUp(newLevel);
        }
        
        this.saveProgress();
        
        // Show XP notification
        this.showNotification(`+${amount} XP`, reason);
        
        return {
            xp: amount,
            totalXP: this.userXP,
            level: this.userLevel
        };
    }

    calculateLevel(xp) {
        for (let i = 0; i < this.xpLevels.length; i++) {
            if (xp < this.xpLevels[i].totalXP) {
                return i + 1;
            }
        }
        return 100; // Max level
    }

    levelUp(newLevel) {
        const oldLevel = this.userLevel;
        this.userLevel = newLevel;
        
        // Award level up bonus
        const bonusXP = newLevel * 50;
        this.userXP += bonusXP;
        
        // Show level up notification
        this.showLevelUpNotification(oldLevel, newLevel);
        
        // Check for level-based badges
        this.checkLevelBadges(newLevel);
    }

    // Badge System
    checkAndAwardBadges(userData) {
        const newBadges = [];
        
        this.badges.forEach(badge => {
            if (!this.earnedBadges.includes(badge.id)) {
                if (this.checkBadgeRequirement(badge, userData)) {
                    this.earnedBadges.push(badge.id);
                    newBadges.push(badge);
                    this.awardXP(badge.xp, `Badge: ${badge.name}`);
                }
            }
        });
        
        if (newBadges.length > 0) {
            this.showBadgeNotification(newBadges);
            this.saveProgress();
        }
        
        return newBadges;
    }

    checkBadgeRequirement(badge, userData) {
        const stats = userData.trainingData || {};
        
        switch (badge.id) {
            case 'first_puzzle':
                return stats.totalPuzzlesSolved >= 1;
            case 'puzzle_10':
                return stats.totalPuzzlesSolved >= 10;
            case 'puzzle_50':
                return stats.totalPuzzlesSolved >= 50;
            case 'puzzle_100':
                return stats.totalPuzzlesSolved >= 100;
            case 'puzzle_500':
                return stats.totalPuzzlesSolved >= 500;
            case 'puzzle_1000':
                return stats.totalPuzzlesSolved >= 1000;
            case 'streak_3':
                return this.dailyStreak >= 3;
            case 'streak_7':
                return this.dailyStreak >= 7;
            case 'streak_30':
                return this.dailyStreak >= 30;
            case 'streak_100':
                return this.dailyStreak >= 100;
            case 'rating_1500':
                return stats.rating >= 1500;
            case 'rating_1800':
                return stats.rating >= 1800;
            case 'rating_2000':
                return stats.rating >= 2000;
            case 'rating_2200':
                return stats.rating >= 2200;
            // Add more badge checks as needed
            default:
                return false;
        }
    }

    // Daily Challenge System
    generateDailyChallenge() {
        const today = new Date().toDateString();
        const savedChallenge = localStorage.getItem('dailyChallenge');
        
        if (savedChallenge) {
            const challenge = JSON.parse(savedChallenge);
            if (challenge.date === today) {
                this.dailyChallenge = challenge;
                return challenge;
            }
        }
        
        // Generate new daily challenge
        const challenges = [
            { type: 'solve_count', target: 10, description: 'Solve 10 puzzles', xp: 100 },
            { type: 'accuracy', target: 80, description: 'Maintain 80% accuracy', xp: 150 },
            { type: 'speed', target: 30, description: 'Solve 5 puzzles under 30 seconds each', xp: 200 },
            { type: 'theme', target: 'fork', description: 'Solve 5 fork puzzles', xp: 120 },
            { type: 'streak', target: 5, description: 'Solve 5 puzzles in a row correctly', xp: 180 },
            { type: 'rating_gain', target: 20, description: 'Gain 20 rating points', xp: 250 },
            { type: 'time_limit', target: 15, description: 'Solve 15 puzzles in 15 minutes', xp: 300 }
        ];
        
        const challenge = challenges[Math.floor(Math.random() * challenges.length)];
        challenge.date = today;
        challenge.completed = false;
        challenge.progress = 0;
        
        this.dailyChallenge = challenge;
        localStorage.setItem('dailyChallenge', JSON.stringify(challenge));
        
        return challenge;
    }

    updateDailyChallengeProgress(type, value) {
        if (!this.dailyChallenge || this.dailyChallenge.completed) return;
        
        if (this.dailyChallenge.type === type) {
            this.dailyChallenge.progress += value;
            
            if (this.dailyChallenge.progress >= this.dailyChallenge.target) {
                this.completeDailyChallenge();
            } else {
                localStorage.setItem('dailyChallenge', JSON.stringify(this.dailyChallenge));
            }
        }
    }

    completeDailyChallenge() {
        this.dailyChallenge.completed = true;
        localStorage.setItem('dailyChallenge', JSON.stringify(this.dailyChallenge));
        
        // Award XP
        this.awardXP(this.dailyChallenge.xp, 'Daily Challenge Complete!');
        
        // Show completion notification
        this.showChallengeCompleteNotification();
    }

    // Streak System
    updateDailyStreak() {
        const today = new Date().toDateString();
        
        if (this.lastActiveDate) {
            const lastDate = new Date(this.lastActiveDate);
            const todayDate = new Date(today);
            const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                // Consecutive day
                this.dailyStreak++;
                this.awardXP(10 * this.dailyStreak, `${this.dailyStreak} day streak!`);
            } else if (daysDiff > 1) {
                // Streak broken
                this.dailyStreak = 1;
                this.showNotification('Streak Reset', 'Your daily streak has been reset');
            }
        } else {
            this.dailyStreak = 1;
        }
        
        this.lastActiveDate = today;
        this.saveProgress();
    }

    // Leaderboard System
    async updateLeaderboard(score, type = 'weekly') {
        // This would typically make an API call to update server-side leaderboard
        const leaderboardData = {
            userId: this.getUserId(),
            score: score,
            level: this.userLevel,
            xp: this.userXP,
            type: type,
            timestamp: Date.now()
        };
        
        // For now, store locally
        const leaderboards = JSON.parse(localStorage.getItem('leaderboards') || '{}');
        if (!leaderboards[type]) {
            leaderboards[type] = [];
        }
        
        leaderboards[type].push(leaderboardData);
        leaderboards[type].sort((a, b) => b.score - a.score);
        leaderboards[type] = leaderboards[type].slice(0, 100); // Keep top 100
        
        localStorage.setItem('leaderboards', JSON.stringify(leaderboards));
        
        return this.getLeaderboardRank(type);
    }

    getLeaderboardRank(type = 'weekly') {
        const leaderboards = JSON.parse(localStorage.getItem('leaderboards') || '{}');
        const board = leaderboards[type] || [];
        const userId = this.getUserId();
        
        const rank = board.findIndex(entry => entry.userId === userId) + 1;
        return rank || null;
    }

    // Notification System
    showNotification(title, message, type = 'xp') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `gamification-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${this.getNotificationIcon(type)}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showLevelUpNotification(oldLevel, newLevel) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `
            <div class="level-up-content">
                <div class="level-up-title">LEVEL UP!</div>
                <div class="level-up-levels">
                    <span class="old-level">Level ${oldLevel}</span>
                    <span class="level-arrow">→</span>
                    <span class="new-level">Level ${newLevel}</span>
                </div>
                <div class="level-up-title-text">${this.getLevelTitle(newLevel)}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    showBadgeNotification(badges) {
        badges.forEach((badge, index) => {
            setTimeout(() => {
                const notification = document.createElement('div');
                notification.className = 'badge-notification';
                notification.innerHTML = `
                    <div class="badge-icon">${badge.icon}</div>
                    <div class="badge-content">
                        <div class="badge-earned">Badge Earned!</div>
                        <div class="badge-name">${badge.name}</div>
                        <div class="badge-description">${badge.description}</div>
                        <div class="badge-xp">+${badge.xp} XP</div>
                    </div>
                `;
                
                document.body.appendChild(notification);
                setTimeout(() => notification.classList.add('show'), 10);
                
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 500);
                }, 4000);
            }, index * 500);
        });
    }

    showChallengeCompleteNotification() {
        const notification = document.createElement('div');
        notification.className = 'challenge-complete-notification';
        notification.innerHTML = `
            <div class="challenge-complete-content">
                <div class="challenge-complete-icon">🎯</div>
                <div class="challenge-complete-title">Daily Challenge Complete!</div>
                <div class="challenge-complete-xp">+${this.dailyChallenge.xp} XP</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'xp': return '⭐';
            case 'badge': return '🏅';
            case 'level': return '🎯';
            case 'streak': return '🔥';
            case 'challenge': return '🎯';
            default: return '✨';
        }
    }

    getUserId() {
        const userData = JSON.parse(localStorage.getItem('currentChessUser') || '{}');
        return userData.id || 'guest';
    }

    // Get current stats for display
    getStats() {
        return {
            level: this.userLevel,
            xp: this.userXP,
            xpToNextLevel: this.getXPToNextLevel(),
            title: this.getLevelTitle(this.userLevel),
            badges: this.earnedBadges.length,
            totalBadges: this.badges.length,
            dailyStreak: this.dailyStreak,
            dailyChallenge: this.dailyChallenge
        };
    }

    getXPToNextLevel() {
        if (this.userLevel >= 100) return 0;
        
        const currentLevelData = this.xpLevels[this.userLevel - 1];
        const nextLevelData = this.xpLevels[this.userLevel];
        
        const xpInCurrentLevel = this.userXP - (currentLevelData.totalXP - currentLevelData.xpRequired);
        const xpNeeded = nextLevelData.xpRequired - xpInCurrentLevel;
        
        return {
            current: xpInCurrentLevel,
            required: nextLevelData.xpRequired,
            remaining: xpNeeded,
            percentage: (xpInCurrentLevel / nextLevelData.xpRequired) * 100
        };
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .gamification-notification {
        position: fixed;
        top: 20px;
        right: -400px;
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(0, 212, 255, 0.9));
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 15px;
        transition: right 0.3s ease;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .gamification-notification.show {
        right: 20px;
    }

    .notification-icon {
        font-size: 24px;
    }

    .notification-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .notification-message {
        font-size: 14px;
        opacity: 0.9;
    }

    .level-up-notification {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #1f2937;
        padding: 30px 50px;
        border-radius: 20px;
        z-index: 10001;
        transition: transform 0.5s ease;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }

    .level-up-notification.show {
        transform: translate(-50%, -50%) scale(1);
    }

    .level-up-title {
        font-size: 32px;
        font-weight: 800;
        text-align: center;
        margin-bottom: 15px;
    }

    .level-up-levels {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        font-size: 24px;
        margin-bottom: 10px;
    }

    .old-level {
        opacity: 0.7;
    }

    .new-level {
        font-weight: 700;
    }

    .level-up-title-text {
        text-align: center;
        font-size: 18px;
        font-weight: 600;
        opacity: 0.9;
    }

    .badge-notification {
        position: fixed;
        top: 80px;
        right: -400px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(251, 191, 36, 0.95));
        color: #1f2937;
        padding: 20px 25px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        gap: 20px;
        transition: right 0.3s ease;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .badge-notification.show {
        right: 20px;
    }

    .badge-icon {
        font-size: 48px;
    }

    .badge-earned {
        font-size: 12px;
        text-transform: uppercase;
        opacity: 0.8;
        letter-spacing: 1px;
    }

    .badge-name {
        font-size: 18px;
        font-weight: 700;
        margin: 4px 0;
    }

    .badge-description {
        font-size: 14px;
        opacity: 0.9;
    }

    .badge-xp {
        margin-top: 8px;
        font-size: 16px;
        font-weight: 600;
    }

    .challenge-complete-notification {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 40px 60px;
        border-radius: 20px;
        z-index: 10001;
        transition: transform 0.5s ease;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        text-align: center;
    }

    .challenge-complete-notification.show {
        transform: translate(-50%, -50%) scale(1);
    }

    .challenge-complete-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .challenge-complete-title {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 10px;
    }

    .challenge-complete-xp {
        font-size: 20px;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

// Export for use in other modules
window.GamificationSystem = GamificationSystem;