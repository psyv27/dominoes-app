/**
 * TurnManager Tests
 *
 * Validates starting player selection, turn advancement,
 * pass tracking, and blocked detection.
 */

const TurnManager = require('../engine/TurnManager');

describe('TurnManager', () => {
    let turnMgr;

    beforeEach(() => {
        turnMgr = new TurnManager();
    });

    // ── Starting Player ─────────────────────────────────────────

    describe('determineStartingPlayer()', () => {
        test('round 1 Normal: player with [1,1] starts', () => {
            const players = {
                'p1': { hand: [{ left: 5, right: 6 }, { left: 0, right: 0 }] },
                'p2': { hand: [{ left: 1, right: 1 }, { left: 2, right: 3 }] },
            };
            const starter = turnMgr.determineStartingPlayer(players, ['p1', 'p2'], 1, 'Normal', null, null);
            expect(starter).toBe('p2');
        });

        test('round 1 Blocking: player with [1,1] starts', () => {
            const players = {
                'p1': { hand: [{ left: 1, right: 1 }] },
                'p2': { hand: [{ left: 6, right: 6 }] },
            };
            const starter = turnMgr.determineStartingPlayer(players, ['p1', 'p2'], 1, 'Blocking', null, null);
            expect(starter).toBe('p1');
        });

        test('round 1: fallback to next lowest double if no [1,1]', () => {
            const players = {
                'p1': { hand: [{ left: 5, right: 6 }] },
                'p2': { hand: [{ left: 2, right: 2 }] },
            };
            const starter = turnMgr.determineStartingPlayer(players, ['p1', 'p2'], 1, 'Normal', null, null);
            expect(starter).toBe('p2');
        });

        test('round 2+: previous winner starts', () => {
            const players = {
                'p1': { hand: [{ left: 1, right: 1 }] },
                'p2': { hand: [{ left: 6, right: 6 }] },
            };
            const starter = turnMgr.determineStartingPlayer(players, ['p1', 'p2'], 2, 'Normal', 'p2', null);
            expect(starter).toBe('p2');
        });

        test('round 2+: previous blocker starts if no winner', () => {
            const players = {
                'p1': { hand: [{ left: 1, right: 1 }] },
                'p2': { hand: [{ left: 6, right: 6 }] },
            };
            const starter = turnMgr.determineStartingPlayer(players, ['p1', 'p2'], 3, 'Normal', null, 'p1');
            expect(starter).toBe('p1');
        });

        test('All Fives round 1: highest double starts (no [1,1] rule)', () => {
            const players = {
                'p1': { hand: [{ left: 1, right: 1 }] },
                'p2': { hand: [{ left: 6, right: 6 }] },
            };
            const starter = turnMgr.determineStartingPlayer(players, ['p1', 'p2'], 1, 'All Fives', null, null);
            expect(starter).toBe('p2'); // highest double
        });

        test('fallback: highest pip total when no doubles', () => {
            const players = {
                'p1': { hand: [{ left: 0, right: 1 }] },      // 1 pip
                'p2': { hand: [{ left: 5, right: 6 }] },      // 11 pips
            };
            const starter = turnMgr.determineStartingPlayer(players, ['p1', 'p2'], 1, 'All Fives', null, null);
            expect(starter).toBe('p2');
        });
    });

    // ── Turn Advancement ────────────────────────────────────────

    describe('nextTurn()', () => {
        test('advances to next player in order', () => {
            expect(turnMgr.nextTurn('p1', ['p1', 'p2', 'p3'])).toBe('p2');
            expect(turnMgr.nextTurn('p2', ['p1', 'p2', 'p3'])).toBe('p3');
        });

        test('wraps around to first player', () => {
            expect(turnMgr.nextTurn('p3', ['p1', 'p2', 'p3'])).toBe('p1');
        });
    });

    // ── Pass Tracking ───────────────────────────────────────────

    describe('pass tracking', () => {
        test('records and stores passed numbers', () => {
            turnMgr.resetPassTracking(['p1', 'p2']);
            turnMgr.recordPass('p1', [3, 5]);
            turnMgr.recordPass('p1', [4]);
            expect(turnMgr.passTracking['p1']).toEqual([3, 5, 4]);
        });

        test('reset clears all tracking', () => {
            turnMgr.recordPass('p1', [3, 5]);
            turnMgr.resetPassTracking(['p1', 'p2']);
            expect(turnMgr.passTracking['p1']).toEqual([]);
            expect(turnMgr.passTracking['p2']).toEqual([]);
        });
    });

    // ── Blocked Detection ───────────────────────────────────────

    describe('isBlocked()', () => {
        test('not blocked when boneyard has tiles', () => {
            const players = { 'p1': { hand: [{ left: 0, right: 0 }] } };
            const deck = [{ left: 1, right: 2 }];
            const board = [{ left: 6, right: 6 }];
            expect(turnMgr.isBlocked(players, ['p1'], deck, board)).toBe(false);
        });

        test('not blocked when a player has a valid move', () => {
            const players = {
                'p1': { hand: [{ left: 6, right: 5 }] },  // matches board end 6
            };
            const board = [{ left: 3, right: 6 }];
            expect(turnMgr.isBlocked(players, ['p1'], [], board)).toBe(false);
        });

        test('blocked when boneyard empty and no one can move', () => {
            const players = {
                'p1': { hand: [{ left: 0, right: 0 }] },
                'p2': { hand: [{ left: 1, right: 1 }] },
            };
            const board = [{ left: 5, right: 6 }]; // ends: 5, 6 — no one has these
            expect(turnMgr.isBlocked(players, ['p1', 'p2'], [], board)).toBe(true);
        });
    });
});
