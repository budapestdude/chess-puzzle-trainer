#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PuzzleImporter = require('./puzzle_importer');

class PuzzleImportManager {
    constructor() {
        this.importer = new PuzzleImporter();
        this.tempDir = path.join(__dirname, 'temp');
    }

    async initialize() {
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir);
        }

        // Initialize database and create puzzles table
        console.log('🗄️  Initializing database...');
        await this.importer.createPuzzlesTable();
    }

    checkDependencies() {
        console.log('🔍 Checking dependencies...');
        
        // Check for zstd
        try {
            execSync('which zstd', { stdio: 'pipe' });
            console.log('✅ zstd found');
        } catch (error) {
            console.log('❌ zstd not found. Installing...');
            console.log('Please install zstd:');
            console.log('  macOS: brew install zstd');
            console.log('  Ubuntu: sudo apt-get install zstd');
            console.log('  Windows: Download from https://github.com/facebook/zstd');
            return false;
        }

        // Check for csv-parser
        try {
            require.resolve('csv-parser');
            console.log('✅ csv-parser found');
        } catch (error) {
            console.log('❌ csv-parser not found. Installing...');
            try {
                execSync('npm install csv-parser', { stdio: 'inherit' });
                console.log('✅ csv-parser installed');
            } catch (installError) {
                console.log('❌ Failed to install csv-parser:', installError.message);
                return false;
            }
        }

        return true;
    }

    async decompressFile(zstFilePath) {
        const csvPath = path.join(this.tempDir, 'puzzles.csv');
        
        console.log(`📦 Decompressing ${zstFilePath}...`);
        console.log(`📄 Output: ${csvPath}`);
        
        try {
            // Use zstd to decompress
            execSync(`zstd -d "${zstFilePath}" -o "${csvPath}"`, { stdio: 'inherit' });
            console.log('✅ Decompression complete');
            return csvPath;
        } catch (error) {
            console.error('❌ Decompression failed:', error.message);
            throw error;
        }
    }

    async analyzeCSV(csvPath) {
        console.log('🔬 Analyzing CSV structure...');
        
        const fs = require('fs');
        const csv = require('csv-parser');
        
        return new Promise((resolve, reject) => {
            let lineCount = 0;
            let headers = null;
            let sampleRows = [];
            let ratings = [];

            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('headers', (headerList) => {
                    headers = headerList;
                    console.log('📊 CSV Headers:', headers);
                })
                .on('data', (row) => {
                    lineCount++;
                    
                    if (sampleRows.length < 5) {
                        sampleRows.push(row);
                    }
                    
                    if (lineCount <= 1000 && row.Rating) {
                        const rating = parseInt(row.Rating);
                        if (!isNaN(rating)) {
                            ratings.push(rating);
                        }
                    }
                    
                    if (lineCount >= 1000) {
                        // Stop after analyzing first 1000 rows
                        resolve({
                            headers,
                            totalLines: '1000+ (partial count)',
                            sampleRows,
                            ratingRange: {
                                min: Math.min(...ratings),
                                max: Math.max(...ratings),
                                avg: Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
                            }
                        });
                    }
                })
                .on('end', () => {
                    resolve({
                        headers,
                        totalLines: lineCount,
                        sampleRows,
                        ratingRange: ratings.length > 0 ? {
                            min: Math.min(...ratings),
                            max: Math.max(...ratings),
                            avg: Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
                        } : null
                    });
                })
                .on('error', reject);
        });
    }

    async importBatch(csvPath, options = {}) {
        console.log('🚀 Starting puzzle import...');
        
        const result = await this.importer.importCSVFile(csvPath, options);
        
        console.log('📈 Import Statistics:');
        console.log(`   Processed: ${result.processed.toLocaleString()}`);
        console.log(`   Imported: ${result.imported.toLocaleString()}`);
        console.log(`   Skipped: ${result.skipped.toLocaleString()}`);
        
        return result;
    }

    async getImportStats() {
        const stats = await this.importer.getImportStats();
        console.log('📊 Database Statistics:');
        console.log(`   Total puzzles: ${stats.total?.toLocaleString() || 0}`);
        console.log(`   Rating range: ${stats.min_rating || 'N/A'} - ${stats.max_rating || 'N/A'}`);
        console.log(`   Average rating: ${Math.round(stats.avg_rating) || 'N/A'}`);
        console.log(`   Unique themes: ${stats.unique_themes || 0}`);
        return stats;
    }

    cleanup() {
        // Clean up temp files
        if (fs.existsSync(this.tempDir)) {
            const files = fs.readdirSync(this.tempDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(this.tempDir, file));
            });
            fs.rmdirSync(this.tempDir);
            console.log('🧹 Temporary files cleaned up');
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const manager = new PuzzleImportManager();

    if (args.length === 0) {
        console.log(`
🧩 Chess Puzzle Import Tool

Usage:
  node import_puzzles.js <command> [options]

Commands:
  analyze <file.csv.zst>                 - Analyze CSV structure without importing
  import <file.csv.zst> [options]        - Import puzzles from compressed CSV
  stats                                  - Show current database statistics
  
Import Options:
  --min-rating <number>     Default: 800
  --max-rating <number>     Default: 2000  
  --max-puzzles <number>    Default: 10000
  --themes <theme1,theme2>  Filter by themes

Examples:
  node import_puzzles.js analyze puzzles.csv.zst
  node import_puzzles.js import puzzles.csv.zst --max-puzzles 1000
  node import_puzzles.js import puzzles.csv.zst --min-rating 1200 --max-rating 1600
  node import_puzzles.js stats
        `);
        return;
    }

    const command = args[0];

    try {
        await manager.initialize();

        switch (command) {
            case 'analyze':
                if (!args[1]) {
                    console.error('❌ Please provide a .csv.zst file to analyze');
                    return;
                }
                
                if (!manager.checkDependencies()) return;
                
                const csvPath = await manager.decompressFile(args[1]);
                const analysis = await manager.analyzeCSV(csvPath);
                
                console.log('\n📋 Analysis Results:');
                console.log(`   Headers: ${analysis.headers?.join(', ')}`);
                console.log(`   Total lines: ${analysis.totalLines}`);
                if (analysis.ratingRange) {
                    console.log(`   Rating range: ${analysis.ratingRange.min} - ${analysis.ratingRange.max}`);
                    console.log(`   Average rating: ${analysis.ratingRange.avg}`);
                }
                console.log('\n📄 Sample rows:');
                analysis.sampleRows.forEach((row, i) => {
                    console.log(`   ${i + 1}: ${JSON.stringify(row, null, 2).substring(0, 200)}...`);
                });
                
                manager.cleanup();
                break;

            case 'import':
                if (!args[1]) {
                    console.error('❌ Please provide a .csv.zst file to import');
                    return;
                }

                if (!manager.checkDependencies()) return;

                // Parse options
                const options = {
                    minRating: 800,
                    maxRating: 2000,
                    maxPuzzles: 10000
                };

                for (let i = 2; i < args.length; i += 2) {
                    const flag = args[i];
                    const value = args[i + 1];
                    
                    switch (flag) {
                        case '--min-rating':
                            options.minRating = parseInt(value);
                            break;
                        case '--max-rating':
                            options.maxRating = parseInt(value);
                            break;
                        case '--max-puzzles':
                            options.maxPuzzles = parseInt(value);
                            break;
                        case '--themes':
                            options.themes = value.split(',');
                            break;
                    }
                }

                console.log('⚙️  Import options:', options);
                
                const importCsvPath = await manager.decompressFile(args[1]);
                await manager.importBatch(importCsvPath, options);
                await manager.getImportStats();
                
                manager.cleanup();
                break;

            case 'stats':
                await manager.getImportStats();
                break;

            default:
                console.error(`❌ Unknown command: ${command}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        manager.cleanup();
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = PuzzleImportManager;