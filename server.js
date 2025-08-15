const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Initialize database
const db = new Database();

// CORS configuration
const corsOptions = {
    origin: isDevelopment 
        ? true // Allow all origins in development
        : process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',')
            : true, // Allow all origins by default (configure ALLOWED_ORIGINS in production)
    credentials: true,
    optionsSuccessStatus: 200
};

// Rate limiting configuration
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve specific routes BEFORE static middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/trainer', (req, res) => {
    // Check if mode is specified (coming from landing page)
    if (!req.query.mode) {
        // Redirect to landing page if accessing trainer directly
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'trainer.html'));
});

app.get('/browse', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Static files middleware (after specific routes)
app.use(express.static('.'));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Authentication API endpoints with stricter rate limiting
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const user = await db.createUser(username, email, password);
        const trainingData = await db.getUserTrainingData(user.id);

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                trainingData
            }
        });
    } catch (error) {
        if (isDevelopment) console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await db.authenticateUser(username, password);
        const trainingData = await db.getUserTrainingData(user.id);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                trainingData
            }
        });
    } catch (error) {
        if (isDevelopment) console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// Training data API endpoints
app.get('/api/user/:userId/training-data', async (req, res) => {
    try {
        const { userId } = req.params;
        const trainingData = await db.getUserTrainingData(parseInt(userId));
        res.json({ success: true, trainingData });
    } catch (error) {
        if (isDevelopment) console.error('Get training data error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/user/:userId/training-data', async (req, res) => {
    try {
        const { userId } = req.params;
        const trainingData = req.body;

        await db.updateUserTrainingData(parseInt(userId), trainingData);
        
        // Update category progress if provided
        if (trainingData.categoryProgress) {
            for (const [category, progress] of Object.entries(trainingData.categoryProgress)) {
                await db.updateCategoryProgress(
                    parseInt(userId), 
                    category, 
                    progress.solved || 0, 
                    progress.attempted || 0
                );
            }
        }

        // Add new achievements if provided
        if (trainingData.achievements) {
            for (const achievementId of trainingData.achievements) {
                await db.addUserAchievement(parseInt(userId), achievementId);
            }
        }

        res.json({ success: true });
    } catch (error) {
        if (isDevelopment) console.error('Update training data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Puzzle attempt tracking
app.post('/api/user/:userId/puzzle-attempt', async (req, res) => {
    try {
        const { userId } = req.params;
        const { puzzleId, solved, timeSpent, hintsUsed } = req.body;

        const result = await db.recordPuzzleAttempt(
            parseInt(userId),
            puzzleId,
            solved,
            timeSpent,
            hintsUsed
        );

        res.json({ success: true, attemptId: result.id });
    } catch (error) {
        if (isDevelopment) console.error('Record puzzle attempt error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get puzzle history
app.get('/api/user/:userId/puzzle-history', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        
        const history = await db.getPuzzleHistory(parseInt(userId), limit);
        res.json({ success: true, history });
    } catch (error) {
        if (isDevelopment) console.error('Get puzzle history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Achievement endpoints
app.post('/api/user/:userId/achievement', async (req, res) => {
    try {
        const { userId } = req.params;
        const { achievementId } = req.body;

        await db.addUserAchievement(parseInt(userId), achievementId);
        res.json({ success: true });
    } catch (error) {
        if (isDevelopment) console.error('Add achievement error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/user/:userId/achievements', async (req, res) => {
    try {
        const { userId } = req.params;
        const achievements = await db.getUserAchievements(parseInt(userId));
        res.json({ success: true, achievements });
    } catch (error) {
        if (isDevelopment) console.error('Get achievements error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Leaderboard endpoints
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const timeframe = req.query.timeframe || 'all';
        
        const leaderboard = await db.getLeaderboard(limit, timeframe);
        res.json({ success: true, leaderboard });
    } catch (error) {
        if (isDevelopment) console.error('Get leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/user/:userId/rank', async (req, res) => {
    try {
        const { userId } = req.params;
        const rank = await db.getUserRank(parseInt(userId));
        res.json({ success: true, rank });
    } catch (error) {
        if (isDevelopment) console.error('Get user rank error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Daily Puzzle endpoints
app.get('/api/daily-puzzle', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const puzzleId = await db.getDailyPuzzle(date);
        
        // Get user status if userId provided
        let userStatus = null;
        if (req.query.userId) {
            userStatus = await db.getUserDailyPuzzleStatus(parseInt(req.query.userId), date);
        }
        
        // Get overall stats
        const stats = await db.getDailyPuzzleStats();
        
        res.json({ 
            success: true, 
            puzzleId,
            date,
            userStatus,
            stats
        });
    } catch (error) {
        if (isDevelopment) console.error('Get daily puzzle error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/daily-puzzle/attempt', async (req, res) => {
    try {
        const { userId, date, solved, timeSpent } = req.body;
        
        await db.recordDailyPuzzleAttempt(
            parseInt(userId),
            date || new Date().toISOString().split('T')[0],
            solved,
            timeSpent
        );
        
        res.json({ success: true });
    } catch (error) {
        if (isDevelopment) console.error('Record daily puzzle attempt error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Puzzle management endpoints
app.get('/api/puzzles/stats', async (req, res) => {
    try {
        const stats = await db.getPuzzleStats();
        res.json({ success: true, stats });
    } catch (error) {
        if (isDevelopment) console.error('Get puzzle stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/puzzles/recent', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const puzzles = await db.getPuzzlesByRating(0, 3000, limit);
        res.json({ success: true, puzzles });
    } catch (error) {
        if (isDevelopment) console.error('Get recent puzzles error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/puzzles/random', async (req, res) => {
    try {
        const minRating = req.query.minRating ? parseInt(req.query.minRating) : null;
        const maxRating = req.query.maxRating ? parseInt(req.query.maxRating) : null;
        const themes = req.query.themes ? req.query.themes.split(',') : null;
        
        const puzzle = await db.getRandomPuzzle(minRating, maxRating, themes);
        res.json({ success: true, puzzle });
    } catch (error) {
        if (isDevelopment) console.error('Get random puzzle error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/puzzles/count', async (req, res) => {
    try {
        const minRating = req.query.minRating ? parseInt(req.query.minRating) : 0;
        const maxRating = req.query.maxRating ? parseInt(req.query.maxRating) : 3000;
        const themes = req.query.themes ? req.query.themes.split(',') : null;
        
        let puzzles;
        if (themes && themes.length > 0) {
            puzzles = await db.getPuzzlesByThemes(themes, 999999, minRating, maxRating);
        } else {
            puzzles = await db.getPuzzlesByRating(minRating, maxRating, 999999);
        }
        
        res.json({ success: true, count: puzzles.length });
    } catch (error) {
        if (isDevelopment) console.error('Get puzzle count error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/puzzles/themes', async (req, res) => {
    try {
        const puzzles = await db.getPuzzlesByRating(0, 3000, 9999);
        const themeCounts = {};
        
        puzzles.forEach(puzzle => {
            if (puzzle.themes) {
                const themes = puzzle.themes.split(' ').filter(t => t.trim().length > 0);
                themes.forEach(theme => {
                    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
                });
            }
        });
        
        // Sort themes by frequency
        const sortedThemes = Object.entries(themeCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([theme, count]) => ({ theme, count }));
        
        res.json({ success: true, themes: sortedThemes, total: puzzles.length });
    } catch (error) {
        if (isDevelopment) console.error('Get themes error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (isDevelopment) console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});

app.listen(PORT, () => {
    if (isDevelopment) {
        console.log(`Chess Puzzle Trainer server running on http://localhost:${PORT}`);
        console.log(`Trainer interface: http://localhost:${PORT}/trainer`);
    } else {
        console.log(`Server running on port ${PORT}`);
    }
});

module.exports = app;