/**
 * MoveValidator — Pure-logic module for validating domino plays and deal quality.
 *
 * Responsibilities:
 *   • Determine which tiles in a hand can legally be played
 *   • Validate a specific tile placement (correct end, orient the bone)
 *   • Detect "misdeal" conditions (bad distributions)
 *
 * All methods are stateless — they receive the data they need as arguments.
 */

class MoveValidator {

    // ─── Valid Moves ────────────────────────────────────────────

    /**
     * Return all tiles from `hand` that can legally be played on the board.
     *
     * @param {{ left: number, right: number }[]} hand   Player's current hand
     * @param {{ left: number, right: number }[]} board  Current board state
     * @returns {{ left: number, right: number }[]}      Subset of hand that matches an open end
     */
    getValidMoves(hand, board) {
        if (board.length === 0) return [...hand];

        const leftEnd = board[0].left;
        const rightEnd = board[board.length - 1].right;

        return hand.filter(bone =>
            bone.left === leftEnd || bone.right === leftEnd ||
            bone.left === rightEnd || bone.right === rightEnd
        );
    }

    /**
     * Return valid moves with the specific end they can be played on.
     * Used by BotAI and auto-play logic.
     *
     * @param {{ left: number, right: number }[]} hand
     * @param {{ left: number, right: number }[]} board
     * @returns {{ bone: { left: number, right: number }, end: string }[]}
     */
    getValidMovesWithEnds(hand, board) {
        if (board.length === 0) {
            return hand.map(bone => ({ bone, end: 'right' }));
        }

        const leftEnd = board[0].left;
        const rightEnd = board[board.length - 1].right;
        const moves = [];

        for (const bone of hand) {
            if (bone.left === leftEnd || bone.right === leftEnd) {
                moves.push({ bone, end: 'left' });
            }
            if (bone.left === rightEnd || bone.right === rightEnd) {
                // Avoid duplicate when both board ends are the same value
                if (leftEnd !== rightEnd || !(bone.left === leftEnd || bone.right === leftEnd)) {
                    moves.push({ bone, end: 'right' });
                } else {
                    moves.push({ bone, end: 'right' });
                }
            }
        }

        // Deduplicate
        const seen = new Set();
        return moves.filter(m => {
            const key = `${m.bone.left}-${m.bone.right}-${m.end}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // ─── Play Validation ────────────────────────────────────────

    /**
     * Validate and orient a bone for placement on the given end.
     *
     * @param {{ left: number, right: number }} bone  The tile to play
     * @param {string} end                             'left' or 'right'
     * @param {{ left: number, right: number }[]} board  Current board
     * @param {object} context  { currentRoundNumber, gameMode, hand }
     * @returns {{ valid: boolean, orientedBone?: object, error?: string }}
     */
    validatePlay(bone, end, board, context = {}) {
        // First tile on empty board — special rules may apply
        if (board.length === 0) {
            return this._validateFirstPlay(bone, context);
        }

        const leftEnd = board[0].left;
        const rightEnd = board[board.length - 1].right;

        if (end === 'left') {
            if (bone.right === leftEnd) {
                return { valid: true, orientedBone: { left: bone.left, right: bone.right } };
            }
            if (bone.left === leftEnd) {
                return { valid: true, orientedBone: { left: bone.right, right: bone.left } };
            }
            return { valid: false, error: 'Invalid move' };
        }

        if (end === 'right') {
            if (bone.left === rightEnd) {
                return { valid: true, orientedBone: { left: bone.left, right: bone.right } };
            }
            if (bone.right === rightEnd) {
                return { valid: true, orientedBone: { left: bone.right, right: bone.left } };
            }
            return { valid: false, error: 'Invalid move' };
        }

        return { valid: false, error: 'Invalid move end' };
    }

    /**
     * Validate the first tile placed on an empty board.
     * In Blocking/Normal mode round 1, player must start with [1,1] if they have it.
     */
    _validateFirstPlay(bone, context) {
        const { currentRoundNumber, gameMode, hand } = context;

        if (currentRoundNumber === 1 && (gameMode === 'Blocking' || gameMode === 'Normal')) {
            const isDoubleOne = (bone.left === 1 && bone.right === 1);
            if (!isDoubleOne) {
                const hasDoubleOne = hand && hand.some(b => b.left === 1 && b.right === 1);
                if (hasDoubleOne) {
                    return { valid: false, error: 'You must start with 1|1' };
                }
            }
        }

        return { valid: true, orientedBone: { left: bone.left, right: bone.right } };
    }

    // ─── Open Ends ──────────────────────────────────────────────

    /**
     * Get the open (exposed) end values of the board.
     * @param {{ left: number, right: number }[]} board
     * @returns {number[]}  Empty array if board is empty, otherwise [leftEnd, rightEnd]
     */
    getOpenEnds(board) {
        if (board.length === 0) return [];
        return [board[0].left, board[board.length - 1].right];
    }

    // ─── Misdeal Detection ──────────────────────────────────────

    /**
     * Check whether a deal is a "misdeal" (invalid distribution).
     *
     * Rules checked:
     *   Individual (per player):
     *     • 5 or more doubles → misdeal
     *     • 6 or more tiles of the same suit → misdeal
     *     • Exactly 5 tiles of a suit WITHOUT the double of that suit → misdeal
     *   Team (4-player games only):
     *     • A team collectively holds all 7 tiles of one suit → misdeal
     *
     * @param {{ left: number, right: number }[][] } hands       Array of hands (one per player)
     * @param {string[]} playerOrder                              Socket IDs in seat order
     * @returns {{ isMisdeal: boolean, reason?: string }}
     */
    checkMisdeal(hands, playerOrder) {
        // Individual validation
        for (let i = 0; i < hands.length; i++) {
            const hand = hands[i];

            // 5+ doubles
            const doubleCount = hand.filter(b => b.left === b.right).length;
            if (doubleCount >= 5) {
                return { isMisdeal: true, reason: `Player has ${doubleCount} doubles` };
            }

            // Suit frequency
            for (let suit = 0; suit <= 6; suit++) {
                const count = this._countSuit(hand, suit);

                if (count >= 6) {
                    return { isMisdeal: true, reason: `Player has ${count} tiles of suit ${suit}` };
                }

                if (count === 5) {
                    const hasDouble = hand.some(b => b.left === suit && b.right === suit);
                    if (!hasDouble) {
                        return { isMisdeal: true, reason: `Player has 5 tiles of suit ${suit} without the double` };
                    }
                }
            }
        }

        // Team validation (4 players: seats 0+2 vs 1+3)
        if (hands.length === 4) {
            const teams = [
                [...hands[0], ...hands[2]],
                [...hands[1], ...hands[3]],
            ];

            for (const combined of teams) {
                for (let suit = 0; suit <= 6; suit++) {
                    const count = combined.filter(b => b.left === suit || b.right === suit).length;
                    if (count === 7) {
                        return { isMisdeal: true, reason: `A team holds all 7 tiles of suit ${suit}` };
                    }
                }
            }
        }

        return { isMisdeal: false };
    }

    /**
     * Count tiles in a hand that contain a given suit value.
     * @param {{ left: number, right: number }[]} hand
     * @param {number} suit  0-6
     * @returns {number}
     */
    _countSuit(hand, suit) {
        return hand.filter(b => b.left === suit || b.right === suit).length;
    }
}

module.exports = MoveValidator;
