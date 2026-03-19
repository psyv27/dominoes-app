/**
 * TurnManager — Controls turn progression, starting-player selection,
 *               pass tracking, and blocked-game detection.
 *
 * Responsibilities:
 *   • Determine who starts each round (round 1 [1,1] rule, subsequent rounds winner starts)
 *   • Advance turns in seat order
 *   • Track which numbers each player has passed on (for AI intelligence)
 *   • Detect fully-blocked board states
 */

const MoveValidator = require('./MoveValidator');

class TurnManager {
    constructor() {
        /** @type {Object<string, number[]>} socketId → numbers they passed on */
        this.passTracking = {};
        this._validator = new MoveValidator();
    }

    // ─── Starting Player ────────────────────────────────────────

    /**
     * Determine which player starts the round.
     *
     * Round 1 (Normal/Blocking): Player holding [1,1] starts.
     *   Fallback chain: lowest double holder → highest double → highest pip tile.
     * Round 2+: Previous round winner (or blocker) starts.
     *
     * @param {Object<string, { hand: { left: number, right: number }[] }>} players
     * @param {string[]} playerOrder
     * @param {number} roundNumber       Current round number (1-based)
     * @param {string} gameMode          'Normal', 'Blocking', or 'All Fives'
     * @param {string|null} lastRoundWinner
     * @param {string|null} lastPlayerToMove
     * @returns {string}  socketId of starting player
     */
    determineStartingPlayer(players, playerOrder, roundNumber, gameMode, lastRoundWinner, lastPlayerToMove) {
        let starter = null;

        // Subsequent rounds: winner/blocker starts
        if (roundNumber > 1 && (lastRoundWinner || lastPlayerToMove)) {
            return lastRoundWinner || lastPlayerToMove;
        }

        // Round 1 in Blocking/Normal: [1,1] must start
        const forceDoubleOne = roundNumber === 1 && (gameMode === 'Blocking' || gameMode === 'Normal');

        if (forceDoubleOne) {
            for (const id of playerOrder) {
                if (players[id].hand.some(b => b.left === 1 && b.right === 1)) {
                    starter = id;
                    break;
                }
            }

            // Fallback: find lowest double available
            if (!starter) {
                for (let d = 1; d <= 6 && !starter; d++) {
                    for (const id of playerOrder) {
                        if (players[id].hand.some(b => b.left === d && b.right === d)) {
                            starter = id;
                            break;
                        }
                    }
                }
            }
        }

        // Fallback: highest double
        if (!starter) {
            let highestDouble = -1;
            for (const id of playerOrder) {
                for (const bone of players[id].hand) {
                    if (bone.left === bone.right && bone.left > highestDouble) {
                        highestDouble = bone.left;
                        starter = id;
                    }
                }
            }
        }

        // Final fallback: highest pip total
        if (!starter) {
            let highestPip = -1;
            for (const id of playerOrder) {
                for (const bone of players[id].hand) {
                    const total = bone.left + bone.right;
                    if (total > highestPip) {
                        highestPip = total;
                        starter = id;
                    }
                }
            }
        }

        return starter;
    }

    // ─── Turn Advancement ───────────────────────────────────────

    /**
     * Get the next player's socketId in turn order.
     * @param {string} currentTurn  Current player's socketId
     * @param {string[]} playerOrder
     * @returns {string}
     */
    nextTurn(currentTurn, playerOrder) {
        const idx = playerOrder.indexOf(currentTurn);
        return playerOrder[(idx + 1) % playerOrder.length];
    }

    // ─── Pass Tracking ──────────────────────────────────────────

    /**
     * Reset pass tracking for a new round.
     * @param {string[]} playerOrder
     */
    resetPassTracking(playerOrder) {
        this.passTracking = {};
        for (const id of playerOrder) {
            this.passTracking[id] = [];
        }
    }

    /**
     * Record that a player passed when certain numbers were open.
     * @param {string} socketId
     * @param {number[]} openEnds  The board's open end values at time of pass
     */
    recordPass(socketId, openEnds) {
        if (!this.passTracking[socketId]) {
            this.passTracking[socketId] = [];
        }
        this.passTracking[socketId].push(...openEnds);
    }

    // ─── Blocked Detection ──────────────────────────────────────

    /**
     * Check if the game is fully blocked:
     *   • Boneyard is empty
     *   • No player has a valid move
     *
     * @param {Object<string, { hand: { left: number, right: number }[] }>} players
     * @param {string[]} playerOrder
     * @param {{ left: number, right: number }[]} deck  Remaining boneyard tiles
     * @param {{ left: number, right: number }[]} board
     * @returns {boolean}
     */
    isBlocked(players, playerOrder, deck, board) {
        if (deck.length > 0) return false;

        for (const id of playerOrder) {
            const moves = this._validator.getValidMoves(players[id].hand, board);
            if (moves.length > 0) return false;
        }
        return true;
    }
}

module.exports = TurnManager;
