class PuzzleImporter {
    constructor() {
        this.importedPuzzles = [];
        this.errors = [];
        this.supportedFormats = {
            json: this.parseJSON.bind(this),
            pgn: this.parsePGN.bind(this),
            csv: this.parseCSV.bind(this),
            lichess: this.parseLichessFormat.bind(this)
        };
    }

    async importFile(file) {
        this.importedPuzzles = [];
        this.errors = [];
        
        try {
            const content = await this.readFile(file);
            const extension = file.name.split('.').pop().toLowerCase();
            
            if (extension === 'json') {
                return this.parseJSON(content);
            } else if (extension === 'pgn') {
                return this.parsePGN(content);
            } else if (extension === 'csv') {
                return this.parseCSV(content);
            } else if (extension === 'txt') {
                // Try to detect format
                return this.autoDetectFormat(content);
            } else {
                throw new Error(`Unsupported file format: ${extension}`);
            }
        } catch (error) {
            this.errors.push(`Import error: ${error.message}`);
            return { success: false, errors: this.errors };
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    autoDetectFormat(content) {
        // Try JSON first
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return this.parseJSON(content);
            }
        } catch {}
        
        // Check for PGN markers
        if (content.includes('[Event') || content.includes('[FEN')) {
            return this.parsePGN(content);
        }
        
        // Check for CSV structure
        if (content.includes(',') && content.includes('\n')) {
            return this.parseCSV(content);
        }
        
        // Check for Lichess format
        if (content.includes('PuzzleId') || content.includes('Rating')) {
            return this.parseLichessFormat(content);
        }
        
        throw new Error('Unable to detect puzzle format');
    }

    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            const puzzles = Array.isArray(data) ? data : [data];
            
            puzzles.forEach((puzzle, index) => {
                const validatedPuzzle = this.validateAndNormalizePuzzle(puzzle, index);
                if (validatedPuzzle) {
                    this.importedPuzzles.push(validatedPuzzle);
                }
            });
            
            return {
                success: true,
                puzzles: this.importedPuzzles,
                errors: this.errors,
                count: this.importedPuzzles.length
            };
        } catch (error) {
            this.errors.push(`JSON parsing error: ${error.message}`);
            return { success: false, errors: this.errors };
        }
    }

    parsePGN(content) {
        const games = content.split(/\n\n(?=\[)/);
        
        games.forEach((game, index) => {
            try {
                const puzzle = this.parseSinglePGN(game);
                if (puzzle) {
                    const validatedPuzzle = this.validateAndNormalizePuzzle(puzzle, index);
                    if (validatedPuzzle) {
                        this.importedPuzzles.push(validatedPuzzle);
                    }
                }
            } catch (error) {
                this.errors.push(`PGN game ${index + 1}: ${error.message}`);
            }
        });
        
        return {
            success: this.importedPuzzles.length > 0,
            puzzles: this.importedPuzzles,
            errors: this.errors,
            count: this.importedPuzzles.length
        };
    }

    parseSinglePGN(pgnText) {
        const headers = {};
        const headerRegex = /\[(\w+)\s+"([^"]+)"\]/g;
        let match;
        
        while ((match = headerRegex.exec(pgnText)) !== null) {
            headers[match[1]] = match[2];
        }
        
        // Extract moves (after headers)
        const movesStart = pgnText.lastIndexOf(']') + 1;
        const movesText = pgnText.substring(movesStart).trim();
        const moves = this.extractMovesFromPGN(movesText);
        
        if (!headers.FEN) {
            throw new Error('Missing FEN position');
        }
        
        return {
            fen: headers.FEN,
            moves: moves,
            event: headers.Event || 'Imported Puzzle',
            difficulty: this.guessDifficulty(headers.Rating || headers.Difficulty),
            category: this.guessCategory(headers.Category || headers.Theme || ''),
            theme: this.extractThemes(headers.Theme || headers.Tags || ''),
            description: headers.Comment || headers.Description || 'Find the best move'
        };
    }

    extractMovesFromPGN(movesText) {
        // Remove move numbers, comments, and variations
        let cleaned = movesText
            .replace(/\{[^}]*\}/g, '') // Remove comments
            .replace(/\([^)]*\)/g, '') // Remove variations
            .replace(/\d+\./g, '') // Remove move numbers
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        // Split into individual moves
        const moves = cleaned.split(' ').filter(move => 
            move && !move.match(/^[\d\-\/\*]+$/) // Filter out results like 1-0
        );
        
        return moves;
    }

    parseCSV(content) {
        const lines = content.trim().split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        // Map common header variations
        const fieldMap = {
            'fen': ['fen', 'position', 'board'],
            'moves': ['moves', 'solution', 'answer'],
            'difficulty': ['difficulty', 'rating', 'level'],
            'category': ['category', 'type', 'theme'],
            'description': ['description', 'comment', 'instruction']
        };
        
        const getFieldIndex = (field) => {
            const variations = fieldMap[field];
            for (let variant of variations) {
                const index = headers.indexOf(variant);
                if (index !== -1) return index;
            }
            return -1;
        };
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);
                
                const fenIndex = getFieldIndex('fen');
                const movesIndex = getFieldIndex('moves');
                
                if (fenIndex === -1 || movesIndex === -1) {
                    throw new Error('CSV must have FEN and moves columns');
                }
                
                const puzzle = {
                    fen: values[fenIndex],
                    moves: values[movesIndex].split(/[,\s]+/),
                    difficulty: parseInt(values[getFieldIndex('difficulty')] || '1'),
                    category: values[getFieldIndex('category')] || 'tactics',
                    description: values[getFieldIndex('description')] || 'Find the best move'
                };
                
                const validatedPuzzle = this.validateAndNormalizePuzzle(puzzle, i);
                if (validatedPuzzle) {
                    this.importedPuzzles.push(validatedPuzzle);
                }
            } catch (error) {
                this.errors.push(`CSV line ${i + 1}: ${error.message}`);
            }
        }
        
        return {
            success: this.importedPuzzles.length > 0,
            puzzles: this.importedPuzzles,
            errors: this.errors,
            count: this.importedPuzzles.length
        };
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        return values;
    }

    parseLichessFormat(content) {
        // Parse Lichess puzzle format
        const lines = content.trim().split('\n');
        
        lines.forEach((line, index) => {
            try {
                const parts = line.split(',');
                if (parts.length < 3) return;
                
                const puzzle = {
                    id: parts[0],
                    fen: parts[1],
                    moves: parts[2].split(' '),
                    rating: parseInt(parts[3] || '1500'),
                    themes: parts[7] ? parts[7].split(' ') : [],
                    gameUrl: parts[8] || ''
                };
                
                const normalized = {
                    fen: puzzle.fen,
                    moves: puzzle.moves,
                    difficulty: this.ratingToDifficulty(puzzle.rating),
                    category: this.themesToCategory(puzzle.themes),
                    theme: puzzle.themes,
                    description: `Lichess puzzle ${puzzle.id}`
                };
                
                const validatedPuzzle = this.validateAndNormalizePuzzle(normalized, index);
                if (validatedPuzzle) {
                    this.importedPuzzles.push(validatedPuzzle);
                }
            } catch (error) {
                this.errors.push(`Lichess format line ${index + 1}: ${error.message}`);
            }
        });
        
        return {
            success: this.importedPuzzles.length > 0,
            puzzles: this.importedPuzzles,
            errors: this.errors,
            count: this.importedPuzzles.length
        };
    }

    validateAndNormalizePuzzle(puzzle, index) {
        try {
            // Validate FEN
            if (!puzzle.fen || !this.isValidFEN(puzzle.fen)) {
                throw new Error('Invalid FEN position');
            }
            
            // Validate moves
            if (!puzzle.moves || !Array.isArray(puzzle.moves) || puzzle.moves.length === 0) {
                throw new Error('Puzzle must have solution moves');
            }
            
            // Validate moves are legal
            const validMoves = this.validateMoves(puzzle.fen, puzzle.moves);
            if (!validMoves) {
                throw new Error('Invalid move sequence');
            }
            
            // Normalize difficulty
            const difficulty = this.normalizeDifficulty(puzzle.difficulty);
            
            // Normalize category
            const category = this.normalizeCategory(puzzle.category);
            
            // Extract themes
            const themes = this.normalizeThemes(puzzle.theme || puzzle.themes || []);
            
            // Generate unique ID
            const id = puzzle.id || this.generatePuzzleId(puzzle.fen, index);
            
            return {
                id: id,
                fen: puzzle.fen,
                moves: puzzle.moves,
                difficulty: difficulty,
                category: category,
                theme: themes,
                description: puzzle.description || 'Find the best move',
                imported: true,
                importDate: new Date().toISOString()
            };
        } catch (error) {
            this.errors.push(`Puzzle ${index + 1}: ${error.message}`);
            return null;
        }
    }

    isValidFEN(fen) {
        try {
            const game = new Chess();
            return game.load(fen);
        } catch {
            return false;
        }
    }

    validateMoves(fen, moves) {
        try {
            const game = new Chess(fen);
            for (let move of moves) {
                const result = game.move(move);
                if (!result) {
                    return false;
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    normalizeDifficulty(difficulty) {
        if (typeof difficulty === 'number') {
            return Math.min(3, Math.max(1, Math.round(difficulty)));
        }
        
        const diffStr = String(difficulty).toLowerCase();
        if (diffStr.includes('easy') || diffStr.includes('beginner')) return 1;
        if (diffStr.includes('medium') || diffStr.includes('intermediate')) return 2;
        if (diffStr.includes('hard') || diffStr.includes('advanced')) return 3;
        
        return 1;
    }

    normalizeCategory(category) {
        if (!category) return 'tactics';
        
        const catStr = String(category).toLowerCase();
        if (catStr.includes('tactic')) return 'tactics';
        if (catStr.includes('position')) return 'positional';
        if (catStr.includes('endgame') || catStr.includes('ending')) return 'endgame';
        if (catStr.includes('opening')) return 'opening';
        
        return 'tactics';
    }

    normalizeThemes(themes) {
        if (typeof themes === 'string') {
            themes = themes.split(/[,\s]+/);
        }
        
        if (!Array.isArray(themes)) {
            return ['material'];
        }
        
        return themes.map(theme => {
            const themeStr = String(theme).toLowerCase().replace(/[^a-z]/g, '');
            // Map common theme variations
            if (themeStr.includes('fork')) return 'fork';
            if (themeStr.includes('pin')) return 'pin';
            if (themeStr.includes('skewer')) return 'skewer';
            if (themeStr.includes('sacrifice') || themeStr.includes('sac')) return 'sacrifice';
            if (themeStr.includes('mate')) return 'checkmate';
            if (themeStr.includes('promotion')) return 'promotion';
            if (themeStr.includes('defend')) return 'defense';
            return themeStr;
        }).filter(theme => theme.length > 0);
    }

    guessDifficulty(rating) {
        if (!rating) return 1;
        
        const r = parseInt(rating);
        if (r < 1500) return 1;
        if (r < 1800) return 2;
        return 3;
    }

    ratingToDifficulty(rating) {
        if (rating < 1500) return 1;
        if (rating < 1800) return 2;
        return 3;
    }

    guessCategory(text) {
        const t = text.toLowerCase();
        if (t.includes('endgame') || t.includes('ending')) return 'endgame';
        if (t.includes('opening')) return 'opening';
        if (t.includes('position') || t.includes('strategic')) return 'positional';
        return 'tactics';
    }

    themesToCategory(themes) {
        if (!themes || themes.length === 0) return 'tactics';
        
        const themeStr = themes.join(' ').toLowerCase();
        if (themeStr.includes('endgame') || themeStr.includes('ending')) return 'endgame';
        if (themeStr.includes('opening')) return 'opening';
        if (themeStr.includes('positional') || themeStr.includes('strategic')) return 'positional';
        return 'tactics';
    }

    extractThemes(text) {
        const themes = [];
        const t = text.toLowerCase();
        
        if (t.includes('fork')) themes.push('fork');
        if (t.includes('pin')) themes.push('pin');
        if (t.includes('skewer')) themes.push('skewer');
        if (t.includes('sacrifice')) themes.push('sacrifice');
        if (t.includes('mate')) themes.push('checkmate');
        if (t.includes('promotion')) themes.push('promotion');
        if (t.includes('trap')) themes.push('trap');
        
        return themes.length > 0 ? themes : ['material'];
    }

    generatePuzzleId(fen, index) {
        // Generate a unique ID based on FEN and timestamp
        const hash = this.simpleHash(fen);
        return `imported_${hash}_${Date.now()}_${index}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    exportPuzzles(puzzles, format = 'json') {
        switch (format) {
            case 'json':
                return this.exportAsJSON(puzzles);
            case 'pgn':
                return this.exportAsPGN(puzzles);
            case 'csv':
                return this.exportAsCSV(puzzles);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    exportAsJSON(puzzles) {
        return JSON.stringify(puzzles, null, 2);
    }

    exportAsPGN(puzzles) {
        return puzzles.map((puzzle, index) => {
            const pgn = [
                `[Event "Puzzle ${puzzle.id || index + 1}"]`,
                `[Site "Chess Trainer"]`,
                `[Date "${new Date().toISOString().split('T')[0]}"]`,
                `[FEN "${puzzle.fen}"]`,
                `[Difficulty "${puzzle.difficulty}"]`,
                `[Category "${puzzle.category}"]`,
                `[Theme "${Array.isArray(puzzle.theme) ? puzzle.theme.join(', ') : puzzle.theme}"]`,
                `[Description "${puzzle.description}"]`,
                '',
                puzzle.moves.join(' '),
                ''
            ];
            return pgn.join('\n');
        }).join('\n\n');
    }

    exportAsCSV(puzzles) {
        const headers = ['id', 'fen', 'moves', 'difficulty', 'category', 'theme', 'description'];
        const rows = [headers.join(',')];
        
        puzzles.forEach(puzzle => {
            const row = [
                puzzle.id || '',
                `"${puzzle.fen}"`,
                `"${puzzle.moves.join(' ')}"`,
                puzzle.difficulty,
                puzzle.category,
                `"${Array.isArray(puzzle.theme) ? puzzle.theme.join(' ') : puzzle.theme}"`,
                `"${puzzle.description || ''}"`
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }
}