// Puzzle Importer for Large CSV Database
const fs = require('fs');
const csv = require('csv-parser');
const Database = require('./database');

class PuzzleImporter {
    constructor() {
        this.db = new Database();
        this.batchSize = 1000; // Import 1000 puzzles at a time
        this.currentBatch = [];
    }

    async createPuzzlesTable() {
        const createTableQuery = `
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
            );
        `;

        const indexQueries = [
            `CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating);`,
            `CREATE INDEX IF NOT EXISTS idx_puzzles_themes ON puzzles(themes);`,
            `CREATE INDEX IF NOT EXISTS idx_puzzles_active ON puzzles(active);`,
            `CREATE INDEX IF NOT EXISTS idx_puzzles_rating_active ON puzzles(rating, active);`
        ];

        try {
            await this.db.query(createTableQuery);
            for (const indexQuery of indexQueries) {
                await this.db.query(indexQuery);
            }
            console.log('✅ Puzzles table and indexes created');
        } catch (error) {
            console.error('❌ Error creating puzzles table:', error);
        }
    }

    async importCSVFile(filePath, options = {}) {
        const {
            minRating = 800,
            maxRating = 2000,
            maxPuzzles = 10000,
            themes = null
        } = options;

        console.log(`📥 Starting import from ${filePath}`);
        console.log(`📊 Rating range: ${minRating}-${maxRating}`);
        console.log(`📈 Max puzzles: ${maxPuzzles}`);

        let processed = 0;
        let imported = 0;
        let skipped = 0;

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', async (row) => {
                    processed++;
                    
                    // Stop if we've imported enough
                    if (imported >= maxPuzzles) {
                        resolve({ processed, imported, skipped });
                        return;
                    }

                    // Apply filters
                    const rating = parseInt(row.Rating) || 0;
                    if (rating < minRating || rating > maxRating) {
                        skipped++;
                        return;
                    }

                    // Filter by themes if specified
                    if (themes && !this.hasMatchingTheme(row.Themes, themes)) {
                        skipped++;
                        return;
                    }

                    // Add to batch
                    this.currentBatch.push({
                        puzzle_id: row.PuzzleId || `puzzle_${Date.now()}_${Math.random()}`,
                        fen: row.FEN,
                        moves: row.Moves,
                        rating: rating,
                        rating_deviation: parseInt(row.RatingDeviation) || 0,
                        popularity: parseInt(row.Popularity) || 0,
                        nb_plays: parseInt(row.NbPlays) || 0,
                        themes: row.Themes || '',
                        game_url: row.GameUrl || '',
                        opening_tags: row.OpeningTags || ''
                    });

                    // Import batch when full
                    if (this.currentBatch.length >= this.batchSize) {
                        try {
                            await this.importBatch();
                            imported += this.currentBatch.length;
                            this.currentBatch = [];
                            
                            if (imported % 5000 === 0) {
                                console.log(`📊 Progress: ${imported} puzzles imported`);
                            }
                        } catch (error) {
                            console.error('❌ Batch import error:', error);
                        }
                    }
                })
                .on('end', async () => {
                    // Import remaining puzzles
                    if (this.currentBatch.length > 0) {
                        try {
                            await this.importBatch();
                            imported += this.currentBatch.length;
                        } catch (error) {
                            console.error('❌ Final batch import error:', error);
                        }
                    }
                    
                    console.log(`✅ Import complete!`);
                    console.log(`📊 Total processed: ${processed}`);
                    console.log(`✅ Total imported: ${imported}`);
                    console.log(`⏭️  Total skipped: ${skipped}`);
                    
                    resolve({ processed, imported, skipped });
                })
                .on('error', (error) => {
                    console.error('❌ CSV parsing error:', error);
                    reject(error);
                });
        });
    }

    async importBatch() {
        const placeholders = this.currentBatch.map(() => 
            '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).join(', ');

        const query = `
            INSERT OR IGNORE INTO puzzles 
            (puzzle_id, fen, moves, rating, rating_deviation, popularity, nb_plays, themes, game_url, opening_tags)
            VALUES ${placeholders}
        `;

        const values = this.currentBatch.flatMap(puzzle => [
            puzzle.puzzle_id,
            puzzle.fen,
            puzzle.moves,
            puzzle.rating,
            puzzle.rating_deviation,
            puzzle.popularity,
            puzzle.nb_plays,
            puzzle.themes,
            puzzle.game_url,
            puzzle.opening_tags
        ]);

        return this.db.query(query, values);
    }

    hasMatchingTheme(puzzleThemes, targetThemes) {
        if (!puzzleThemes || !targetThemes) return true;
        
        const themes = puzzleThemes.toLowerCase().split(' ');
        return targetThemes.some(theme => 
            themes.includes(theme.toLowerCase())
        );
    }

    async getImportStats() {
        const stats = await this.db.query(`
            SELECT 
                COUNT(*) as total,
                MIN(rating) as min_rating,
                MAX(rating) as max_rating,
                AVG(rating) as avg_rating,
                COUNT(DISTINCT themes) as unique_themes
            FROM puzzles 
            WHERE active = 1
        `);
        
        return stats[0];
    }
}

module.exports = PuzzleImporter;