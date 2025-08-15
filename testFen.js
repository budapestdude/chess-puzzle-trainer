const { Chess } = require('chess.js');

// Test first mate-in-2 puzzle
const fen = 'r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 0 1';
const game = new Chess(fen);

console.log('FEN:', fen);
console.log('Turn:', game.turn() === 'w' ? 'White' : 'Black');
console.log('FEN loaded successfully');

// Try to make the first move
const move = game.move('Nf6+');
console.log('Can make Nf6+:', move !== null);

if (move) {
    console.log('Move made successfully');
    console.log('Turn after move:', game.turn() === 'w' ? 'White' : 'Black');
}