let dbManager = null;

function initializeImporter() {
    dbManager = new PuzzleDatabaseManager();
    
    setupEventListeners();
    updateStatistics();
    renderCharts();
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            
            e.target.classList.add('active');
            const tabId = e.target.dataset.tab + '-tab';
            document.getElementById(tabId).style.display = 'block';
        });
    });
    
    // File upload
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    
    browseBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    // Text import
    document.getElementById('importTextBtn').addEventListener('click', () => {
        const text = document.getElementById('textInput').value;
        const format = document.getElementById('textFormat').value;
        
        if (!text.trim()) {
            showImportResults({ success: false, errors: ['Please enter puzzle data'] });
            return;
        }
        
        const result = dbManager.importFromText(text, format);
        showImportResults(result);
        updateStatistics();
        renderCharts();
    });
    
    // URL import
    document.getElementById('importUrlBtn').addEventListener('click', async () => {
        const url = document.getElementById('urlInput').value;
        
        if (!url.trim()) {
            showImportResults({ success: false, errors: ['Please enter a URL'] });
            return;
        }
        
        try {
            const response = await fetch(url);
            const text = await response.text();
            
            const format = guessFormatFromURL(url);
            const result = dbManager.importFromText(text, format);
            showImportResults(result);
            updateStatistics();
            renderCharts();
        } catch (error) {
            showImportResults({ success: false, errors: [`Failed to fetch URL: ${error.message}`] });
        }
    });
    
    // Database controls
    document.getElementById('databaseSelector').addEventListener('change', (e) => {
        dbManager.setActiveDatabase(e.target.value);
        updateStatistics();
        renderCharts();
    });
    
    document.getElementById('validateBtn').addEventListener('click', () => {
        const result = dbManager.validateDatabase();
        showValidationResults(result);
    });
    
    document.getElementById('exportBtn').addEventListener('click', () => {
        showExportModal();
    });
    
    document.getElementById('clearCustomBtn').addEventListener('click', () => {
        if (dbManager.clearCustomPuzzles()) {
            updateStatistics();
            renderCharts();
            showImportResults({ 
                success: true, 
                count: 0,
                errors: [],
                message: 'Custom puzzles cleared successfully'
            });
        }
    });
    
    // Search
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Export modal
    document.getElementById('downloadExportBtn').addEventListener('click', () => {
        const format = document.getElementById('exportFormat').value;
        dbManager.downloadExport(format);
    });
    
    document.getElementById('exportFormat').addEventListener('change', updateExportPreview);
    
    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
}

async function handleFileUpload(file) {
    const result = await dbManager.importPuzzles(file);
    showImportResults(result);
    updateStatistics();
    renderCharts();
}

function showImportResults(result) {
    const resultsDiv = document.getElementById('importResults');
    const content = resultsDiv.querySelector('.results-content');
    
    if (result.success) {
        content.innerHTML = `
            <div class="success-message">
                ✅ Successfully imported ${result.count || result.puzzles?.length || 0} puzzles!
            </div>
            ${result.message ? `<p>${result.message}</p>` : ''}
        `;
    } else {
        content.innerHTML = `
            <div class="error-message">
                ❌ Import failed
            </div>
        `;
    }
    
    if (result.errors && result.errors.length > 0) {
        content.innerHTML += `
            <div class="error-message">
                <strong>Errors:</strong><br>
                ${result.errors.slice(0, 10).join('<br>')}
                ${result.errors.length > 10 ? `<br>... and ${result.errors.length - 10} more errors` : ''}
            </div>
        `;
    }
    
    resultsDiv.style.display = 'block';
    
    setTimeout(() => {
        resultsDiv.style.display = 'none';
    }, 10000);
}

function updateStatistics() {
    const stats = dbManager.getStatistics();
    
    document.getElementById('totalPuzzles').textContent = stats.total;
    document.getElementById('customPuzzles').textContent = stats.custom;
    document.getElementById('builtinPuzzles').textContent = stats.builtin;
}

function renderCharts() {
    const stats = dbManager.getStatistics();
    
    // Category chart
    const categoryChart = document.getElementById('categoryChart');
    const maxCategory = Math.max(...Object.values(stats.categories));
    
    categoryChart.innerHTML = Object.entries(stats.categories).map(([cat, count]) => `
        <div class="chart-bar">
            <span class="chart-label">${cat}</span>
            <div class="chart-progress">
                <div class="chart-fill" style="width: ${(count / maxCategory) * 100}%">
                    <span class="chart-value">${count}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Difficulty chart
    const difficultyChart = document.getElementById('difficultyChart');
    const difficultyLabels = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
    const maxDifficulty = Math.max(...Object.values(stats.difficulties));
    
    difficultyChart.innerHTML = Object.entries(stats.difficulties).map(([diff, count]) => `
        <div class="chart-bar">
            <span class="chart-label">${difficultyLabels[diff]}</span>
            <div class="chart-progress">
                <div class="chart-fill" style="width: ${(count / maxDifficulty) * 100}%">
                    <span class="chart-value">${count}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function performSearch() {
    const query = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    const difficulty = document.getElementById('difficultyFilter').value;
    
    let results;
    
    if (query) {
        results = dbManager.searchPuzzles(query);
    } else {
        const filters = {};
        if (category) filters.category = category;
        if (difficulty) filters.difficulty = parseInt(difficulty);
        results = dbManager.filterPuzzles(filters);
    }
    
    displaySearchResults(results);
}

function displaySearchResults(puzzles) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (puzzles.length === 0) {
        resultsDiv.innerHTML = '<p>No puzzles found</p>';
        return;
    }
    
    resultsDiv.innerHTML = puzzles.slice(0, 20).map(puzzle => `
        <div class="puzzle-item">
            <div class="puzzle-info">
                <div class="puzzle-id">Puzzle ${puzzle.id}</div>
                <div class="puzzle-details">
                    ${puzzle.category} | Difficulty: ${'⭐'.repeat(puzzle.difficulty)} | 
                    ${puzzle.description}
                </div>
            </div>
            <div class="puzzle-actions">
                ${puzzle.imported ? `
                    <button class="delete-btn" onclick="deletePuzzle('${puzzle.id}')">Delete</button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    if (puzzles.length > 20) {
        resultsDiv.innerHTML += `<p>Showing 20 of ${puzzles.length} results</p>`;
    }
}

function deletePuzzle(puzzleId) {
    if (confirm('Are you sure you want to delete this puzzle?')) {
        if (dbManager.deletePuzzle(puzzleId)) {
            performSearch();
            updateStatistics();
            renderCharts();
        }
    }
}

function showExportModal() {
    const modal = document.getElementById('exportModal');
    modal.style.display = 'block';
    updateExportPreview();
}

function updateExportPreview() {
    const format = document.getElementById('exportFormat').value;
    const preview = dbManager.exportPuzzles(null, format);
    const lines = preview.split('\n').slice(0, 50).join('\n');
    
    document.getElementById('exportPreview').textContent = lines + 
        (preview.split('\n').length > 50 ? '\n\n... (truncated for preview)' : '');
}

function showValidationResults(result) {
    const modal = document.getElementById('validationModal');
    const content = document.getElementById('validationResults');
    
    if (result.valid) {
        content.innerHTML = `
            <div class="validation-success">
                ✅ Database is valid!
            </div>
            <p>Total puzzles validated: ${result.puzzleCount}</p>
        `;
    } else {
        content.innerHTML = `
            <div class="validation-errors">
                <strong>Validation errors found:</strong>
                ${result.errors.map(err => `
                    <div class="validation-error">${err}</div>
                `).join('')}
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

function guessFormatFromURL(url) {
    if (url.includes('.json')) return 'json';
    if (url.includes('.pgn')) return 'pgn';
    if (url.includes('.csv')) return 'csv';
    return 'auto';
}

// Sample import formats for reference
const sampleFormats = {
    json: `[
  {
    "fen": "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    "moves": ["Bxc6", "dxc6", "Nxe5"],
    "category": "tactics",
    "difficulty": 1,
    "description": "Win a pawn"
  }
]`,
    pgn: `[Event "Puzzle 1"]
[FEN "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"]
[Difficulty "1"]
[Category "tactics"]

Bxc6 dxc6 Nxe5`,
    csv: `fen,moves,difficulty,category,description
"r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4","Bxc6 dxc6 Nxe5",1,tactics,"Win a pawn"`
};

document.addEventListener('DOMContentLoaded', initializeImporter);