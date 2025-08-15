// Mate in 2 puzzles database
const puzzles = [];

// Load mate-in-2 puzzles if the database file exists
if (typeof matesIn2Database !== 'undefined') {
    // Use all puzzles from matesIn2Database with sequential IDs
    const allPuzzles = matesIn2Database.map((puzzle, index) => ({
        ...puzzle,
        id: index + 1,
        description: puzzle.description
    }));
    puzzles.push(...allPuzzles);
}