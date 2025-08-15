const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbPath = process.env.DATABASE_PATH 
            ? path.resolve(process.env.DATABASE_PATH)
            : path.join(__dirname, 'chess_puzzle_trainer.db');
        
        // Ensure directory exists for Railway persistent volume
        const dbDir = path.dirname(dbPath);
        const fs = require('fs');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Connected to SQLite database at:', dbPath);
                }
                this.createTables();
                // Initialize puzzles after tables are created
                setTimeout(() => this.initializePuzzles(), 1000);
            }
        });
    }

    createTables() {
        const userTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const trainingDataQuery = `
            CREATE TABLE IF NOT EXISTS training_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                rating INTEGER DEFAULT 1200,
                total_puzzles_solved INTEGER DEFAULT 0,
                total_puzzles_failed INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                streak_record INTEGER DEFAULT 0,
                daily_goal INTEGER DEFAULT 10,
                last_training_date DATE,
                total_training_time INTEGER DEFAULT 0,
                preferred_difficulty INTEGER DEFAULT 1,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        const puzzleHistoryQuery = `
            CREATE TABLE IF NOT EXISTS puzzle_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                puzzle_id INTEGER NOT NULL,
                solved BOOLEAN NOT NULL,
                time_spent INTEGER NOT NULL,
                hints_used INTEGER DEFAULT 0,
                attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        const achievementsQuery = `
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_id TEXT NOT NULL,
                earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, achievement_id)
            )
        `;

        const categoryProgressQuery = `
            CREATE TABLE IF NOT EXISTS category_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                solved INTEGER DEFAULT 0,
                attempted INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0.0,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, category)
            )
        `;

        const dailyPuzzleQuery = `
            CREATE TABLE IF NOT EXISTS daily_puzzles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                puzzle_id INTEGER NOT NULL,
                puzzle_date DATE UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const dailyPuzzleAttemptsQuery = `
            CREATE TABLE IF NOT EXISTS daily_puzzle_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                puzzle_date DATE NOT NULL,
                solved BOOLEAN DEFAULT 0,
                time_spent INTEGER,
                attempts INTEGER DEFAULT 1,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, puzzle_date)
            )
        `;

        const puzzlesTableQuery = `
            CREATE TABLE IF NOT EXISTS puzzles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                puzzle_id TEXT UNIQUE,
                fen TEXT NOT NULL,
                moves TEXT NOT NULL,
                rating INTEGER,
                rating_deviation INTEGER,
                popularity INTEGER,
                nb_plays INTEGER,
                themes TEXT,
                game_url TEXT,
                opening_tags TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                active BOOLEAN DEFAULT 1
            )
        `;

        this.db.serialize(() => {
            this.db.run(userTableQuery);
            this.db.run(trainingDataQuery);
            this.db.run(puzzleHistoryQuery);
            this.db.run(achievementsQuery);
            this.db.run(categoryProgressQuery);
            this.db.run(dailyPuzzleQuery);
            this.db.run(dailyPuzzleAttemptsQuery);
            this.db.run(puzzlesTableQuery);
            
            // Create indexes for puzzles table
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating);`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_puzzles_themes ON puzzles(themes);`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_puzzles_active ON puzzles(active);`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_puzzles_rating_active ON puzzles(rating, active);`);
        });
    }

    // User management methods
    async createUser(username, email, password) {
        const db = this.db; // Store reference to db to avoid scope issues
        return new Promise((resolve, reject) => {
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    reject(err);
                    return;
                }

                const query = `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`;
                db.run(query, [username, email, hash], function(err) {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT') {
                            if (err.message.includes('users.email')) {
                                reject(new Error('Email already exists. Please use a different email or login.'));
                            } else if (err.message.includes('users.username')) {
                                reject(new Error('Username already taken. Please choose a different username.'));
                            } else {
                                reject(new Error('Username or email already exists'));
                            }
                        } else {
                            reject(err);
                        }
                        return;
                    }

                    const userId = this.lastID;
                    
                    // Create initial training data
                    const trainingQuery = `INSERT INTO training_data (user_id) VALUES (?)`;
                    db.run(trainingQuery, [userId], (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve({ id: userId, username, email });
                    });
                });
            });
        });
    }

    async authenticateUser(username, password) {
        return new Promise((resolve, reject) => {
            const query = `SELECT id, username, email, password_hash FROM users WHERE username = ?`;
            this.db.get(query, [username], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!row) {
                    reject(new Error('User not found'));
                    return;
                }

                bcrypt.compare(password, row.password_hash, (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (result) {
                        resolve({
                            id: row.id,
                            username: row.username,
                            email: row.email
                        });
                    } else {
                        reject(new Error('Invalid password'));
                    }
                });
            });
        });
    }

    async getUserTrainingData(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM training_data WHERE user_id = ?
            `;
            this.db.get(query, [userId], async (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!row) {
                    // Create default training data if not exists
                    const createQuery = `INSERT INTO training_data (user_id) VALUES (?)`;
                    this.db.run(createQuery, [userId], function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve({
                            rating: 1200,
                            totalPuzzlesSolved: 0,
                            totalPuzzlesFailed: 0,
                            currentStreak: 0,
                            streakRecord: 0,
                            dailyGoal: 10,
                            lastTrainingDate: null,
                            totalTrainingTime: 0,
                            preferredDifficulty: 1,
                            categoryProgress: {},
                            puzzleHistory: [],
                            achievements: []
                        });
                    });
                    return;
                }

                // Get additional data
                const achievements = await this.getUserAchievements(userId);
                const categoryProgress = await this.getCategoryProgress(userId);
                const puzzleHistory = await this.getPuzzleHistory(userId);

                resolve({
                    rating: row.rating,
                    totalPuzzlesSolved: row.total_puzzles_solved,
                    totalPuzzlesFailed: row.total_puzzles_failed,
                    currentStreak: row.current_streak,
                    streakRecord: row.streak_record,
                    dailyGoal: row.daily_goal,
                    lastTrainingDate: row.last_training_date,
                    totalTrainingTime: row.total_training_time,
                    preferredDifficulty: row.preferred_difficulty,
                    categoryProgress,
                    puzzleHistory,
                    achievements
                });
            });
        });
    }

    async updateUserTrainingData(userId, data) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE training_data SET 
                    rating = ?,
                    total_puzzles_solved = ?,
                    total_puzzles_failed = ?,
                    current_streak = ?,
                    streak_record = ?,
                    daily_goal = ?,
                    last_training_date = ?,
                    total_training_time = ?,
                    preferred_difficulty = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;

            this.db.run(query, [
                data.rating,
                data.totalPuzzlesSolved,
                data.totalPuzzlesFailed,
                data.currentStreak,
                data.streakRecord,
                data.dailyGoal,
                data.lastTrainingDate,
                data.totalTrainingTime,
                data.preferredDifficulty,
                userId
            ], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ changes: this.changes });
            });
        });
    }

    async recordPuzzleAttempt(userId, puzzleId, solved, timeSpent, hintsUsed) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO puzzle_history (user_id, puzzle_id, solved, time_spent, hints_used)
                VALUES (?, ?, ?, ?, ?)
            `;

            this.db.run(query, [userId, puzzleId, solved, timeSpent, hintsUsed], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID });
            });
        });
    }

    async getUserAchievements(userId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT achievement_id FROM user_achievements WHERE user_id = ?`;
            this.db.all(query, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows.map(row => row.achievement_id));
            });
        });
    }

    async addUserAchievement(userId, achievementId) {
        return new Promise((resolve, reject) => {
            const query = `INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)`;
            this.db.run(query, [userId, achievementId], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ changes: this.changes });
            });
        });
    }

    async getCategoryProgress(userId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM category_progress WHERE user_id = ?`;
            this.db.all(query, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const progress = {};
                rows.forEach(row => {
                    progress[row.category] = {
                        solved: row.solved,
                        attempted: row.attempted,
                        successRate: row.success_rate
                    };
                });
                resolve(progress);
            });
        });
    }

    async updateCategoryProgress(userId, category, solved, attempted) {
        return new Promise((resolve, reject) => {
            const successRate = attempted > 0 ? (solved / attempted) * 100 : 0;
            const query = `
                INSERT OR REPLACE INTO category_progress (user_id, category, solved, attempted, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `;

            this.db.run(query, [userId, category, solved, attempted, successRate], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ changes: this.changes });
            });
        });
    }

    async getPuzzleHistory(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM puzzle_history 
                WHERE user_id = ? 
                ORDER BY attempt_date DESC 
                LIMIT ?
            `;
            this.db.all(query, [userId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getLeaderboard(limit = 10, timeframe = 'all') {
        return new Promise((resolve, reject) => {
            let query;
            
            if (timeframe === 'all') {
                query = `
                    SELECT u.username, t.rating, t.total_puzzles_solved, t.streak_record, t.updated_at
                    FROM users u
                    INNER JOIN training_data t ON u.id = t.user_id
                    ORDER BY t.rating DESC
                    LIMIT ?
                `;
            } else if (timeframe === 'weekly') {
                query = `
                    SELECT u.username, t.rating, t.total_puzzles_solved, t.streak_record, t.updated_at
                    FROM users u
                    INNER JOIN training_data t ON u.id = t.user_id
                    WHERE t.updated_at >= datetime('now', '-7 days')
                    ORDER BY t.rating DESC
                    LIMIT ?
                `;
            } else if (timeframe === 'monthly') {
                query = `
                    SELECT u.username, t.rating, t.total_puzzles_solved, t.streak_record, t.updated_at
                    FROM users u
                    INNER JOIN training_data t ON u.id = t.user_id
                    WHERE t.updated_at >= datetime('now', '-30 days')
                    ORDER BY t.rating DESC
                    LIMIT ?
                `;
            } else if (timeframe === 'daily') {
                query = `
                    SELECT u.username, COUNT(ph.id) as puzzles_today, SUM(ph.solved) as solved_today
                    FROM users u
                    LEFT JOIN puzzle_history ph ON u.id = ph.user_id
                    WHERE DATE(ph.attempt_date) = DATE('now')
                    GROUP BY u.id
                    ORDER BY solved_today DESC, puzzles_today DESC
                    LIMIT ?
                `;
            }

            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getUserRank(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) + 1 as rank
                FROM training_data
                WHERE rating > (SELECT rating FROM training_data WHERE user_id = ?)
            `;
            
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row ? row.rank : null);
            });
        });
    }

    // Daily Puzzle Methods
    async getDailyPuzzle(date = null) {
        return new Promise((resolve, reject) => {
            const puzzleDate = date || new Date().toISOString().split('T')[0];
            
            // Check if daily puzzle exists for this date
            const query = `SELECT puzzle_id FROM daily_puzzles WHERE puzzle_date = ?`;
            
            this.db.get(query, [puzzleDate], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row) {
                    resolve(row.puzzle_id);
                } else {
                    // Generate a new daily puzzle
                    this.generateDailyPuzzle(puzzleDate).then(resolve).catch(reject);
                }
            });
        });
    }

    async generateDailyPuzzle(date) {
        return new Promise((resolve, reject) => {
            // Use date as seed for consistent puzzle selection
            const dateNum = parseInt(date.replace(/-/g, ''));
            const puzzleId = (dateNum % 220) + 1; // We have 220 puzzles
            
            const query = `INSERT INTO daily_puzzles (puzzle_id, puzzle_date) VALUES (?, ?)`;
            
            this.db.run(query, [puzzleId, date], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(puzzleId);
            });
        });
    }

    async recordDailyPuzzleAttempt(userId, date, solved, timeSpent) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO daily_puzzle_attempts (user_id, puzzle_date, solved, time_spent, attempts)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(user_id, puzzle_date) 
                DO UPDATE SET 
                    solved = CASE WHEN solved = 1 THEN 1 ELSE ? END,
                    time_spent = CASE WHEN solved = 1 THEN time_spent ELSE ? END,
                    attempts = attempts + 1,
                    completed_at = CURRENT_TIMESTAMP
            `;
            
            this.db.run(query, [userId, date, solved, timeSpent, solved, timeSpent], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ success: true });
            });
        });
    }

    async getUserDailyPuzzleStatus(userId, date = null) {
        return new Promise((resolve, reject) => {
            const puzzleDate = date || new Date().toISOString().split('T')[0];
            const query = `
                SELECT solved, attempts, time_spent 
                FROM daily_puzzle_attempts 
                WHERE user_id = ? AND puzzle_date = ?
            `;
            
            this.db.get(query, [userId, puzzleDate], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row || { solved: false, attempts: 0, time_spent: null });
            });
        });
    }

    async getDailyPuzzleStats() {
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            const query = `
                SELECT 
                    COUNT(DISTINCT user_id) as total_attempts,
                    SUM(solved) as total_solved,
                    AVG(time_spent) as avg_time,
                    MIN(time_spent) as best_time
                FROM daily_puzzle_attempts
                WHERE puzzle_date = ?
            `;
            
            this.db.get(query, [today], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Puzzle Management Methods
    async getPuzzlesByRating(minRating = 800, maxRating = 2000, limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM puzzles 
                WHERE rating >= ? AND rating <= ? AND active = 1
                ORDER BY rating ASC
                LIMIT ? OFFSET ?
            `;
            
            this.db.all(query, [minRating, maxRating, limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getPuzzlesByThemes(themes, limit = 50, minRating = null, maxRating = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT * FROM puzzles 
                WHERE active = 1
            `;
            let params = [];
            
            // Add theme filters (exact word matches)
            if (themes && themes.length > 0) {
                const themeConditions = themes.map(() => 
                    '(themes = ? OR themes LIKE ? OR themes LIKE ? OR themes LIKE ?)'
                ).join(' OR ');
                query += ` AND (${themeConditions})`;
                
                // For each theme, add patterns for: exact match, start of string, middle of string, end of string
                themes.forEach(theme => {
                    params.push(theme);                    // exact match
                    params.push(`${theme} %`);             // at start
                    params.push(`% ${theme} %`);           // in middle  
                    params.push(`% ${theme}`);             // at end
                });
            }
            
            // Add rating filters
            if (minRating !== null) {
                query += ` AND rating >= ?`;
                params.push(minRating);
            }
            if (maxRating !== null) {
                query += ` AND rating <= ?`;
                params.push(maxRating);
            }
            
            query += ` ORDER BY rating ASC LIMIT ?`;
            params.push(limit);
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async addPuzzle(puzzleData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR IGNORE INTO puzzles (puzzle_id, fen, moves, rating, rating_deviation, popularity, nb_plays, themes, game_url, opening_tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                puzzleData.puzzle_id || puzzleData.id,
                puzzleData.fen,
                Array.isArray(puzzleData.moves) ? puzzleData.moves.join(' ') : puzzleData.moves,
                puzzleData.rating || 1500,
                puzzleData.rating_deviation || 150,
                puzzleData.popularity || 90,
                puzzleData.nb_plays || 1000,
                puzzleData.themes || (Array.isArray(puzzleData.theme) ? puzzleData.theme.join(' ') : 'tactics'),
                puzzleData.game_url || '',
                puzzleData.opening_tags || ''
            ], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.lastID);
            });
        });
    }

    async initializePuzzles() {
        return new Promise((resolve, reject) => {
            // Check if puzzles already exist
            this.db.get('SELECT COUNT(*) as count FROM puzzles', [], async (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row.count > 0) {
                    console.log(`Database already has ${row.count} puzzles`);
                    resolve(row.count);
                    return;
                }

                // Import puzzles from matesIn2Database
                try {
                    const matesIn2Database = require('./matesIn2Database.js');
                    console.log(`Importing ${matesIn2Database.length} mate-in-2 puzzles...`);
                    
                    for (const puzzle of matesIn2Database) {
                        await this.addPuzzle(puzzle);
                    }
                    
                    console.log(`Successfully imported ${matesIn2Database.length} puzzles`);
                    resolve(matesIn2Database.length);
                } catch (error) {
                    console.error('Failed to import puzzles:', error);
                    reject(error);
                }
            });
        });
    }

    async getRandomPuzzle(minRating = null, maxRating = null, themes = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT * FROM puzzles 
                WHERE active = 1
            `;
            let params = [];
            
            // Add rating filters
            if (minRating !== null) {
                query += ` AND rating >= ?`;
                params.push(minRating);
            }
            if (maxRating !== null) {
                query += ` AND rating <= ?`;
                params.push(maxRating);
            }
            
            // Add theme filters (exact word matches)
            if (themes && themes.length > 0) {
                const themeConditions = themes.map(() => 
                    '(themes = ? OR themes LIKE ? OR themes LIKE ? OR themes LIKE ?)'
                ).join(' OR ');
                query += ` AND (${themeConditions})`;
                
                // For each theme, add patterns for: exact match, start of string, middle of string, end of string
                themes.forEach(theme => {
                    params.push(theme);                    // exact match
                    params.push(`${theme} %`);             // at start
                    params.push(`% ${theme} %`);           // in middle  
                    params.push(`% ${theme}`);             // at end
                });
            }
            
            query += ` ORDER BY RANDOM() LIMIT 1`;
            
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async getPuzzleById(puzzleId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM puzzles WHERE puzzle_id = ? AND active = 1`;
            
            this.db.get(query, [puzzleId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async getPuzzleStats() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    MIN(rating) as min_rating,
                    MAX(rating) as max_rating,
                    AVG(rating) as avg_rating,
                    COUNT(DISTINCT themes) as unique_themes
                FROM puzzles 
                WHERE active = 1
            `;
            
            this.db.get(query, [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async searchPuzzles(searchTerm, limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM puzzles 
                WHERE active = 1 AND (
                    themes LIKE ? OR 
                    opening_tags LIKE ? OR
                    puzzle_id LIKE ?
                )
                ORDER BY rating ASC
                LIMIT ?
            `;
            
            const searchPattern = `%${searchTerm}%`;
            
            this.db.all(query, [searchPattern, searchPattern, searchPattern, limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getUserPuzzleProgress(userId, puzzleId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) as attempts, MAX(solved) as best_result, MIN(time_spent) as best_time
                FROM puzzle_history 
                WHERE user_id = ? AND puzzle_id = ?
            `;
            
            this.db.get(query, [userId, puzzleId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row || { attempts: 0, best_result: 0, best_time: null });
            });
        });
    }

    // Generic query method for advanced operations
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;