// Board Customization System
class BoardCustomization {
    constructor() {
        this.settings = {
            boardTheme: 'classic',
            pieceSet: 'wikipedia',
            boardSize: 'medium',
            showCoordinates: true,
            highlightMoves: true,
            animationSpeed: 'normal',
            boardOrientation: 'white'
        };
        
        this.loadSettings();
        this.initializeThemes();
        
        console.log('BoardCustomization initialized with settings:', this.settings);
    }

    // Board themes with light/dark square colors
    initializeThemes() {
        this.themes = {
            classic: {
                name: 'Classic',
                light: '#f0d9b5',
                dark: '#b58863',
                border: '#8b7355'
            },
            blue: {
                name: 'Ocean Blue',
                light: '#dee3e6',
                dark: '#8ca2ad',
                border: '#6b8a97'
            },
            green: {
                name: 'Forest Green',
                light: '#ffffdd',
                dark: '#86a666',
                border: '#6b8855'
            },
            purple: {
                name: 'Royal Purple',
                light: '#f5f5dc',
                dark: '#9f7aea',
                border: '#805ad5'
            },
            wood: {
                name: 'Wood Grain',
                light: '#f7e6d0',
                dark: '#d2b48c',
                border: '#8b7355'
            },
            marble: {
                name: 'Marble',
                light: '#ffffff',
                dark: '#d3d3d3',
                border: '#a9a9a9'
            },
            neon: {
                name: 'Neon',
                light: '#2a2a2a',
                dark: '#00ffff',
                border: '#00cccc'
            },
            tournament: {
                name: 'Tournament',
                light: '#f7f7f7',
                dark: '#d18b47',
                border: '#b8860b'
            }
        };

        this.pieceSets = {
            wikipedia: {
                name: 'Wikipedia',
                path: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
            },
            alpha: {
                name: 'Alpha',
                path: 'https://chessboardjs.com/img/chesspieces/alpha/{piece}.png'
            },
            uscf: {
                name: 'USCF',
                path: 'https://images.chesscomfiles.com/chess-themes/pieces/uscf/{piece}.png'
            },
            maestro: {
                name: 'Maestro',
                path: 'https://images.chesscomfiles.com/chess-themes/pieces/maestro/{piece}.png'
            },
            neo: {
                name: 'Neo',
                path: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/{piece}.png'
            },
            wood_classic: {
                name: 'Wood Classic',
                path: 'https://images.chesscomfiles.com/chess-themes/pieces/wood/{piece}.png'
            }
        };

        this.boardSizes = {
            small: { size: 320, name: 'Small (320px)' },
            medium: { size: 400, name: 'Medium (400px)' },
            large: { size: 480, name: 'Large (480px)' },
            xlarge: { size: 560, name: 'Extra Large (560px)' }
        };

        this.animationSpeeds = {
            none: { duration: 0, name: 'No Animation' },
            fast: { duration: 100, name: 'Fast' },
            normal: { duration: 200, name: 'Normal' },
            slow: { duration: 400, name: 'Slow' }
        };
    }

    // Load settings from localStorage
    loadSettings() {
        const saved = localStorage.getItem('chessboardSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
            } catch (e) {
                console.warn('Failed to load board settings:', e);
            }
        }
    }

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem('chessboardSettings', JSON.stringify(this.settings));
    }

    // Update a specific setting
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
    }

    // Get current settings
    getSettings() {
        return { ...this.settings };
    }

    // Apply all settings to the board
    applySettings() {
        this.applyBoardTheme();
        this.applyBoardSize();
        this.applyCoordinates();
        this.applyHighlights();
        
        // Update piece set if board exists
        if (window.board) {
            window.board.config.pieceTheme = this.pieceSets[this.settings.pieceSet].path;
            
            // Update animation speed
            const speed = this.animationSpeeds[this.settings.animationSpeed].duration;
            if (window.board.config) {
                window.board.config.moveSpeed = speed;
                window.board.config.snapbackSpeed = speed;
                window.board.config.snapSpeed = speed;
                window.board.config.trashSpeed = speed;
            }
        }
    }

    // Apply board theme (colors)
    applyBoardTheme() {
        const theme = this.themes[this.settings.boardTheme];
        if (!theme) return;

        // Create or update CSS for board theme
        let styleEl = document.getElementById('board-theme-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'board-theme-style';
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            .chessboard-63f37 .square-55d63 {
                background-color: ${theme.light} !important;
            }
            .chessboard-63f37 .square-55d63.black-3c85d {
                background-color: ${theme.dark} !important;
            }
            .chessboard-63f37 .square-55d63.highlight1-32417,
            .chessboard-63f37 .square-55d63.highlight2-9c5d2 {
                box-shadow: inset 0 0 3px 3px rgba(255, 255, 0, 0.5) !important;
            }
            .chessboard-63f37 {
                border: 3px solid ${theme.border} !important;
            }
            .board-container {
                background: ${theme.border};
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
        `;
    }

    // Apply board size
    applyBoardSize() {
        const size = this.boardSizes[this.settings.boardSize];
        if (!size) return;

        const boardContainer = document.querySelector('.board-container');
        if (boardContainer) {
            boardContainer.style.width = `${size.size + 20}px`;
            boardContainer.style.height = `${size.size + 20}px`;
        }

        if (window.board) {
            setTimeout(() => {
                window.board.resize();
            }, 100);
        }
    }

    // Apply coordinate display
    applyCoordinates() {
        let coordStyle = document.getElementById('coordinate-style');
        if (!coordStyle) {
            coordStyle = document.createElement('style');
            coordStyle.id = 'coordinate-style';
            document.head.appendChild(coordStyle);
        }

        if (this.settings.showCoordinates) {
            coordStyle.textContent = `
                .chessboard-63f37 .notation-322f9 {
                    display: block !important;
                }
            `;
        } else {
            coordStyle.textContent = `
                .chessboard-63f37 .notation-322f9 {
                    display: none !important;
                }
            `;
        }
    }

    // Apply move highlighting
    applyHighlights() {
        let highlightStyle = document.getElementById('highlight-style');
        if (!highlightStyle) {
            highlightStyle = document.createElement('style');
            highlightStyle.id = 'highlight-style';
            document.head.appendChild(highlightStyle);
        }

        if (!this.settings.highlightMoves) {
            highlightStyle.textContent = `
                .chessboard-63f37 .square-55d63.highlight1-32417,
                .chessboard-63f37 .square-55d63.highlight2-9c5d2 {
                    box-shadow: none !important;
                }
            `;
        } else {
            highlightStyle.textContent = '';
        }
    }

    // Get available themes
    getThemes() {
        return this.themes;
    }

    // Get available piece sets
    getPieceSets() {
        return this.pieceSets;
    }

    // Get available board sizes
    getBoardSizes() {
        return this.boardSizes;
    }

    // Get available animation speeds
    getAnimationSpeeds() {
        return this.animationSpeeds;
    }

    // Reset to defaults
    resetToDefaults() {
        this.settings = {
            boardTheme: 'classic',
            pieceSet: 'wikipedia',
            boardSize: 'medium',
            showCoordinates: true,
            highlightMoves: true,
            animationSpeed: 'normal',
            boardOrientation: 'white'
        };
        this.saveSettings();
        this.applySettings();
    }

    // Export settings
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    // Import settings
    importSettings(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            this.settings = { ...this.settings, ...imported };
            this.saveSettings();
            this.applySettings();
            return true;
        } catch (e) {
            console.error('Failed to import settings:', e);
            return false;
        }
    }
}

// Create global instance
const boardCustomization = new BoardCustomization();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardCustomization;
}