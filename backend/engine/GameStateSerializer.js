/**
 * GameStateSerializer — Produces clean JSON payloads for the UI agent.
 *
 * Separates serialization logic from game logic so that:
 *   • Each player only receives their own hand (not opponents' tiles)
 *   • Opponent info is reduced to tile counts
 *   • Room-level data (scores, timer settings) is merged in
 */

class GameStateSerializer {

    /**
     * Build the per-player game state payload.
     *
     * @param {object} game   DominoGame instance
     * @param {object} room   Room object from RoomManager
     * @param {string} socketId  The player to serialize for
     * @returns {object}  JSON-safe game state
     */
    static serializeForPlayer(game, room, socketId) {
        // Build boneyard: all 28 tiles with taken flag
        const boneyard = (game.fullDeck || []).map((tile, idx) => ({
            left: tile.left,
            right: tile.right,
            index: tile.index !== undefined ? tile.index : idx,
            taken: game.takenIndices ? game.takenIndices.has(tile.index !== undefined ? tile.index : idx) : false
        }));

        return {
            board: game.board,
            turn: game.turn,
            state: game.state,
            deckCount: game.deck.length,
            hand: game.players[socketId]?.hand || [],
            opponents: GameStateSerializer.serializeOpponents(game, socketId),
            scores: room.scores,
            turnTimer: room.turnTimer,
            misdealCount: game.misdealCount || 0,
            boneyard
        };
    }

    /**
     * Serialize opponent info: only tile counts, never tile contents.
     *
     * @param {object} game
     * @param {string} socketId  The requesting player (excluded from opponents)
     * @returns {Object<string, number>}  { opponentId: tileCount }
     */
    static serializeOpponents(game, socketId) {
        const opponents = {};
        for (const id in game.players) {
            if (id !== socketId) {
                opponents[id] = game.players[id].hand.length;
            }
        }
        return opponents;
    }

    /**
     * Serialize all hands (revealed at round end).
     *
     * @param {Object<string, { hand: { left: number, right: number }[] }>} players
     * @param {string[]} playerOrder
     * @returns {Object<string, { left: number, right: number }[]>}
     */
    static serializeAllHands(players, playerOrder) {
        const allHands = {};
        for (const id of playerOrder) {
            allHands[id] = players[id].hand;
        }
        return allHands;
    }
}

module.exports = GameStateSerializer;
