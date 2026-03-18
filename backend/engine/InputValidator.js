/**
 * InputValidator — Sanitizes and validates all incoming socket payloads.
 *
 * Security goals:
 *   • Prevent injection of invalid tile values (e.g. left: 99)
 *   • Reject malformed payloads early, before they reach game logic
 *   • Return actionable error messages for debugging
 */

class InputValidator {

    /**
     * Validate a `playBone` socket payload.
     *
     * @param {object} data  { roomId, bone, end }
     * @returns {{ valid: boolean, sanitized?: object, error?: string }}
     */
    static validatePlayBonePayload(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid payload' };
        }

        const roomIdResult = InputValidator.validateRoomId(data.roomId);
        if (!roomIdResult.valid) return roomIdResult;

        const boneResult = InputValidator.validateBone(data.bone);
        if (!boneResult.valid) return boneResult;

        const endResult = InputValidator.validateEnd(data.end);
        if (!endResult.valid) return endResult;

        return {
            valid: true,
            sanitized: {
                roomId: String(data.roomId).trim(),
                bone: { left: data.bone.left, right: data.bone.right },
                end: data.end
            }
        };
    }

    /**
     * Validate a room ID.
     * @param {*} roomId
     * @returns {{ valid: boolean, error?: string }}
     */
    static validateRoomId(roomId) {
        if (roomId === null || roomId === undefined) {
            return { valid: false, error: 'Room ID is required' };
        }
        const id = String(roomId).trim();
        if (id.length === 0 || id.length > 64) {
            return { valid: false, error: 'Invalid room ID format' };
        }
        return { valid: true };
    }

    /**
     * Validate a domino bone object.
     * Must be { left: 0-6, right: 0-6 }.
     *
     * @param {*} bone
     * @returns {{ valid: boolean, error?: string }}
     */
    static validateBone(bone) {
        if (!bone || typeof bone !== 'object') {
            return { valid: false, error: 'Bone must be an object' };
        }
        if (!Number.isInteger(bone.left) || !Number.isInteger(bone.right)) {
            return { valid: false, error: 'Bone left and right must be integers' };
        }
        if (bone.left < 0 || bone.left > 6 || bone.right < 0 || bone.right > 6) {
            return { valid: false, error: 'Bone values must be between 0 and 6' };
        }
        return { valid: true };
    }

    /**
     * Validate a board end selector.
     * @param {*} end  Must be 'left' or 'right'
     * @returns {{ valid: boolean, error?: string }}
     */
    static validateEnd(end) {
        if (end !== 'left' && end !== 'right') {
            return { valid: false, error: 'End must be "left" or "right"' };
        }
        return { valid: true };
    }

    /**
     * Validate a drawBone payload (just needs roomId).
     * @param {*} roomId
     * @returns {{ valid: boolean, error?: string }}
     */
    static validateDrawBonePayload(roomId) {
        return InputValidator.validateRoomId(roomId);
    }
}

module.exports = InputValidator;
