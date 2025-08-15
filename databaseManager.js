class PuzzleDatabaseManager {
    constructor() {
        this.customPuzzles = this.loadCustomPuzzles();
        this.builtInPuzzles = [...puzzleDatabase]; // Keep original puzzles
        this.activeDatabase = 'all'; // 'all', 'builtin', 'custom'
        this.importer = new PuzzleImporter();
    }

    loadCustomPuzzles() {
        const saved = localStorage.getItem('customPuzzles');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return [];
            }
        }
        return [];
    }

    saveCustomPuzzles() {
        localStorage.setItem('customPuzzles', JSON.stringify(this.customPuzzles));
    }

    getAllPuzzles() {
        switch (this.activeDatabase) {
            case 'builtin':
                return this.builtInPuzzles;
            case 'custom':
                return this.customPuzzles;
            case 'all':
            default:
                return [...this.builtInPuzzles, ...this.customPuzzles];
        }
    }

    setActiveDatabase(type) {
        this.activeDatabase = type;
        // Update global puzzleDatabase variable
        window.puzzleDatabase = this.getAllPuzzles();
    }

    async importPuzzles(file) {
        const result = await this.importer.importFile(file);
        
        if (result.success) {
            // Add unique IDs if not present
            result.puzzles.forEach((puzzle, index) => {
                if (!puzzle.id) {
                    puzzle.id = `custom_${Date.now()}_${index}`;
                }
                // Ensure no ID conflicts
                while (this.customPuzzles.some(p => p.id === puzzle.id)) {
                    puzzle.id += '_dup';
                }
            });
            
            this.customPuzzles.push(...result.puzzles);
            this.saveCustomPuzzles();
            
            // Update global database
            window.puzzleDatabase = this.getAllPuzzles();
        }
        
        return result;
    }

    importFromText(text, format) {
        let result;
        
        switch (format) {
            case 'json':
                result = this.importer.parseJSON(text);
                break;
            case 'pgn':
                result = this.importer.parsePGN(text);
                break;
            case 'csv':
                result = this.importer.parseCSV(text);
                break;
            case 'lichess':
                result = this.importer.parseLichessFormat(text);
                break;
            default:
                result = this.importer.autoDetectFormat(text);
        }
        
        if (result.success) {
            result.puzzles.forEach((puzzle, index) => {
                if (!puzzle.id) {
                    puzzle.id = `custom_${Date.now()}_${index}`;
                }
                while (this.customPuzzles.some(p => p.id === puzzle.id)) {
                    puzzle.id += '_dup';
                }
            });
            
            this.customPuzzles.push(...result.puzzles);
            this.saveCustomPuzzles();
            window.puzzleDatabase = this.getAllPuzzles();
        }
        
        return result;
    }

    deletePuzzle(puzzleId) {
        const index = this.customPuzzles.findIndex(p => p.id === puzzleId);
        if (index !== -1) {
            this.customPuzzles.splice(index, 1);
            this.saveCustomPuzzles();
            window.puzzleDatabase = this.getAllPuzzles();
            return true;
        }
        return false;
    }

    updatePuzzle(puzzleId, updates) {
        const puzzle = this.customPuzzles.find(p => p.id === puzzleId);
        if (puzzle) {
            Object.assign(puzzle, updates);
            this.saveCustomPuzzles();
            window.puzzleDatabase = this.getAllPuzzles();
            return true;
        }
        return false;
    }

    clearCustomPuzzles() {
        if (confirm('Are you sure you want to delete all custom puzzles? This cannot be undone.')) {
            this.customPuzzles = [];
            this.saveCustomPuzzles();
            window.puzzleDatabase = this.getAllPuzzles();
            return true;
        }
        return false;
    }

    exportPuzzles(puzzleIds, format = 'json') {
        const puzzlesToExport = puzzleIds ? 
            this.getAllPuzzles().filter(p => puzzleIds.includes(p.id)) :
            this.getAllPuzzles();
        
        return this.importer.exportPuzzles(puzzlesToExport, format);
    }

    getStatistics() {
        const all = this.getAllPuzzles();
        const custom = this.customPuzzles;
        const builtin = this.builtInPuzzles;
        
        const getCategoryCount = (puzzles) => {
            const counts = {};
            puzzles.forEach(p => {
                counts[p.category] = (counts[p.category] || 0) + 1;
            });
            return counts;
        };
        
        const getDifficultyCount = (puzzles) => {
            const counts = { 1: 0, 2: 0, 3: 0 };
            puzzles.forEach(p => {
                counts[p.difficulty] = (counts[p.difficulty] || 0) + 1;
            });
            return counts;
        };
        
        return {
            total: all.length,
            custom: custom.length,
            builtin: builtin.length,
            categories: getCategoryCount(all),
            difficulties: getDifficultyCount(all),
            customCategories: getCategoryCount(custom),
            customDifficulties: getDifficultyCount(custom)
        };
    }

    searchPuzzles(query) {
        const searchTerm = query.toLowerCase();
        return this.getAllPuzzles().filter(puzzle => {
            return (
                puzzle.description.toLowerCase().includes(searchTerm) ||
                puzzle.category.toLowerCase().includes(searchTerm) ||
                (Array.isArray(puzzle.theme) && 
                 puzzle.theme.some(t => t.toLowerCase().includes(searchTerm))) ||
                puzzle.fen.includes(searchTerm) ||
                (puzzle.id && puzzle.id.toString().includes(searchTerm))
            );
        });
    }

    filterPuzzles(filters) {
        return this.getAllPuzzles().filter(puzzle => {
            if (filters.category && puzzle.category !== filters.category) {
                return false;
            }
            if (filters.difficulty && puzzle.difficulty !== filters.difficulty) {
                return false;
            }
            if (filters.theme && !puzzle.theme.includes(filters.theme)) {
                return false;
            }
            if (filters.imported !== undefined && 
                (puzzle.imported === true) !== filters.imported) {
                return false;
            }
            return true;
        });
    }

    validateDatabase() {
        const errors = [];
        const duplicateIds = new Set();
        const seenIds = new Set();
        
        this.getAllPuzzles().forEach((puzzle, index) => {
            // Check for duplicate IDs
            if (seenIds.has(puzzle.id)) {
                duplicateIds.add(puzzle.id);
            }
            seenIds.add(puzzle.id);
            
            // Validate FEN
            try {
                const game = new Chess();
                if (!game.load(puzzle.fen)) {
                    errors.push(`Puzzle ${puzzle.id}: Invalid FEN`);
                }
            } catch {
                errors.push(`Puzzle ${puzzle.id}: Invalid FEN`);
            }
            
            // Validate moves
            try {
                const game = new Chess(puzzle.fen);
                for (let move of puzzle.moves) {
                    if (!game.move(move)) {
                        errors.push(`Puzzle ${puzzle.id}: Invalid move ${move}`);
                        break;
                    }
                }
            } catch {
                errors.push(`Puzzle ${puzzle.id}: Invalid move sequence`);
            }
        });
        
        if (duplicateIds.size > 0) {
            errors.push(`Duplicate IDs found: ${Array.from(duplicateIds).join(', ')}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            puzzleCount: this.getAllPuzzles().length
        };
    }

    downloadExport(format = 'json', filename = null) {
        const content = this.exportPuzzles(null, format);
        const mimeTypes = {
            json: 'application/json',
            pgn: 'application/x-chess-pgn',
            csv: 'text/csv'
        };
        
        const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = filename || `chess_puzzles_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}