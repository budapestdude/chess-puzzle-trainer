// Load the mate-in-2 database if available
let puzzleDatabase = [];

// Try to load matesIn2Database if it exists
if (typeof matesIn2Database !== 'undefined') {
    // Use only mate-in-2 puzzles with sequential IDs
    puzzleDatabase = matesIn2Database.map((puzzle, index) => ({
        ...puzzle,
        id: index + 1
    }));
} else {
    // Fallback empty array
    puzzleDatabase = [];
}

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = puzzleDatabase;
}