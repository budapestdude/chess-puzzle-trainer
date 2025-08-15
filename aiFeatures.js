// AI Features for Chess Puzzle Trainer
class AIFeatures {
    constructor() {
        this.userModel = this.initializeUserModel();
        this.patternRecognition = new PatternRecognition();
        this.difficultyEngine = new AdaptiveDifficulty();
        this.weaknessDetector = new WeaknessDetector();
        this.recommendationEngine = new RecommendationEngine();
        this.performancePredictor = new PerformancePredictor();
        
        this.loadUserData();
    }
    
    initializeUserModel() {
        return {
            skillProfile: {
                tactics: 1200,
                endgames: 1200,
                openings: 1200,
                calculation: 1200,
                visualization: 1200,
                timeManagement: 1200
            },
            patterns: {
                forks: { success: 0, attempts: 0, avgTime: 0 },
                pins: { success: 0, attempts: 0, avgTime: 0 },
                skewers: { success: 0, attempts: 0, avgTime: 0 },
                discoveries: { success: 0, attempts: 0, avgTime: 0 },
                sacrifices: { success: 0, attempts: 0, avgTime: 0 },
                mates: { success: 0, attempts: 0, avgTime: 0 },
                promotions: { success: 0, attempts: 0, avgTime: 0 },
                endgames: { success: 0, attempts: 0, avgTime: 0 }
            },
            timeProfile: {
                bestTime: '06:00-09:00',
                worstTime: '21:00-24:00',
                averageSolveTime: 60,
                rushModeBest: 0
            },
            learningStyle: 'visual', // visual, analytical, intuitive, systematic
            strengths: [],
            weaknesses: [],
            recommendations: []
        };
    }
    
    loadUserData() {
        const savedModel = localStorage.getItem('aiUserModel');
        if (savedModel) {
            this.userModel = JSON.parse(savedModel);
        }
    }
    
    saveUserModel() {
        localStorage.setItem('aiUserModel', JSON.stringify(this.userModel));
    }
    
    // Update model based on puzzle result
    updateModel(puzzleResult) {
        const { puzzle, solved, time, moves, hints } = puzzleResult;
        
        // Update pattern statistics
        const pattern = this.identifyPattern(puzzle);
        if (pattern && this.userModel.patterns[pattern]) {
            this.userModel.patterns[pattern].attempts++;
            if (solved) {
                this.userModel.patterns[pattern].success++;
                const avgTime = this.userModel.patterns[pattern].avgTime;
                this.userModel.patterns[pattern].avgTime = 
                    avgTime ? (avgTime + time) / 2 : time;
            }
        }
        
        // Update skill ratings using ELO-like system
        this.updateSkillRating(puzzle, solved);
        
        // Detect weaknesses and strengths
        this.weaknessDetector.analyze(this.userModel);
        
        // Generate recommendations
        this.updateRecommendations();
        
        // Save updated model
        this.saveUserModel();
    }
    
    identifyPattern(puzzle) {
        const themes = puzzle.themes || puzzle.theme || [];
        const themeString = Array.isArray(themes) ? themes.join(' ').toLowerCase() : themes.toLowerCase();
        
        const patterns = {
            'fork': 'forks',
            'pin': 'pins',
            'skewer': 'skewers',
            'discovered': 'discoveries',
            'sacrifice': 'sacrifices',
            'mate': 'mates',
            'promotion': 'promotions',
            'endgame': 'endgames'
        };
        
        for (const [key, value] of Object.entries(patterns)) {
            if (themeString.includes(key)) {
                return value;
            }
        }
        
        return null;
    }
    
    updateSkillRating(puzzle, solved) {
        const K = 32; // K-factor for rating adjustment
        const expectedScore = 1 / (1 + Math.pow(10, (puzzle.rating - this.userModel.skillProfile.tactics) / 400));
        const actualScore = solved ? 1 : 0;
        const ratingChange = K * (actualScore - expectedScore);
        
        this.userModel.skillProfile.tactics += ratingChange;
        
        // Update specific skill based on puzzle type
        const skillType = this.getSkillType(puzzle);
        if (skillType && this.userModel.skillProfile[skillType]) {
            this.userModel.skillProfile[skillType] += ratingChange * 0.5;
        }
    }
    
    getSkillType(puzzle) {
        const themes = puzzle.themes || puzzle.theme || [];
        const themeString = Array.isArray(themes) ? themes.join(' ').toLowerCase() : themes.toLowerCase();
        
        if (themeString.includes('endgame')) return 'endgames';
        if (themeString.includes('opening')) return 'openings';
        if (themeString.includes('calculation')) return 'calculation';
        if (themeString.includes('visualization')) return 'visualization';
        
        return 'tactics';
    }
    
    updateRecommendations() {
        this.userModel.recommendations = this.recommendationEngine.generate(this.userModel);
    }
    
    // Get personalized puzzle recommendation
    getNextPuzzle(availablePuzzles) {
        // Filter puzzles based on user's current skill level
        const targetRating = this.difficultyEngine.getTargetRating(this.userModel);
        const ratingRange = 100;
        
        let candidatePuzzles = availablePuzzles.filter(p => 
            Math.abs(p.rating - targetRating) <= ratingRange
        );
        
        // If user has weaknesses, prioritize those patterns
        if (this.userModel.weaknesses.length > 0) {
            const weaknessPatterns = this.userModel.weaknesses.map(w => w.pattern);
            const weaknessPuzzles = candidatePuzzles.filter(p => {
                const pattern = this.identifyPattern(p);
                return weaknessPatterns.includes(pattern);
            });
            
            if (weaknessPuzzles.length > 0) {
                candidatePuzzles = weaknessPuzzles;
            }
        }
        
        // Apply spaced repetition for previously failed puzzles
        const failedPuzzles = this.getFailedPuzzles();
        const readyForReview = failedPuzzles.filter(p => this.isReadyForReview(p));
        
        if (readyForReview.length > 0 && Math.random() < 0.3) {
            return readyForReview[0];
        }
        
        // Select puzzle with slight randomization
        if (candidatePuzzles.length === 0) {
            candidatePuzzles = availablePuzzles;
        }
        
        return candidatePuzzles[Math.floor(Math.random() * Math.min(5, candidatePuzzles.length))];
    }
    
    getFailedPuzzles() {
        const history = JSON.parse(localStorage.getItem('puzzleHistory') || '[]');
        return history.filter(h => !h.solved && h.attempts < 3);
    }
    
    isReadyForReview(puzzle) {
        const lastAttempt = puzzle.lastAttempt || 0;
        const daysSince = (Date.now() - lastAttempt) / (1000 * 60 * 60 * 24);
        
        // Spaced repetition intervals: 1, 3, 7, 14, 30 days
        const intervals = [1, 3, 7, 14, 30];
        const attemptIndex = Math.min(puzzle.attempts - 1, intervals.length - 1);
        
        return daysSince >= intervals[attemptIndex];
    }
}

// Pattern Recognition Engine
class PatternRecognition {
    constructor() {
        this.patterns = this.initializePatterns();
    }
    
    initializePatterns() {
        return {
            tactical: [
                { name: 'fork', weight: 1.0, complexity: 1 },
                { name: 'pin', weight: 1.2, complexity: 2 },
                { name: 'skewer', weight: 1.3, complexity: 2 },
                { name: 'discovery', weight: 1.5, complexity: 3 },
                { name: 'deflection', weight: 1.6, complexity: 3 },
                { name: 'sacrifice', weight: 1.8, complexity: 4 },
                { name: 'combination', weight: 2.0, complexity: 5 }
            ],
            positional: [
                { name: 'weak_square', weight: 1.0, complexity: 2 },
                { name: 'outpost', weight: 1.2, complexity: 2 },
                { name: 'space', weight: 1.3, complexity: 3 },
                { name: 'piece_activity', weight: 1.4, complexity: 3 },
                { name: 'pawn_structure', weight: 1.5, complexity: 4 }
            ]
        };
    }
    
    analyzePosition(fen) {
        // Simplified pattern detection
        const detectedPatterns = [];
        
        // Check for common tactical patterns
        if (this.hasForkPotential(fen)) {
            detectedPatterns.push('fork');
        }
        if (this.hasPinPotential(fen)) {
            detectedPatterns.push('pin');
        }
        
        return detectedPatterns;
    }
    
    hasForkPotential(fen) {
        // Simplified check - would need actual chess engine integration
        return Math.random() > 0.5;
    }
    
    hasPinPotential(fen) {
        // Simplified check
        return Math.random() > 0.6;
    }
}

// Adaptive Difficulty Engine
class AdaptiveDifficulty {
    constructor() {
        this.historyWindow = 20; // Look at last 20 puzzles
        this.targetSuccessRate = 0.7; // Aim for 70% success rate
    }
    
    getTargetRating(userModel) {
        const recentHistory = this.getRecentHistory();
        const successRate = this.calculateSuccessRate(recentHistory);
        const avgSolveTime = this.calculateAverageTime(recentHistory);
        
        let targetRating = userModel.skillProfile.tactics;
        
        // Adjust based on success rate
        if (successRate > 0.8 && avgSolveTime < 30) {
            targetRating += 50; // Too easy, increase difficulty
        } else if (successRate > 0.75) {
            targetRating += 25;
        } else if (successRate < 0.5) {
            targetRating -= 50; // Too hard, decrease difficulty
        } else if (successRate < 0.6) {
            targetRating -= 25;
        }
        
        // Consider time of day performance
        const currentHour = new Date().getHours();
        const performanceModifier = this.getTimePerformanceModifier(userModel, currentHour);
        targetRating += performanceModifier;
        
        // Consider fatigue (many puzzles in short time)
        const fatigueModifier = this.getFatigueModifier(recentHistory);
        targetRating += fatigueModifier;
        
        return Math.max(800, Math.min(2800, targetRating));
    }
    
    getRecentHistory() {
        const history = JSON.parse(localStorage.getItem('puzzleHistory') || '[]');
        return history.slice(-this.historyWindow);
    }
    
    calculateSuccessRate(history) {
        if (history.length === 0) return 0.7;
        const solved = history.filter(h => h.solved).length;
        return solved / history.length;
    }
    
    calculateAverageTime(history) {
        if (history.length === 0) return 60;
        const totalTime = history.reduce((sum, h) => sum + (h.time || 60), 0);
        return totalTime / history.length;
    }
    
    getTimePerformanceModifier(userModel, hour) {
        // Adjust difficulty based on user's typical performance at this time
        const bestTimeRange = userModel.timeProfile.bestTime.split('-');
        const bestStart = parseInt(bestTimeRange[0].split(':')[0]);
        const bestEnd = parseInt(bestTimeRange[1].split(':')[0]);
        
        if (hour >= bestStart && hour <= bestEnd) {
            return 25; // Slightly harder during peak performance
        }
        
        const worstTimeRange = userModel.timeProfile.worstTime.split('-');
        const worstStart = parseInt(worstTimeRange[0].split(':')[0]);
        const worstEnd = parseInt(worstTimeRange[1].split(':')[0]);
        
        if (hour >= worstStart || hour <= worstEnd) {
            return -25; // Easier during low performance times
        }
        
        return 0;
    }
    
    getFatigueModifier(history) {
        // Check if many puzzles solved recently
        const lastHour = history.filter(h => 
            Date.now() - h.timestamp < 3600000
        );
        
        if (lastHour.length > 20) {
            return -50; // Significant fatigue
        } else if (lastHour.length > 10) {
            return -25; // Some fatigue
        }
        
        return 0;
    }
}

// Weakness Detector
class WeaknessDetector {
    constructor() {
        this.threshold = 0.5; // Below 50% success rate is a weakness
        this.minAttempts = 10; // Need at least 10 attempts to determine
    }
    
    analyze(userModel) {
        const weaknesses = [];
        const strengths = [];
        
        // Analyze patterns
        for (const [pattern, stats] of Object.entries(userModel.patterns)) {
            if (stats.attempts >= this.minAttempts) {
                const successRate = stats.success / stats.attempts;
                
                if (successRate < this.threshold) {
                    weaknesses.push({
                        pattern: pattern,
                        successRate: successRate,
                        avgTime: stats.avgTime,
                        severity: this.getSeverity(successRate),
                        recommendation: this.getRecommendation(pattern, successRate)
                    });
                } else if (successRate > 0.8) {
                    strengths.push({
                        pattern: pattern,
                        successRate: successRate,
                        avgTime: stats.avgTime
                    });
                }
            }
        }
        
        // Analyze skills
        const avgSkill = Object.values(userModel.skillProfile).reduce((a, b) => a + b, 0) / 
                        Object.keys(userModel.skillProfile).length;
        
        for (const [skill, rating] of Object.entries(userModel.skillProfile)) {
            if (rating < avgSkill - 100) {
                weaknesses.push({
                    skill: skill,
                    rating: rating,
                    gap: avgSkill - rating,
                    severity: 'medium',
                    recommendation: `Focus on ${skill} puzzles to improve`
                });
            } else if (rating > avgSkill + 100) {
                strengths.push({
                    skill: skill,
                    rating: rating,
                    advantage: rating - avgSkill
                });
            }
        }
        
        userModel.weaknesses = weaknesses;
        userModel.strengths = strengths;
    }
    
    getSeverity(successRate) {
        if (successRate < 0.3) return 'critical';
        if (successRate < 0.4) return 'high';
        if (successRate < 0.5) return 'medium';
        return 'low';
    }
    
    getRecommendation(pattern, successRate) {
        const recommendations = {
            forks: 'Practice knight movements and multiple attacks',
            pins: 'Focus on linear pieces (bishops, rooks, queens)',
            skewers: 'Study reverse pin patterns',
            discoveries: 'Work on seeing hidden attacks',
            sacrifices: 'Calculate forcing sequences thoroughly',
            mates: 'Study common mating patterns',
            promotions: 'Practice pawn endgames',
            endgames: 'Study theoretical endgame positions'
        };
        
        return recommendations[pattern] || 'Continue practicing this pattern';
    }
}

// Recommendation Engine
class RecommendationEngine {
    generate(userModel) {
        const recommendations = [];
        
        // Based on weaknesses
        if (userModel.weaknesses.length > 0) {
            const topWeakness = userModel.weaknesses[0];
            recommendations.push({
                type: 'weakness',
                priority: 'high',
                title: `Improve ${topWeakness.pattern || topWeakness.skill}`,
                description: topWeakness.recommendation,
                action: `focus:${topWeakness.pattern || topWeakness.skill}`
            });
        }
        
        // Based on learning style
        const styleRecommendations = {
            visual: 'Use board visualization exercises',
            analytical: 'Focus on calculation and variations',
            intuitive: 'Practice pattern recognition',
            systematic: 'Work through structured lesson plans'
        };
        
        recommendations.push({
            type: 'learning',
            priority: 'medium',
            title: 'Learning Style Optimization',
            description: styleRecommendations[userModel.learningStyle],
            action: `style:${userModel.learningStyle}`
        });
        
        // Based on time analysis
        const currentHour = new Date().getHours();
        const bestTimeRange = userModel.timeProfile.bestTime.split('-');
        const bestStart = parseInt(bestTimeRange[0].split(':')[0]);
        
        if (Math.abs(currentHour - bestStart) <= 2) {
            recommendations.push({
                type: 'timing',
                priority: 'low',
                title: 'Peak Performance Time',
                description: 'This is your optimal training time. Try challenging puzzles!',
                action: 'difficulty:increase'
            });
        }
        
        // Spaced repetition reminder
        const failedPuzzles = JSON.parse(localStorage.getItem('failedPuzzles') || '[]');
        if (failedPuzzles.length > 0) {
            recommendations.push({
                type: 'review',
                priority: 'medium',
                title: 'Review Failed Puzzles',
                description: `You have ${failedPuzzles.length} puzzles ready for review`,
                action: 'mode:review'
            });
        }
        
        return recommendations.slice(0, 3); // Return top 3 recommendations
    }
}

// Performance Predictor
class PerformancePredictor {
    constructor() {
        this.model = this.initializeModel();
    }
    
    initializeModel() {
        // Simplified prediction model
        return {
            factors: {
                timeOfDay: 0.15,
                difficulty: 0.25,
                pattern: 0.20,
                streak: 0.10,
                fatigue: 0.15,
                recent: 0.15
            }
        };
    }
    
    predictSuccess(puzzle, userModel) {
        let probability = 0.5; // Base probability
        
        // Factor 1: Rating difference
        const ratingDiff = userModel.skillProfile.tactics - puzzle.rating;
        probability += (ratingDiff / 400) * this.model.factors.difficulty;
        
        // Factor 2: Pattern familiarity
        const pattern = new AIFeatures().identifyPattern(puzzle);
        if (pattern && userModel.patterns[pattern]) {
            const patternSuccess = userModel.patterns[pattern].success / 
                                 (userModel.patterns[pattern].attempts || 1);
            probability += (patternSuccess - 0.5) * this.model.factors.pattern;
        }
        
        // Factor 3: Current streak
        const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
        probability += (currentStreak / 20) * this.model.factors.streak;
        
        // Factor 4: Time of day
        const hour = new Date().getHours();
        const timeModifier = this.getTimeModifier(userModel, hour);
        probability += timeModifier * this.model.factors.timeOfDay;
        
        // Factor 5: Recent performance
        const recentHistory = JSON.parse(localStorage.getItem('recentHistory') || '[]');
        const recentSuccess = recentHistory.filter(h => h.solved).length / (recentHistory.length || 1);
        probability += (recentSuccess - 0.5) * this.model.factors.recent;
        
        // Clamp between 0 and 1
        return Math.max(0.05, Math.min(0.95, probability));
    }
    
    getTimeModifier(userModel, hour) {
        const bestTimeRange = userModel.timeProfile.bestTime.split('-');
        const bestStart = parseInt(bestTimeRange[0].split(':')[0]);
        const bestEnd = parseInt(bestTimeRange[1].split(':')[0]);
        
        if (hour >= bestStart && hour <= bestEnd) {
            return 0.1;
        }
        
        const worstTimeRange = userModel.timeProfile.worstTime.split('-');
        const worstStart = parseInt(worstTimeRange[0].split(':')[0]);
        const worstEnd = parseInt(worstTimeRange[1].split(':')[0]);
        
        if (hour >= worstStart || hour <= worstEnd) {
            return -0.1;
        }
        
        return 0;
    }
    
    predictSolveTime(puzzle, userModel) {
        const pattern = new AIFeatures().identifyPattern(puzzle);
        let baseTime = 60;
        
        if (pattern && userModel.patterns[pattern] && userModel.patterns[pattern].avgTime) {
            baseTime = userModel.patterns[pattern].avgTime;
        }
        
        // Adjust based on rating difference
        const ratingDiff = puzzle.rating - userModel.skillProfile.tactics;
        const timeMultiplier = 1 + (ratingDiff / 400);
        
        return Math.max(5, Math.min(300, baseTime * timeMultiplier));
    }
}

// Export for use
window.AIFeatures = AIFeatures;