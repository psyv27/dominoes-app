/**
 * MoveValidator Tests
 *
 * Validates move legality, bone orientation, misdeal detection,
 * and first-play rules.
 */

const MoveValidator = require('../engine/MoveValidator');

describe('MoveValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new MoveValidator();
    });

    // ── getValidMoves ───────────────────────────────────────────

    describe('getValidMoves()', () => {
        test('returns all tiles when board is empty', () => {
            const hand = [{ left: 1, right: 2 }, { left: 3, right: 4 }];
            const result = validator.getValidMoves(hand, []);
            expect(result).toHaveLength(2);
        });

        test('returns only matching tiles for non-empty board', () => {
            const board = [{ left: 3, right: 5 }]; // open ends: 3, 5
            const hand = [
                { left: 5, right: 6 },  // matches right end (5)
                { left: 1, right: 3 },  // matches left end (3)
                { left: 0, right: 0 },  // no match
            ];
            const result = validator.getValidMoves(hand, board);
            expect(result).toHaveLength(2);
            expect(result).toContainEqual({ left: 5, right: 6 });
            expect(result).toContainEqual({ left: 1, right: 3 });
        });

        test('returns empty array when no tiles match', () => {
            const board = [{ left: 6, right: 6 }]; // open ends: 6, 6
            const hand = [{ left: 0, right: 1 }, { left: 2, right: 3 }];
            const result = validator.getValidMoves(hand, board);
            expect(result).toHaveLength(0);
        });

        test('handles both ends matching same tile', () => {
            const board = [{ left: 3, right: 3 }]; // both ends are 3
            const hand = [{ left: 3, right: 5 }];
            const result = validator.getValidMoves(hand, board);
            expect(result).toHaveLength(1);
        });
    });

    // ── validatePlay ────────────────────────────────────────────

    describe('validatePlay()', () => {
        test('valid left-end placement (bone.right matches)', () => {
            const board = [{ left: 4, right: 6 }];
            const result = validator.validatePlay({ left: 2, right: 4 }, 'left', board);
            expect(result.valid).toBe(true);
            expect(result.orientedBone).toEqual({ left: 2, right: 4 });
        });

        test('valid left-end placement (bone.left matches — flips bone)', () => {
            const board = [{ left: 4, right: 6 }];
            const result = validator.validatePlay({ left: 4, right: 2 }, 'left', board);
            expect(result.valid).toBe(true);
            expect(result.orientedBone).toEqual({ left: 2, right: 4 });
        });

        test('valid right-end placement (bone.left matches)', () => {
            const board = [{ left: 4, right: 6 }];
            const result = validator.validatePlay({ left: 6, right: 1 }, 'right', board);
            expect(result.valid).toBe(true);
            expect(result.orientedBone).toEqual({ left: 6, right: 1 });
        });

        test('valid right-end placement (bone.right matches — flips bone)', () => {
            const board = [{ left: 4, right: 6 }];
            const result = validator.validatePlay({ left: 1, right: 6 }, 'right', board);
            expect(result.valid).toBe(true);
            expect(result.orientedBone).toEqual({ left: 6, right: 1 });
        });

        test('rejects invalid left-end placement', () => {
            const board = [{ left: 4, right: 6 }];
            const result = validator.validatePlay({ left: 1, right: 2 }, 'left', board);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid move');
        });

        test('rejects invalid right-end placement', () => {
            const board = [{ left: 4, right: 6 }];
            const result = validator.validatePlay({ left: 1, right: 2 }, 'right', board);
            expect(result.valid).toBe(false);
        });

        test('rejects invalid end string', () => {
            const board = [{ left: 4, right: 6 }];
            const result = validator.validatePlay({ left: 4, right: 2 }, 'middle', board);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid move end');
        });
    });

    // ── First Play Rules ────────────────────────────────────────

    describe('_validateFirstPlay()', () => {
        test('allows any tile on empty board in All Fives mode', () => {
            const result = validator.validatePlay(
                { left: 5, right: 6 }, 'right', [],
                { currentRoundNumber: 1, gameMode: 'All Fives', hand: [] }
            );
            expect(result.valid).toBe(true);
        });

        test('forces [1,1] on round 1 Normal mode when player has it', () => {
            const hand = [{ left: 1, right: 1 }, { left: 5, right: 6 }];
            const result = validator.validatePlay(
                { left: 5, right: 6 }, 'right', [],
                { currentRoundNumber: 1, gameMode: 'Normal', hand }
            );
            expect(result.valid).toBe(false);
            expect(result.error).toBe('You must start with 1|1');
        });

        test('allows [1,1] on round 1 Normal mode', () => {
            const hand = [{ left: 1, right: 1 }, { left: 5, right: 6 }];
            const result = validator.validatePlay(
                { left: 1, right: 1 }, 'right', [],
                { currentRoundNumber: 1, gameMode: 'Normal', hand }
            );
            expect(result.valid).toBe(true);
        });

        test('allows any tile on round 2+ even in Normal mode', () => {
            const hand = [{ left: 1, right: 1 }, { left: 5, right: 6 }];
            const result = validator.validatePlay(
                { left: 5, right: 6 }, 'right', [],
                { currentRoundNumber: 2, gameMode: 'Normal', hand }
            );
            expect(result.valid).toBe(true);
        });
    });

    // ── Misdeal Detection ───────────────────────────────────────

    describe('checkMisdeal()', () => {
        test('valid hands return no misdeal', () => {
            const hands = [
                [{ left: 0, right: 1 }, { left: 2, right: 3 }, { left: 4, right: 5 }, { left: 6, right: 0 }, { left: 1, right: 2 }, { left: 3, right: 4 }, { left: 5, right: 6 }],
                [{ left: 0, right: 0 }, { left: 1, right: 1 }, { left: 2, right: 2 }, { left: 3, right: 3 }, { left: 0, right: 2 }, { left: 1, right: 3 }, { left: 4, right: 6 }],
            ];
            const result = validator.checkMisdeal(hands, ['p1', 'p2']);
            expect(result.isMisdeal).toBe(false);
        });

        test('detects 5+ doubles as misdeal', () => {
            const hand = [
                { left: 0, right: 0 }, { left: 1, right: 1 }, { left: 2, right: 2 },
                { left: 3, right: 3 }, { left: 4, right: 4 }, { left: 5, right: 6 }, { left: 0, right: 1 }
            ];
            const result = validator.checkMisdeal([hand], ['p1']);
            expect(result.isMisdeal).toBe(true);
            expect(result.reason).toContain('5 doubles');
        });

        test('detects 6+ tiles of same suit as misdeal', () => {
            // 6 tiles containing suit 0
            const hand = [
                { left: 0, right: 0 }, { left: 0, right: 1 }, { left: 0, right: 2 },
                { left: 0, right: 3 }, { left: 0, right: 4 }, { left: 0, right: 5 }, { left: 6, right: 6 }
            ];
            const result = validator.checkMisdeal([hand], ['p1']);
            expect(result.isMisdeal).toBe(true);
            expect(result.reason).toContain('suit 0');
        });

        test('detects 5 of suit without double as misdeal', () => {
            // 5 tiles containing suit 3 but no [3,3]
            const hand = [
                { left: 0, right: 3 }, { left: 1, right: 3 }, { left: 2, right: 3 },
                { left: 3, right: 4 }, { left: 3, right: 5 }, { left: 6, right: 6 }, { left: 0, right: 0 }
            ];
            const result = validator.checkMisdeal([hand], ['p1']);
            expect(result.isMisdeal).toBe(true);
            expect(result.reason).toContain('suit 3 without the double');
        });

        test('5 of suit WITH double is acceptable', () => {
            // 5 tiles of suit 3 including [3,3]
            const hand = [
                { left: 3, right: 3 }, { left: 1, right: 3 }, { left: 2, right: 3 },
                { left: 3, right: 4 }, { left: 3, right: 5 }, { left: 6, right: 6 }, { left: 0, right: 0 }
            ];
            const result = validator.checkMisdeal([hand], ['p1']);
            expect(result.isMisdeal).toBe(false);
        });
    });

    // ── Open Ends ───────────────────────────────────────────────

    describe('getOpenEnds()', () => {
        test('returns empty array for empty board', () => {
            expect(validator.getOpenEnds([])).toEqual([]);
        });

        test('returns both ends for non-empty board', () => {
            const board = [{ left: 1, right: 3 }, { left: 3, right: 5 }];
            expect(validator.getOpenEnds(board)).toEqual([1, 5]);
        });

        test('returns same value twice for single double tile', () => {
            const board = [{ left: 4, right: 4 }];
            expect(validator.getOpenEnds(board)).toEqual([4, 4]);
        });
    });
});
