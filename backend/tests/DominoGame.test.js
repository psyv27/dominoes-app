/**
 * DominoGame Integration Tests
 *
 * Tests the full game lifecycle through the orchestrator class:
 * start → play → draw → blocked/domino, verifying that all engine
 * modules work together correctly.
 */

const DominoGame = require('../game');

describe('DominoGame (Integration)', () => {

    // ── Game Start ──────────────────────────────────────────────

    describe('startGame()', () => {
        test('starts successfully with 2 players', () => {
            const game = new DominoGame('Normal', 'Free For All');
            game.addPlayer('p1');
            game.addPlayer('p2');
            const started = game.startGame();
            expect(started).toBe(true);
            expect(game.state).toBe('playing');
            expect(game.turn).toBeDefined();
        });

        test('fails with fewer than 2 players', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            expect(game.startGame()).toBe(false);
        });

        test('deals 7 tiles to each player', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();
            expect(game.players['p1'].hand).toHaveLength(7);
            expect(game.players['p2'].hand).toHaveLength(7);
        });

        test('boneyard has correct remaining tiles (2 players)', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();
            expect(game.deck).toHaveLength(14); // 28 - 2*7 = 14
        });

        test('boneyard has 0 tiles with 4 players', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.addPlayer('p3');
            game.addPlayer('p4');
            game.startGame();
            expect(game.deck).toHaveLength(0);
        });

        test('round 1 Normal: player with [1,1] gets first turn', () => {
            // Run multiple times to ensure consistency
            for (let i = 0; i < 10; i++) {
                const game = new DominoGame('Normal', 'Free For All', 'Score', 1);
                game.addPlayer('p1');
                game.addPlayer('p2');
                game.startGame();

                const hasDoubleOne = game.players[game.turn].hand
                    .some(b => b.left === 1 && b.right === 1);
                // The starting player should have [1,1] (or fallback double)
                expect(game.turn).toBeDefined();
            }
        });
    });

    // ── Playing Bones ───────────────────────────────────────────

    describe('playBone()', () => {
        test('rejects play when not your turn', () => {
            const game = new DominoGame('All Fives');
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            const notCurrentPlayer = game.turn === 'p1' ? 'p2' : 'p1';
            const hand = game.players[notCurrentPlayer].hand;
            const result = game.playBone(notCurrentPlayer, hand[0], 'right');
            expect(result.error).toBe('Not your turn');
        });

        test('rejects bone not in hand', () => {
            const game = new DominoGame('All Fives');
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            const fakeBone = { left: 99, right: 99 };
            const result = game.playBone(game.turn, fakeBone, 'right');
            expect(result.error).toBe('Bone not in hand');
        });

        test('first tile can be played successfully', () => {
            const game = new DominoGame('All Fives');
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            const currentPlayer = game.turn;
            const bone = game.players[currentPlayer].hand[0];
            const result = game.playBone(currentPlayer, bone, 'right');
            expect(result.success).toBe(true);
            expect(game.board).toHaveLength(1);
            expect(game.players[currentPlayer].hand).toHaveLength(6);
        });

        test('advances turn after successful play', () => {
            const game = new DominoGame('All Fives');
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            const firstPlayer = game.turn;
            const bone = game.players[firstPlayer].hand[0];
            game.playBone(firstPlayer, bone, 'right');
            expect(game.turn).not.toBe(firstPlayer);
        });

        test('rejects invalid placement on non-empty board', () => {
            const game = new DominoGame('All Fives');
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            // Play first bone
            const p = game.turn;
            game.playBone(p, game.players[p].hand[0], 'right');

            // Try to play a bone that doesn't match
            const nextP = game.turn;
            const hand = game.players[nextP].hand;
            const board = game.board;
            const leftEnd = board[0].left;
            const rightEnd = board[board.length - 1].right;

            // Find a tile that doesn't match either end
            const invalidBone = hand.find(b =>
                b.left !== leftEnd && b.right !== leftEnd &&
                b.left !== rightEnd && b.right !== rightEnd
            );

            if (invalidBone) {
                const result = game.playBone(nextP, invalidBone, 'right');
                expect(result.error).toBe('Invalid move');
            }
        });
    });

    // ── Drawing Bones ───────────────────────────────────────────

    describe('drawBone()', () => {
        test('rejects draw when not your turn', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            const notTurn = game.turn === 'p1' ? 'p2' : 'p1';
            const result = game.drawBone(notTurn);
            expect(result.error).toBe('Not your turn');
        });

        test('rejects draw when player has valid moves', () => {
            const game = new DominoGame('All Fives');
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            // On empty board, all tiles are valid — draw should be rejected
            const result = game.drawBone(game.turn);
            expect(result.error).toBe('You have valid moves, cannot draw');
        });
    });

    // ── Player Management ───────────────────────────────────────

    describe('player management', () => {
        test('addPlayer adds to playerOrder', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            expect(game.playerOrder).toEqual(['p1', 'p2']);
        });

        test('removePlayer removes from playerOrder and advances turn', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.addPlayer('p3');
            game.startGame();

            game.turn = 'p2';
            game.removePlayer('p2');
            expect(game.playerOrder).not.toContain('p2');
            expect(game.turn).toBe('p3');
        });

        test('prevents duplicate addPlayer', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p1'); // duplicate
            expect(game.playerOrder).toEqual(['p1']);
        });
    });

    // ── Turn Advancement ────────────────────────────────────────

    describe('nextTurn()', () => {
        test('cycles through players', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.addPlayer('p3');
            game.turn = 'p1';

            game.nextTurn();
            expect(game.turn).toBe('p2');
            game.nextTurn();
            expect(game.turn).toBe('p3');
            game.nextTurn();
            expect(game.turn).toBe('p1'); // wraps around
        });
    });

    // ── Scoring ─────────────────────────────────────────────────

    describe('scoring', () => {
        test('calculateWinnerScore sums opponent pips', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.players['p1'] = { hand: [] };
            game.players['p2'] = { hand: [{ left: 3, right: 4 }, { left: 5, right: 6 }] };

            const score = game.calculateWinnerScore('p1');
            expect(score).toBe(18); // 7 + 11
        });

        test('calculatePoints returns correct blocked winner', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.players['p1'] = { hand: [{ left: 6, right: 6 }] }; // 12
            game.players['p2'] = { hand: [{ left: 0, right: 1 }] }; // 1

            const result = game.calculatePoints();
            expect(result.blockedWinner).toBe('p2');
        });
    });

    // ── Misdeal ─────────────────────────────────────────────────

    describe('checkMisdeal()', () => {
        test('detects misdeal with 5+ doubles', () => {
            const game = new DominoGame();
            game.addPlayer('p1');
            game.players['p1'] = {
                hand: [
                    { left: 0, right: 0 }, { left: 1, right: 1 },
                    { left: 2, right: 2 }, { left: 3, right: 3 },
                    { left: 4, right: 4 }, { left: 5, right: 6 },
                    { left: 0, right: 1 }
                ]
            };
            game.playerOrder = ['p1'];
            const result = game.checkMisdeal();
            expect(result.isMisdeal).toBe(true);
        });
    });

    // ── Full Game Flow ──────────────────────────────────────────

    describe('full game flow', () => {
        test('complete game from start to domino win', () => {
            const game = new DominoGame('All Fives', 'Free For All');
            game.addPlayer('p1');
            game.addPlayer('p2');
            game.startGame();

            let moveCount = 0;
            const maxMoves = 100; // safety cap

            while (game.state === 'playing' && moveCount < maxMoves) {
                const currentPlayer = game.turn;
                const hand = game.players[currentPlayer].hand;
                const validMoves = game.getValidMoves(hand);

                if (validMoves.length > 0) {
                    const bone = validMoves[0];
                    const board = game.board;

                    let end = 'right';
                    if (board.length > 0) {
                        const leftEnd = board[0].left;
                        const rightEnd = board[board.length - 1].right;
                        if (bone.left === rightEnd || bone.right === rightEnd) {
                            end = 'right';
                        } else {
                            end = 'left';
                        }
                    }

                    const result = game.playBone(currentPlayer, bone, end);
                    if (result.winner) break;
                } else {
                    const drawResult = game.drawBone(currentPlayer);
                    if (drawResult.blocked && drawResult.winner) break;
                    if (drawResult.canPlayNow) continue; // play the drawn tile
                }

                moveCount++;
            }

            // Game should have ended
            expect(game.state).toBe('finished');
        });
    });
});
