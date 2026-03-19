/**
 * InputValidator Tests
 *
 * Validates payload sanitization for playBone, drawBone,
 * bone objects, room IDs, and end selectors.
 */

const InputValidator = require('../engine/InputValidator');

describe('InputValidator', () => {

    // ── validateBone ────────────────────────────────────────────

    describe('validateBone()', () => {
        test('accepts valid bone {left: 3, right: 5}', () => {
            expect(InputValidator.validateBone({ left: 3, right: 5 }).valid).toBe(true);
        });

        test('accepts double {left: 0, right: 0}', () => {
            expect(InputValidator.validateBone({ left: 0, right: 0 }).valid).toBe(true);
        });

        test('accepts max values {left: 6, right: 6}', () => {
            expect(InputValidator.validateBone({ left: 6, right: 6 }).valid).toBe(true);
        });

        test('rejects null', () => {
            expect(InputValidator.validateBone(null).valid).toBe(false);
        });

        test('rejects string', () => {
            expect(InputValidator.validateBone('1-2').valid).toBe(false);
        });

        test('rejects out-of-range values', () => {
            expect(InputValidator.validateBone({ left: 7, right: 3 }).valid).toBe(false);
            expect(InputValidator.validateBone({ left: -1, right: 3 }).valid).toBe(false);
        });

        test('rejects non-integer values', () => {
            expect(InputValidator.validateBone({ left: 1.5, right: 3 }).valid).toBe(false);
        });

        test('rejects missing properties', () => {
            expect(InputValidator.validateBone({ left: 3 }).valid).toBe(false);
        });
    });

    // ── validateEnd ─────────────────────────────────────────────

    describe('validateEnd()', () => {
        test('accepts "left"', () => {
            expect(InputValidator.validateEnd('left').valid).toBe(true);
        });

        test('accepts "right"', () => {
            expect(InputValidator.validateEnd('right').valid).toBe(true);
        });

        test('rejects "middle"', () => {
            expect(InputValidator.validateEnd('middle').valid).toBe(false);
        });

        test('rejects null', () => {
            expect(InputValidator.validateEnd(null).valid).toBe(false);
        });

        test('rejects numbers', () => {
            expect(InputValidator.validateEnd(0).valid).toBe(false);
        });
    });

    // ── validateRoomId ──────────────────────────────────────────

    describe('validateRoomId()', () => {
        test('accepts valid room ID string', () => {
            expect(InputValidator.validateRoomId('abc12345').valid).toBe(true);
        });

        test('rejects null', () => {
            expect(InputValidator.validateRoomId(null).valid).toBe(false);
        });

        test('rejects undefined', () => {
            expect(InputValidator.validateRoomId(undefined).valid).toBe(false);
        });

        test('rejects empty string', () => {
            expect(InputValidator.validateRoomId('').valid).toBe(false);
        });

        test('rejects string longer than 64 chars', () => {
            expect(InputValidator.validateRoomId('a'.repeat(65)).valid).toBe(false);
        });

        test('accepts numeric room ID (auto-converted to string)', () => {
            expect(InputValidator.validateRoomId(12345).valid).toBe(true);
        });
    });

    // ── validatePlayBonePayload ─────────────────────────────────

    describe('validatePlayBonePayload()', () => {
        test('accepts complete valid payload', () => {
            const data = { roomId: 'room1', bone: { left: 3, right: 5 }, end: 'left' };
            const result = InputValidator.validatePlayBonePayload(data);
            expect(result.valid).toBe(true);
            expect(result.sanitized).toEqual({
                roomId: 'room1',
                bone: { left: 3, right: 5 },
                end: 'left'
            });
        });

        test('rejects null payload', () => {
            expect(InputValidator.validatePlayBonePayload(null).valid).toBe(false);
        });

        test('rejects payload with invalid bone', () => {
            const data = { roomId: 'room1', bone: { left: 99, right: 5 }, end: 'left' };
            expect(InputValidator.validatePlayBonePayload(data).valid).toBe(false);
        });

        test('rejects payload with invalid end', () => {
            const data = { roomId: 'room1', bone: { left: 3, right: 5 }, end: 'top' };
            expect(InputValidator.validatePlayBonePayload(data).valid).toBe(false);
        });

        test('rejects payload with missing roomId', () => {
            const data = { bone: { left: 3, right: 5 }, end: 'left' };
            expect(InputValidator.validatePlayBonePayload(data).valid).toBe(false);
        });
    });

    // ── validateDrawBonePayload ─────────────────────────────────

    describe('validateDrawBonePayload()', () => {
        test('accepts valid room ID', () => {
            expect(InputValidator.validateDrawBonePayload('room1').valid).toBe(true);
        });

        test('rejects null', () => {
            expect(InputValidator.validateDrawBonePayload(null).valid).toBe(false);
        });
    });
});
