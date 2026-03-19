/**
 * ScoreCalculator Tests
 *
 * Validates All Fives scoring, winner pip scoring (FFA and 2v2),
 * and blocked-game winner determination.
 */

const ScoreCalculator = require('../engine/ScoreCalculator');

describe('ScoreCalculator', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ScoreCalculator();
    });

    // ── All Fives ───────────────────────────────────────────────

    describe('calculateAllFivesPoints()', () => {
        test('returns 0 for empty board', () => {
            expect(scorer.calculateAllFivesPoints([])).toBe(0);
        });

        test('single tile: sum of both pips if divisible by 5', () => {
            // [2,3] → 5, divisible by 5
            const board = [{ left: 2, right: 3 }];
            expect(scorer.calculateAllFivesPoints(board)).toBe(5);
        });

        test('single tile: 0 if not divisible by 5', () => {
            // [1,2] → 3
            const board = [{ left: 1, right: 2 }];
            expect(scorer.calculateAllFivesPoints(board)).toBe(0);
        });

        test('multi-tile: double on left counts both pips', () => {
            // Board: [5,5] [5,0] → left exposed: 5+5=10, right exposed: 0 → total 10
            const board = [{ left: 5, right: 5 }, { left: 5, right: 0 }];
            expect(scorer.calculateAllFivesPoints(board)).toBe(10);
        });

        test('multi-tile: non-double counts only exposed pip', () => {
            // Board: [1,5] [5,0] → left exposed: 1, right exposed: 0 → total 1
            const board = [{ left: 1, right: 5 }, { left: 5, right: 0 }];
            expect(scorer.calculateAllFivesPoints(board)).toBe(0);
        });

        test('multi-tile: both ends sum to 15', () => {
            // Board: [5,5][5,5] → left double 10, right double 10 → 20... 
            // Actually [5,5] at left: counts 10. [5,5] at right: counts 10. Total 20.
            const board = [{ left: 5, right: 5 }, { left: 5, right: 5 }];
            expect(scorer.calculateAllFivesPoints(board)).toBe(20);
        });
    });

    // ── Winner Score (Round End) ────────────────────────────────

    describe('calculateWinnerScore()', () => {
        test('FFA: winner gets sum of all opponents pips', () => {
            const players = {
                'p1': { hand: [] },                                          // winner
                'p2': { hand: [{ left: 3, right: 4 }] },                    // 7 pips
                'p3': { hand: [{ left: 1, right: 2 }, { left: 5, right: 6 }] } // 14 pips
            };
            const result = scorer.calculateWinnerScore('p1', players, ['p1', 'p2', 'p3'], 'Free For All');
            expect(result).toBe(21); // 7 + 14
        });

        test('2v2: winner gets both opponents pips (not partner)', () => {
            const players = {
                'p1': { hand: [] },                                    // winner (Team 1)
                'p2': { hand: [{ left: 6, right: 6 }] },              // 12 pips (Team 2)
                'p3': { hand: [{ left: 1, right: 1 }] },              // 2 pips (Team 1 partner)
                'p4': { hand: [{ left: 3, right: 3 }] },              // 6 pips (Team 2)
            };
            // p1 is at index 0, opponents are at index 1 (p2) and index 3 (p4)
            const result = scorer.calculateWinnerScore('p1', players, ['p1', 'p2', 'p3', 'p4'], '2v2');
            expect(result).toBe(18); // 12 + 6
        });
    });

    // ── Blocked Winner ──────────────────────────────────────────

    describe('calculateBlockedWinner()', () => {
        test('FFA: lowest pip total wins', () => {
            const players = {
                'p1': { hand: [{ left: 5, right: 6 }] },   // 11
                'p2': { hand: [{ left: 1, right: 0 }] },   // 1
                'p3': { hand: [{ left: 3, right: 3 }] },   // 6
            };
            const result = scorer.calculateBlockedWinner(players, ['p1', 'p2', 'p3'], 'Free For All', null);
            expect(result.blockedWinner).toBe('p2');
            expect(result.totals).toEqual({ p1: 11, p2: 1, p3: 6 });
        });

        test('2v2: lower team total wins', () => {
            const players = {
                'p1': { hand: [{ left: 1, right: 0 }] },   // 1  (Team 1)
                'p2': { hand: [{ left: 5, right: 6 }] },   // 11 (Team 2)
                'p3': { hand: [{ left: 2, right: 0 }] },   // 2  (Team 1)
                'p4': { hand: [{ left: 3, right: 3 }] },   // 6  (Team 2)
            };
            // Team 1 total: 3, Team 2 total: 17
            const result = scorer.calculateBlockedWinner(players, ['p1', 'p2', 'p3', 'p4'], '2v2', null);
            expect(result.winningTeam).toBe(1);
            expect(result.blockedWinner).toBe('p1'); // lowest on winning team
        });

        test('2v2: tie goes to lastPlayerToMove', () => {
            const players = {
                'p1': { hand: [{ left: 3, right: 0 }] },   // 3
                'p2': { hand: [{ left: 2, right: 1 }] },   // 3
                'p3': { hand: [{ left: 1, right: 2 }] },   // 3
                'p4': { hand: [{ left: 0, right: 3 }] },   // 3
            };
            // Team 1: 6, Team 2: 6 → tie
            const result = scorer.calculateBlockedWinner(players, ['p1', 'p2', 'p3', 'p4'], '2v2', 'p3');
            expect(result.blockedWinner).toBe('p3');
        });
    });
});
