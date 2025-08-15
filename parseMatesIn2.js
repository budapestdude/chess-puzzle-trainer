const fs = require('fs');

function parseMatesIn2File(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const puzzles = [];
    let puzzleId = 1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check if this is a game header (contains vs and year)
        if (line.includes(' vs ') && /\d{4}/.test(line)) {
            const gameInfo = line;
            const fenLine = lines[i + 1]?.trim();
            const solutionLine = lines[i + 2]?.trim();
            
            if (fenLine && solutionLine) {
                // Fix FEN if it has invalid move counters
                let fixedFen = fenLine;
                // If FEN ends with "- 1 0", change it to "- 0 1"
                if (fixedFen.match(/- 1 0$/)) {
                    fixedFen = fixedFen.replace(/- 1 0$/, '- 0 1');
                }
                // Parse the solution moves
                // Format is like "1. Nf6+ gxf6 2. Bxf7#"
                const solutionMoves = [];
                
                // Remove move numbers and split by spaces
                const cleanedSolution = solutionLine.replace(/\d+\.\s*/g, ' ').trim();
                const allMoves = cleanedSolution.split(/\s+/);
                
                // Filter out empty strings and add all moves
                allMoves.forEach(move => {
                    if (move && move !== '') {
                        solutionMoves.push(move);
                    }
                });
                
                // Extract year from gameInfo for sorting
                const yearMatch = gameInfo.match(/\d{4}/);
                const year = yearMatch ? parseInt(yearMatch[0]) : 1900;
                
                puzzles.push({
                    id: puzzleId++,
                    fen: fixedFen,
                    moves: solutionMoves,
                    category: "checkmate",
                    theme: ["mateIn2", "tactics"],
                    difficulty: 2, // Mate in 2 is intermediate difficulty
                    description: `Mate in 2 - ${gameInfo}`,
                    source: gameInfo,
                    year: year
                });
                
                // Skip the next 2 lines as we've already processed them
                i += 2;
            }
        }
    }
    
    return puzzles;
}

// Parse the file
const puzzles = parseMatesIn2File('MatesIn2.txt');

// Generate JavaScript database file
const jsContent = `// Auto-generated from MatesIn2.txt
// Total puzzles: ${puzzles.length}

const matesIn2Database = ${JSON.stringify(puzzles, null, 4)};

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = matesIn2Database;
}
`;

// Write to file
fs.writeFileSync('matesIn2Database.js', jsContent);

console.log(`Successfully parsed ${puzzles.length} mate-in-2 puzzles`);
console.log(`Output written to matesIn2Database.js`);

// Also create a combined database file that merges with existing puzzles
const combinedContent = `// Combined puzzle database
const puzzleDatabase = [
    // Original puzzles
    {
        id: 1,
        fen: "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        moves: ["Bxc6", "dxc6", "Nxe5"],
        category: "tactics",
        theme: ["pin", "material"],
        difficulty: 1,
        description: "Win a pawn with a tactical sequence"
    },
    // ... (other original puzzles would go here)
    
    // Mate in 2 puzzles
    ...${JSON.stringify(puzzles, null, 4)}
];
`;

fs.writeFileSync('combinedPuzzleDatabase.js', combinedContent);
console.log(`Combined database written to combinedPuzzleDatabase.js`);