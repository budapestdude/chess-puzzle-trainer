#!/usr/bin/env node

// Demo script to show puzzle import system working with current puzzles
const PuzzleImporter = require('./puzzle_importer');
const Database = require('./database');

async function demonstrateImport() {
    console.log('🎯 Chess Puzzle Import System Demo\n');
    
    const importer = new PuzzleImporter();
    const db = new Database();
    
    try {
        // Create puzzles table
        await importer.createPuzzlesTable();
        
        // Create a sample CSV from our existing puzzles
        console.log('📝 Creating sample puzzle data...');
        const fs = require('fs');
        const currentPuzzles = require('./matesIn2Database.js');
        
        // Convert to CSV format
        const csvHeader = 'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags\n';
        const csvRows = currentPuzzles.map((puzzle, index) => {
            const rating = 800 + Math.floor(Math.random() * 800); // Random rating between 800-1600
            const themes = puzzle.theme ? puzzle.theme.join(' ') : 'mate mateIn2';
            const moves = puzzle.moves ? puzzle.moves.join(' ') : '';
            return `${puzzle.id || `demo_${index + 1}`},"${puzzle.fen}","${moves}",${rating},50,85,1200,"${themes}","","opening"`; 
        });
        
        const csvContent = csvHeader + csvRows.join('\n');
        const csvPath = './temp_demo_puzzles.csv';
        
        fs.writeFileSync(csvPath, csvContent);
        console.log(`✅ Created demo CSV with ${currentPuzzles.length} puzzles`);
        
        // Import the puzzles
        console.log('\n🚀 Importing puzzles...');
        const result = await importer.importCSVFile(csvPath, {
            minRating: 800,
            maxRating: 1600,
            maxPuzzles: 1000
        });
        
        console.log('\n📊 Import Results:');
        console.log(`   Processed: ${result.processed}`);
        console.log(`   Imported: ${result.imported}`);
        console.log(`   Skipped: ${result.skipped}`);
        
        // Show database stats
        console.log('\n📈 Database Statistics:');
        const stats = await importer.getImportStats();
        console.log(`   Total puzzles: ${stats.total}`);
        console.log(`   Rating range: ${stats.min_rating} - ${stats.max_rating}`);
        console.log(`   Average rating: ${Math.round(stats.avg_rating)}`);
        
        // Test puzzle retrieval
        console.log('\n🔍 Testing puzzle retrieval...');
        const easyPuzzles = await db.getPuzzlesByRating(800, 1200, 5);
        console.log(`   Found ${easyPuzzles.length} easy puzzles (800-1200 rating)`);
        
        const randomPuzzle = await db.getRandomPuzzle(1000, 1400);
        if (randomPuzzle) {
            console.log(`   Random puzzle: ${randomPuzzle.puzzle_id} (Rating: ${randomPuzzle.rating})`);
        }
        
        // Cleanup demo file
        fs.unlinkSync(csvPath);
        console.log('\n🧹 Demo file cleaned up');
        
        console.log('\n✅ Demo completed successfully!');
        console.log('\n📚 Next steps:');
        console.log('   1. Use your 246MB CSV.zst file with: node import_puzzles.js import your_puzzles.csv.zst');
        console.log('   2. Start with small batches: --max-puzzles 1000');
        console.log('   3. Filter by difficulty: --min-rating 1000 --max-rating 1400');
        console.log('   4. Check database stats: node import_puzzles.js stats');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    } finally {
        db.close();
    }
}

// Run demo
if (require.main === module) {
    demonstrateImport().catch(console.error);
}

module.exports = demonstrateImport;