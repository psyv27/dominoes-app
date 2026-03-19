/**
 * DeckManager — Generates, shuffles, and manages the domino tile deck (boneyard).
 *
 * Responsibilities:
 *   • Generate the standard 28-tile double-six set
 *   • Fisher-Yates shuffle
 *   • Deal hands to N players
 *   • Draw single tiles from the boneyard
 */

class DeckManager {
    constructor() {
        /** @type {{ left: number, right: number }[]} */
        this.tiles = [];
    }

    // ─── Generation ─────────────────────────────────────────────

    /**
     * Generate the standard 28-tile double-six domino set.
     * Each tile is an object { left, right } where left <= right.
     * @returns {DeckManager} this (for chaining)
     */
    generate() {
        this.tiles = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                this.tiles.push({ left: i, right: j });
            }
        }
        return this;
    }

    // ─── Shuffle ────────────────────────────────────────────────

    /**
     * Fisher-Yates (Knuth) in-place shuffle.
     * @returns {DeckManager} this (for chaining)
     */
    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
        return this;
    }

    // ─── Deal ───────────────────────────────────────────────────

    /**
     * Deal `handSize` tiles to each of `playerCount` players.
     * Tiles are taken sequentially from the front of the deck.
     *
     * @param {number} playerCount  Number of players (2-4)
     * @param {number} handSize     Tiles per hand (default 7)
     * @returns {{ hands: { left: number, right: number }[][], boneyard: { left: number, right: number }[] }}
     */
    deal(playerCount, handSize = 7) {
        const hands = [];
        for (let p = 0; p < playerCount; p++) {
            hands.push(this.tiles.splice(0, handSize));
        }
        return { hands, boneyard: [...this.tiles] };
    }

    // ─── Draw ───────────────────────────────────────────────────

    /**
     * Draw a single tile from the boneyard (end of deck).
     * @returns {{ left: number, right: number } | null}  The drawn tile, or null if empty.
     */
    draw() {
        if (this.tiles.length === 0) return null;
        return this.tiles.pop();
    }

    /**
     * @returns {number} Tiles remaining in the boneyard.
     */
    get remaining() {
        return this.tiles.length;
    }
}

module.exports = DeckManager;
