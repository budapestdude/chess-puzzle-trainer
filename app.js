let board = null;
let game = null;
let currentPuzzle = 0;
let puzzleMoves = [];
let currentMoveIndex = 0;
let isShowingSolution = false;
let pendingPromotion = null;

function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    
    board = Chessboard('board', config);
    loadPuzzle(0);
    
    window.addEventListener('resize', () => {
        board.resize();
    });
}

function loadPuzzle(index) {
    if (index < 0 || index >= puzzles.length) return;
    
    currentPuzzle = index;
    const puzzle = puzzles[index];
    
    game = new Chess(puzzle.fen);
    board.position(puzzle.fen);
    
    puzzleMoves = puzzle.moves;
    currentMoveIndex = 0;
    isShowingSolution = false;
    
    updateUI();
    clearMoveHistory();
    
    const sideToMove = game.turn() === 'w' ? 'White' : 'Black';
    updateStatus(`Find the best move for ${sideToMove}`);
    
    document.getElementById('showSolution').disabled = false;
}

function updateUI() {
    document.getElementById('puzzleNumber').textContent = `${currentPuzzle + 1} / ${puzzles.length}`;
    
    const sideToMove = game.turn() === 'w' ? 'White' : 'Black';
    const sideElement = document.getElementById('sideToMove');
    sideElement.textContent = sideToMove;
    sideElement.className = sideToMove.toLowerCase();
    
    document.getElementById('prevPuzzle').disabled = currentPuzzle === 0;
    document.getElementById('nextPuzzle').disabled = currentPuzzle === puzzles.length - 1;
}

function updateStatus(message, type = '') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = type;
}

function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;
    if (isShowingSolution) return false;
    
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    // Check if this is a pawn promotion
    const piece = game.get(source);
    const targetRank = target[1];
    const isPromotion = piece && piece.type === 'p' && 
                       ((piece.color === 'w' && targetRank === '8') || 
                        (piece.color === 'b' && targetRank === '1'));
    
    if (isPromotion) {
        // Store the move details and show promotion dialog
        pendingPromotion = { source, target };
        showPromotionDialog();
        return;
    }
    
    // Normal move (non-promotion)
    const move = game.move({
        from: source,
        to: target
    });
    
    if (move === null) return 'snapback';
    
    const isCorrect = checkMove(move);
    addMoveToHistory(move.san, isCorrect);
    
    if (isCorrect) {
        currentMoveIndex++;
        
        if (currentMoveIndex < puzzleMoves.length) {
            setTimeout(makeComputerMove, 250);
        }
    }
}

function onSnapEnd() {
    board.position(game.fen());
}

function checkMove(move) {
    const expectedMove = puzzleMoves[currentMoveIndex];
    
    if (!expectedMove) return false;
    
    const moveNotation = move.san.replace(/[+#]/g, '');
    const expectedNotation = expectedMove.replace(/[+#]/g, '');
    
    if (moveNotation === expectedNotation) {
        if (currentMoveIndex + 1 >= puzzleMoves.length) {
            updateStatus('Puzzle solved! Well done!', 'solved');
            document.getElementById('showSolution').disabled = true;
            setTimeout(() => showSuccessNotification(), 500);
        } else {
            updateStatus('Correct! Keep going...', 'correct');
        }
        return true;
    } else {
        updateStatus('Not quite right. Try again!', 'incorrect');
        setTimeout(() => {
            game.undo();
            board.position(game.fen());
            updateStatus('Try a different move', '');
        }, 1500);
        return false;
    }
}

function makeComputerMove() {
    if (currentMoveIndex >= puzzleMoves.length) return;
    
    const moveNotation = puzzleMoves[currentMoveIndex];
    const move = game.move(moveNotation);
    
    if (move) {
        board.position(game.fen());
        currentMoveIndex++;
        addMoveToHistory(move.san, true);
        
        if (currentMoveIndex >= puzzleMoves.length) {
            updateStatus('Puzzle solved! Well done!', 'solved');
            document.getElementById('showSolution').disabled = true;
        }
    }
}

function showSolution() {
    if (isShowingSolution) return;
    
    isShowingSolution = true;
    document.getElementById('showSolution').disabled = true;
    updateStatus('Showing solution...', 'solved');
    
    const startingFen = puzzles[currentPuzzle].fen;
    game = new Chess(startingFen);
    board.position(startingFen);
    currentMoveIndex = 0;
    clearMoveHistory();
    
    function playNextMove() {
        if (currentMoveIndex >= puzzleMoves.length) {
            updateStatus('Solution complete', 'solved');
            return;
        }
        
        const moveNotation = puzzleMoves[currentMoveIndex];
        const move = game.move(moveNotation);
        
        if (move) {
            board.position(game.fen());
            currentMoveIndex++;
            addMoveToHistory(move.san, true);
            setTimeout(playNextMove, 1000);
        }
    }
    
    setTimeout(playNextMove, 500);
}

function addMoveToHistory(san, isCorrect) {
    const moveList = document.getElementById('moveList');
    const moveNumber = Math.ceil((game.history().length) / 2);
    const isWhiteMove = game.history().length % 2 === 1;
    
    if (isWhiteMove) {
        const movePair = document.createElement('div');
        movePair.className = 'move-pair';
        movePair.innerHTML = `${moveNumber}. <span class="move ${isCorrect ? 'correct' : 'incorrect'}">${san}</span>`;
        moveList.appendChild(movePair);
    } else {
        const lastPair = moveList.lastElementChild;
        if (lastPair) {
            lastPair.innerHTML += ` <span class="move ${isCorrect ? 'correct' : 'incorrect'}">${san}</span>`;
        }
    }
}

function clearMoveHistory() {
    document.getElementById('moveList').innerHTML = '';
}

document.getElementById('prevPuzzle').addEventListener('click', () => {
    loadPuzzle(currentPuzzle - 1);
});

document.getElementById('nextPuzzle').addEventListener('click', () => {
    loadPuzzle(currentPuzzle + 1);
});

document.getElementById('resetPuzzle').addEventListener('click', () => {
    loadPuzzle(currentPuzzle);
});

document.getElementById('showSolution').addEventListener('click', showSolution);

document.addEventListener('DOMContentLoaded', initBoard);

// Success notification
function showSuccessNotification() {
    const notification = document.getElementById('successNotification');
    const message = document.getElementById('successMessage');
    const puzzle = puzzles[currentPuzzle];
    
    // Update message based on puzzle type
    if (puzzle.description.includes('Mate in 2')) {
        message.textContent = 'Checkmate! ♔';
    } else {
        message.textContent = 'Puzzle solved!';
    }
    
    // Show notification
    notification.style.display = 'flex';
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.style.display = 'none';
            notification.classList.remove('show', 'hide');
            
            // Auto-advance to next puzzle
            if (currentPuzzle < puzzles.length - 1) {
                loadPuzzle(currentPuzzle + 1);
            }
        }, 300);
    }, 2000);
}

// Promotion dialog functions
function showPromotionDialog() {
    const overlay = document.getElementById('promotionOverlay');
    overlay.style.display = 'flex';
    
    // Add click handlers for promotion pieces
    const pieces = document.querySelectorAll('.promotion-piece');
    pieces.forEach(piece => {
        piece.onclick = () => handlePromotion(piece.dataset.piece);
    });
}

function handlePromotion(promotionPiece) {
    const overlay = document.getElementById('promotionOverlay');
    overlay.style.display = 'none';
    
    if (!pendingPromotion) return;
    
    // Make the promotion move
    const move = game.move({
        from: pendingPromotion.source,
        to: pendingPromotion.target,
        promotion: promotionPiece
    });
    
    if (move === null) {
        // Invalid move, reset board
        board.position(game.fen());
        pendingPromotion = null;
        return;
    }
    
    // Update board position
    board.position(game.fen());
    
    const isCorrect = checkMove(move);
    addMoveToHistory(move.san, isCorrect);
    
    if (isCorrect) {
        currentMoveIndex++;
        
        if (currentMoveIndex < puzzleMoves.length) {
            setTimeout(makeComputerMove, 250);
        }
    }
    
    pendingPromotion = null;
}