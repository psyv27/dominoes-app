/**
 * DeckManager Tests
 *
 * Validates deck generation (28 unique tiles), Fisher-Yates shuffle,
 * dealing hands, and drawing from the boneyard.
 */

const DeckManager = require('../engine/DeckManager');

describe('DeckManager', () => {

    // ── Generation ──────────────────────────────────────────────

    describe('generate()', () => {
        test('produces exactly 28 tiles', () => {
            const dm = new DeckManager();
            dm.generate();
            expect(dm.tiles).toHaveLength(28);
        });

        test('all tiles have left <= right (canonical form)', () => {
            const dm = new DeckManager();
            dm.generate();
            dm.tiles.forEach(t => {
                expect(t.left).toBeLessThanOrEqual(t.right);
            });
        });

        test('no duplicate tiles', () => {
            const dm = new DeckManager();
            dm.generate();
            const keys = dm.tiles.map(t => `${t.left}-${t.right}`);
            expect(new Set(keys).size).toBe(28);
        });

        test('tile values are within 0-6 range', () => {
            const dm = new DeckManager();
            dm.generate();
            dm.tiles.forEach(t => {
                expect(t.left).toBeGreaterThanOrEqual(0);
                expect(t.left).toBeLessThanOrEqual(6);
                expect(t.right).toBeGreaterThanOrEqual(0);
                expect(t.right).toBeLessThanOrEqual(6);
            });
        });

        test('contains all 7 doubles (0-0 through 6-6)', () => {
            const dm = new DeckManager();
            dm.generate();
            for (let i = 0; i <= 6; i++) {
                const hasDouble = dm.tiles.some(t => t.left === i && t.right === i);
                expect(hasDouble).toBe(true);
            }
        });
    });

    // ── Shuffle ─────────────────────────────────────────────────

    describe('shuffle()', () => {
        test('maintains 28 tiles after shuffle', () => {
            const dm = new DeckManager();
            dm.generate().shuffle();
            expect(dm.tiles).toHaveLength(28);
        });

        test('changes tile order (statistical — may rarely fail)', () => {
            const dm = new DeckManager();
            dm.generate();
            const original = dm.tiles.map(t => `${t.left}-${t.right}`).join(',');
            dm.shuffle();
            const shuffled = dm.tiles.map(t => `${t.left}-${t.right}`).join(',');
            // Extremely unlikely to be identical (1/28! chance)
            expect(shuffled).not.toBe(original);
        });

        test('preserves all tiles (no tiles lost or gained)', () => {
            const dm = new DeckManager();
            dm.generate();
            const originalSet = new Set(dm.tiles.map(t => `${t.left}-${t.right}`));
            dm.shuffle();
            const shuffledSet = new Set(dm.tiles.map(t => `${t.left}-${t.right}`));
            expect(shuffledSet).toEqual(originalSet);
        });
    });

    // ── Deal ────────────────────────────────────────────────────

    describe('deal()', () => {
        test('deals 7 tiles to each of 2 players, leaves 14 in boneyard', () => {
            const dm = new DeckManager();
            dm.generate().shuffle();
            const { hands, boneyard } = dm.deal(2, 7);
            expect(hands).toHaveLength(2);
            expect(hands[0]).toHaveLength(7);
            expect(hands[1]).toHaveLength(7);
            expect(boneyard).toHaveLength(14);
        });

        test('deals 7 tiles to each of 4 players, leaves 0 in boneyard', () => {
            const dm = new DeckManager();
            dm.generate().shuffle();
            const { hands, boneyard } = dm.deal(4, 7);
            expect(hands).toHaveLength(4);
            hands.forEach(h => expect(h).toHaveLength(7));
            expect(boneyard).toHaveLength(0);
        });

        test('all 28 tiles accounted for across hands + boneyard', () => {
            const dm = new DeckManager();
            dm.generate().shuffle();
            const { hands, boneyard } = dm.deal(3, 7);
            const allTiles = [...hands.flat(), ...boneyard];
            expect(allTiles).toHaveLength(28);
        });
    });

    // ── Draw ────────────────────────────────────────────────────

    describe('draw()', () => {
        test('returns a tile and decrements remaining', () => {
            const dm = new DeckManager();
            dm.generate().shuffle();
            dm.deal(2, 7); // leaves 14 in boneyard internally
            // After deal, dm.tiles is modified in place
            // Actually deal takes from tiles, so remaining tiles are in dm.tiles
            const initialCount = dm.remaining;
            const tile = dm.draw();
            expect(tile).not.toBeNull();
            expect(dm.remaining).toBe(initialCount - 1);
        });

        test('returns null when boneyard is empty', () => {
            const dm = new DeckManager();
            dm.generate().shuffle();
            dm.deal(4, 7); // takes all 28
            expect(dm.draw()).toBeNull();
            expect(dm.remaining).toBe(0);
        });
    });
});
