# Chess Puzzle Import System

A comprehensive system for importing and managing large puzzle databases with progressive loading and filtering capabilities.

## 🎯 Overview

This system allows you to:
- Import millions of puzzles from compressed CSV files (.csv.zst)
- Filter puzzles by rating, themes, and difficulty
- Progressive loading to avoid memory issues
- Batch processing for optimal performance
- Database indexing for fast queries

## 📦 Setup

### Prerequisites

1. **Install zstd** (for decompressing .zst files):
   ```bash
   # macOS
   brew install zstd
   
   # Ubuntu/Debian
   sudo apt-get install zstd
   
   # Windows
   # Download from: https://github.com/facebook/zstd
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install csv-parser
   ```

## 🚀 Quick Start

### 1. Analyze Your Puzzle File

First, analyze your CSV structure without importing:

```bash
node import_puzzles.js analyze your_puzzles.csv.zst
```

This will show:
- CSV headers and structure
- Rating distribution
- Sample puzzle data
- Total puzzle count (estimated)

### 2. Start with Small Imports

Begin with a small batch to test the system:

```bash
# Import 1000 beginner puzzles
node import_puzzles.js import your_puzzles.csv.zst --max-puzzles 1000 --min-rating 800 --max-rating 1200
```

### 3. Progressive Import Strategy

Import puzzles progressively by rating ranges:

```bash
# Stage 1: Beginner puzzles (800-1200)
node import_puzzles.js import your_puzzles.csv.zst --min-rating 800 --max-rating 1200 --max-puzzles 10000

# Stage 2: Intermediate puzzles (1200-1600)  
node import_puzzles.js import your_puzzles.csv.zst --min-rating 1200 --max-rating 1600 --max-puzzles 10000

# Stage 3: Advanced puzzles (1600-2000)
node import_puzzles.js import your_puzzles.csv.zst --min-rating 1600 --max-rating 2000 --max-puzzles 10000

# Stage 4: Expert puzzles (2000+)
node import_puzzles.js import your_puzzles.csv.zst --min-rating 2000 --max-rating 3000 --max-puzzles 5000
```

### 4. Filter by Themes

Import specific puzzle types:

```bash
# Import tactical puzzles
node import_puzzles.js import your_puzzles.csv.zst --themes "fork,pin,skewer" --max-puzzles 5000

# Import endgame puzzles
node import_puzzles.js import your_puzzles.csv.zst --themes "endgame,mateIn2,mateIn3" --max-puzzles 3000
```

## 📊 Monitoring and Statistics

### Check Import Progress

```bash
# Show current database statistics
node import_puzzles.js stats
```

### Example Output:
```
📊 Database Statistics:
   Total puzzles: 25,000
   Rating range: 800 - 2400
   Average rating: 1456
   Unique themes: 45
```

## 🛠️ Advanced Usage

### Custom Import Options

```bash
node import_puzzles.js import puzzles.csv.zst \
  --min-rating 1000 \
  --max-rating 1800 \
  --max-puzzles 15000 \
  --themes "tactics,middlegame"
```

### Available Options:
- `--min-rating <number>`: Minimum puzzle rating (default: 800)
- `--max-rating <number>`: Maximum puzzle rating (default: 2000)
- `--max-puzzles <number>`: Maximum puzzles to import (default: 10000)
- `--themes <theme1,theme2>`: Filter by specific themes

## 🏗️ System Architecture

### Database Schema

```sql
CREATE TABLE puzzles (
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
```

### Performance Optimizations

1. **Batch Processing**: Imports 1000 puzzles at a time
2. **Database Indexes**: Optimized for rating and theme queries
3. **Memory Management**: Streaming CSV parsing prevents memory overflow
4. **Progressive Loading**: Start with easier puzzles first

## 📋 Expected CSV Format

Your puzzle CSV should have these columns:
- `PuzzleId`: Unique identifier
- `FEN`: Chess position in FEN notation
- `Moves`: Solution moves (space-separated)
- `Rating`: Puzzle difficulty rating
- `RatingDeviation`: Rating accuracy
- `Popularity`: Puzzle popularity score
- `NbPlays`: Number of times played
- `Themes`: Space-separated themes (e.g., "fork pin tactics")
- `GameUrl`: Original game URL (optional)
- `OpeningTags`: Opening information (optional)

## 🎮 Integration with Trainer

Once puzzles are imported, the trainer will automatically use the new database:

### Rating-Based Selection
```javascript
// Get puzzles by difficulty
const easyPuzzles = await db.getPuzzlesByRating(800, 1200, 50);
const hardPuzzles = await db.getPuzzlesByRating(1800, 2200, 50);
```

### Theme-Based Selection
```javascript
// Get tactical puzzles
const tacticalPuzzles = await db.getPuzzlesByThemes(['fork', 'pin', 'skewer'], 30, 1000, 1600);
```

### Random Selection
```javascript
// Get random puzzle in rating range
const randomPuzzle = await db.getRandomPuzzle(1200, 1600);
```

## 🧪 Testing the System

Run the demo to test with current puzzles:

```bash
node demo_import.js
```

This will:
1. Convert existing 220 puzzles to CSV format
2. Import them into the database
3. Test retrieval functions
4. Show statistics
5. Clean up demo files

## ⚠️ Important Notes

### For 246MB File (5M Puzzles)

1. **Start Small**: Begin with 1000-10000 puzzles to test the system
2. **Monitor Performance**: Check database size and query speed
3. **Disk Space**: Ensure adequate disk space (estimate 2-3x file size)
4. **Progressive Import**: Import in stages by rating ranges
5. **Backup**: Keep backups of your database during large imports

### Storage Estimates
- **1,000 puzzles**: ~2MB database
- **10,000 puzzles**: ~20MB database  
- **100,000 puzzles**: ~200MB database
- **1,000,000 puzzles**: ~2GB database
- **5,000,000 puzzles**: ~10GB database

## 🚨 Troubleshooting

### Common Issues

1. **"zstd not found"**: Install zstd compression tool
2. **"csv-parser not found"**: Run `npm install csv-parser`
3. **Memory issues**: Reduce `--max-puzzles` batch size
4. **Slow imports**: Ensure SSD storage and sufficient RAM
5. **Database locked**: Close other applications using the database

### Performance Tips

1. Use SSD storage for better performance
2. Import during low system usage
3. Monitor disk space continuously
4. Consider multiple smaller imports vs. one large import
5. Test with small batches first

## 📈 Recommended Import Strategy

For your 5M puzzle database:

```bash
# Week 1: Foundation (20K puzzles)
node import_puzzles.js import puzzles.csv.zst --min-rating 800 --max-rating 1400 --max-puzzles 20000

# Week 2: Intermediate (15K puzzles)  
node import_puzzles.js import puzzles.csv.zst --min-rating 1400 --max-rating 1800 --max-puzzles 15000

# Week 3: Advanced (10K puzzles)
node import_puzzles.js import puzzles.csv.zst --min-rating 1800 --max-rating 2200 --max-puzzles 10000

# Week 4: Expert (5K puzzles)
node import_puzzles.js import puzzles.csv.zst --min-rating 2200 --max-rating 3000 --max-puzzles 5000
```

This gives you 50,000 carefully curated puzzles covering all skill levels, which should provide excellent training variety while maintaining fast performance.

## 🔧 API Integration

The imported puzzles integrate seamlessly with the existing trainer through new database methods:

- `getPuzzlesByRating(min, max, limit)`
- `getPuzzlesByThemes(themes, limit, minRating, maxRating)`
- `getRandomPuzzle(minRating, maxRating, themes)`
- `searchPuzzles(searchTerm, limit)`
- `getPuzzleStats()`

Your chess trainer now has access to millions of puzzles with intelligent filtering and selection!