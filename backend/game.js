/**
 * DominoGame — Orchestrator composing modular engine components.
 *
 * This class delegates to:
 *   • DeckManager     — tile generation, shuffling, dealing, drawing
 *   • MoveValidator   — move legality, misdeal detection
 *   • ScoreCalculator — All Fives, winner pip scoring, blocked winner
 *   • TurnManager     — starting player, turn advancement, pass tracking, blocked detection
 *
 * The public API is 100% backward-compatible with the original monolithic class.
 * All method signatures and return shapes are preserved for the UI agent.
 */

const DeckManager      = require('./engine/DeckManager');
const MoveValidator    = require('./engine/MoveValidator');
const ScoreCalculator  = require('./engine/ScoreCalculator');
const TurnManager      = require('./engine/TurnManager');

class DominoGame {
    /**
     * @param {string} gameMode          'Normal' | 'Blocking' | 'All Fives'
     * @param {string} teamMode          'Free For All' | '2v2'
     * @param {string} matchFormat       'Score' | 'Best of 1' | 'Best of 3' | 'Best of 5'
     * @param {number} currentRoundNumber
     * @param {string|null} lastRoundWinner   Player who Dominoed last round
     * @param {string|null} lastPlayerToMove  Player who caused last Block
     */
    constructor(gameMode = 'Normal', teamMode = 'Free For All', matchFormat = 'Score', currentRoundNumber = 1, lastRoundWinner = null, lastPlayerToMove = null) {
        // ── Composed engine modules ─────────────────────────────
        this._deckMgr   = new DeckManager();
        this._validator  = new MoveValidator();
        this._scorer     = new ScoreCalculator();
        this._turnMgr    = new TurnManager();

        // ── Public state (read by index.js / BotAI / serializer) ─
        this.deck        = [];                // boneyard reference
        this.fullDeck    = [];                // frozen copy of shuffled 28 tiles
        this.takenIndices = new Set();         // indices in fullDeck that are dealt/drawn
        this.players     = {};                // { socketId: { hand: [] } }
        this.board       = [];                // played tiles in order
        this.turn        = null;              // current player's socketId
        this.playerOrder = [];
        this.state       = 'waiting';         // 'waiting' | 'dealing' | 'playing' | 'finished'
        this.phase       = 'waiting';         // 'waiting' | 'dealing' | 'playing' | 'boneyard_pick'
        this.dealOrder   = [];                // [{tileIndex, toPlayer, dealStep}, ...]

        // ── Game settings ───────────────────────────────────────
        this.gameMode          = gameMode;
        this.teamMode          = teamMode;
        this.matchFormat       = matchFormat;
        this.currentRoundNumber = currentRoundNumber;
        this.lastRoundWinner   = lastRoundWinner;
        this.lastPlayerToMove  = lastPlayerToMove;
        this.roundStarterIndex = 0;

        // ── Tracking ────────────────────────────────────────────
        this.passTracking = {};               // delegated to TurnManager but kept for BotAI access
        this.misdealCount = 0;
        this.lastMisdealReason = null;
    }

    // ═══════════════════════════════════════════════════════════
    //  DECK OPERATIONS (delegated to DeckManager)
    // ═══════════════════════════════════════════════════════════

    generateDeck() {
        this._deckMgr.generate();
        this.deck = this._deckMgr.tiles;
    }

    shuffleDeck() {
        this._deckMgr.shuffle();
        this.deck = this._deckMgr.tiles;
    }

    // ═══════════════════════════════════════════════════════════
    //  PLAYER MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    addPlayer(socketId) {
        if (!this.players[socketId]) {
            this.players[socketId] = { hand: [] };
            this.playerOrder.push(socketId);
        }
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        delete this.passTracking[socketId];
        this.playerOrder = this.playerOrder.filter(id => id !== socketId);
        if (this.turn === socketId) {
            this.nextTurn();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  MISDEAL DETECTION (delegated to MoveValidator)
    // ═══════════════════════════════════════════════════════════

    /**
     * @returns {{ isMisdeal: boolean, reason?: string }}
     */
    checkMisdeal() {
        const hands = this.playerOrder.map(id => this.players[id].hand);
        return this._validator.checkMisdeal(hands, this.playerOrder);
    }

    // ═══════════════════════════════════════════════════════════
    //  GAME START
    // ═══════════════════════════════════════════════════════════

    startGame() {
        if (this.playerOrder.length < 2) return false;

        let misdealCount = 0;
        const MAX_REDEALS = 50;

        // Deal-validate loop: re-deal on misdeal
        while (true) {
            this.generateDeck();
            this.shuffleDeck();
            this.board = [];
            this.passTracking = {};
            this.takenIndices = new Set();
            this._turnMgr.resetPassTracking(this.playerOrder);

            // Freeze a copy of the full 28-tile deck for boneyard display
            this.fullDeck = this.deck.map((t, i) => ({ left: t.left, right: t.right, index: i }));

            const handSize = 7;
            let dealIdx = 0;
            this.playerOrder.forEach(socketId => {
                this.players[socketId].hand = this.deck.splice(0, handSize);
                // Mark dealt tile indices as taken
                for (let k = 0; k < handSize; k++) {
                    this.takenIndices.add(dealIdx + k);
                }
                dealIdx += handSize;
                this.passTracking[socketId] = [];
            });

            const result = this.checkMisdeal();
            if (!result.isMisdeal) break;

            misdealCount++;
            this.lastMisdealReason = result.reason;
            if (misdealCount >= MAX_REDEALS) break;
        }

        this.misdealCount = misdealCount;

        // Determine who starts
        this.turn = this._turnMgr.determineStartingPlayer(
            this.players,
            this.playerOrder,
            this.currentRoundNumber,
            this.gameMode,
            this.lastRoundWinner,
            this.lastPlayerToMove
        );

        this.state = 'playing';
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    //  ANIMATED DEALING (new multi-phase flow)
    // ═══════════════════════════════════════════════════════════

    /**
     * Phase 1: Prepare the game for animated dealing.
     * Shuffles the deck, assigns tile positions, generates deal order,
     * but does NOT deal tiles to players (hands start empty).
     *
     * @returns {boolean} true if preparation succeeded
     */
    prepareGame() {
        if (this.playerOrder.length < 2) return false;

        this.generateDeck();
        this.shuffleDeck();
        this.board = [];
        this.passTracking = {};
        this.takenIndices = new Set();
        this._turnMgr.resetPassTracking(this.playerOrder);

        // Freeze a copy of the full 28-tile deck with positions
        this.fullDeck = this.deck.map((t, i) => ({ left: t.left, right: t.right, index: i }));

        // Initialize empty hands
        this.playerOrder.forEach(socketId => {
            this.players[socketId].hand = [];
            this.passTracking[socketId] = [];
        });

        // Generate the deal order: random pick order, distributed clockwise
        const shuffledIndices = [...Array(28).keys()];
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }

        this.dealOrder = [];
        const handSize = 7;
        const totalToDeal = this.playerOrder.length * handSize;
        for (let d = 0; d < totalToDeal; d++) {
            this.dealOrder.push({
                tileIndex: shuffledIndices[d],
                toPlayer: this.playerOrder[d % this.playerOrder.length],
                dealStep: d
            });
        }

        this.phase = 'dealing';
        this.state = 'dealing';
        return true;
    }

    /**
     * Phase 2: Deal one tile to a player (called one at a time by the server).
     *
     * @param {number} tileIndex  Index in fullDeck
     * @param {string} playerId   Socket ID of the receiving player
     * @returns {{ success?: boolean, tile?: object, error?: string }}
     */
    dealTileToPlayer(tileIndex, playerId) {
        if (tileIndex < 0 || tileIndex >= this.fullDeck.length) {
            return { error: 'Invalid tile index' };
        }
        if (this.takenIndices.has(tileIndex)) {
            return { error: 'Tile already taken' };
        }

        const tile = this.fullDeck[tileIndex];

        // Remove from the boneyard deck array
        const deckIdx = this.deck.findIndex(d => d.left === tile.left && d.right === tile.right);
        if (deckIdx !== -1) this.deck.splice(deckIdx, 1);

        this.players[playerId].hand.push({ left: tile.left, right: tile.right });
        this.takenIndices.add(tileIndex);

        return { success: true, tile: { left: tile.left, right: tile.right } };
    }

    /**
     * Phase 3: Finalize the deal — check for misdeal, determine starting player.
     * Called after all tiles have been dealt via dealTileToPlayer().
     *
     * @returns {{ misdeal: boolean, reason?: string }}
     */
    finalizeDeal() {
        const misdealResult = this.checkMisdeal();
        if (misdealResult.isMisdeal) {
            this.misdealCount++;
            this.lastMisdealReason = misdealResult.reason;
            return { misdeal: true, reason: misdealResult.reason };
        }

        // Determine who starts
        this.turn = this._turnMgr.determineStartingPlayer(
            this.players,
            this.playerOrder,
            this.currentRoundNumber,
            this.gameMode,
            this.lastRoundWinner,
            this.lastPlayerToMove
        );

        this.state = 'playing';
        this.phase = 'playing';
        return { misdeal: false };
    }

    /**
     * Identify which player caused the misdeal and return their hand for reveal.
     *
     * @returns {{ playerId: string, hand: object[], reason: string } | null}
     */
    getMisdealHand() {
        for (const id of this.playerOrder) {
            const hand = this.players[id].hand;

            // 5+ doubles
            const doubleCount = hand.filter(b => b.left === b.right).length;
            if (doubleCount >= 5) {
                return { playerId: id, hand: [...hand], reason: `${doubleCount} doubles` };
            }

            // Suit frequency checks
            for (let suit = 0; suit <= 6; suit++) {
                const count = hand.filter(b => b.left === suit || b.right === suit).length;
                if (count >= 6) {
                    return { playerId: id, hand: [...hand], reason: `${count} tiles of suit ${suit}` };
                }
                if (count === 5) {
                    const hasDouble = hand.some(b => b.left === suit && b.right === suit);
                    if (!hasDouble) {
                        return { playerId: id, hand: [...hand], reason: `5 tiles of suit ${suit} without the double` };
                    }
                }
            }
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    //  MOVE QUERIES (delegated to MoveValidator)
    // ═══════════════════════════════════════════════════════════

    getValidMoves(hand) {
        return this._validator.getValidMoves(hand, this.board);
    }

    getOpenEnds() {
        return this._validator.getOpenEnds(this.board);
    }

    // ═══════════════════════════════════════════════════════════
    //  BLOCKED DETECTION (delegated to TurnManager)
    // ═══════════════════════════════════════════════════════════

    checkBlocked() {
        return this._turnMgr.isBlocked(this.players, this.playerOrder, this.deck, this.board);
    }

    // ═══════════════════════════════════════════════════════════
    //  SCORING (delegated to ScoreCalculator)
    // ═══════════════════════════════════════════════════════════

    calculatePoints() {
        return this._scorer.calculateBlockedWinner(
            this.players,
            this.playerOrder,
            this.teamMode,
            this.lastPlayerToMove
        );
    }

    calculateWinnerScore(winnerId) {
        return this._scorer.calculateWinnerScore(
            winnerId,
            this.players,
            this.playerOrder,
            this.teamMode
        );
    }

    calculateAllFivesPoints() {
        return this._scorer.calculateAllFivesPoints(this.board);
    }

    // ═══════════════════════════════════════════════════════════
    //  PLAY A BONE
    // ═══════════════════════════════════════════════════════════

    /**
     * Attempt to play a tile from the player's hand onto the board.
     *
     * @param {string} socketId  Player making the move
     * @param {{ left: number, right: number }} bone  The tile to play
     * @param {string} end  'left' or 'right'
     * @returns {object}  Result payload — backward-compatible with original
     */
    playBone(socketId, bone, end) {
        if (this.turn !== socketId) return { error: 'Not your turn' };

        const playerHand = this.players[socketId].hand;
        const boneIndex = playerHand.findIndex(b =>
            (b.left === bone.left && b.right === bone.right) ||
            (b.left === bone.right && b.right === bone.left)
        );

        if (boneIndex === -1) return { error: 'Bone not in hand' };

        const playedBone = playerHand[boneIndex];
        let pointsEarnedThisTurn = 0;

        // ── Empty board: validate first-play rules ──────────────
        if (this.board.length === 0) {
            const validation = this._validator.validatePlay(playedBone, end, this.board, {
                currentRoundNumber: this.currentRoundNumber,
                gameMode: this.gameMode,
                hand: playerHand
            });

            if (!validation.valid) return { error: validation.error };

            this.board.push(playedBone);
            playerHand.splice(boneIndex, 1);

            if (this.gameMode === 'All Fives') {
                pointsEarnedThisTurn = this.calculateAllFivesPoints();
            }

            // Domino! (hand empty → immediate win)
            if (playerHand.length === 0) {
                return this._buildWinResult(socketId, pointsEarnedThisTurn, 'domino');
            }

            this.nextTurn();
            return { success: true, pointsEarnedThisTurn };
        }

        // ── Non-empty board: validate placement ─────────────────
        const validation = this._validator.validatePlay(playedBone, end, this.board, {});
        if (!validation.valid) return { error: validation.error };

        // Place the correctly-oriented bone
        if (end === 'left') {
            this.board.unshift(validation.orientedBone);
        } else {
            this.board.push(validation.orientedBone);
        }

        playerHand.splice(boneIndex, 1);

        if (this.gameMode === 'All Fives') {
            pointsEarnedThisTurn = this.calculateAllFivesPoints();
        }

        // Domino!
        if (playerHand.length === 0) {
            return this._buildWinResult(socketId, pointsEarnedThisTurn, 'domino');
        }

        this.lastPlayerToMove = socketId;

        // Check blocked
        if (this.checkBlocked()) {
            return this._buildBlockedResult(pointsEarnedThisTurn);
        }

        this.nextTurn();
        return { success: true, pointsEarnedThisTurn };
    }

    // ═══════════════════════════════════════════════════════════
    //  DRAW FROM BONEYARD
    // ═══════════════════════════════════════════════════════════

    /**
     * Draw a tile from the boneyard, or pass if empty.
     *
     * @param {string} socketId
     * @returns {object}  Result payload
     */
    drawBone(socketId, boneyardIndex) {
        if (this.turn !== socketId) return { error: 'Not your turn' };

        const validMoves = this.getValidMoves(this.players[socketId].hand);
        if (validMoves.length > 0) return { error: 'You have valid moves, cannot draw' };

        // Boneyard empty → pass
        if (this.deck.length === 0) {
            const openEnds = this.getOpenEnds();
            this._turnMgr.recordPass(socketId, openEnds);
            if (!this.passTracking[socketId]) this.passTracking[socketId] = [];
            this.passTracking[socketId].push(...openEnds);

            this.nextTurn();

            // Check if fully blocked after pass
            if (this.checkBlocked()) {
                this.state = 'finished';
                const { blockedWinner } = this.calculatePoints();
                const winnerScore = this.calculateWinnerScore(blockedWinner);
                const allHands = {};
                this.playerOrder.forEach(id => { allHands[id] = this.players[id].hand; });
                return { success: true, passed: true, blocked: true, winner: blockedWinner, winnerScore, reason: 'blocked', allHands };
            }

            return { success: true, passed: true, message: 'No bones left, turn passed' };
        }

        let bone;

        // If a specific boneyard index was requested, draw that tile
        if (typeof boneyardIndex === 'number' && boneyardIndex >= 0 && boneyardIndex < this.fullDeck.length) {
            if (this.takenIndices.has(boneyardIndex)) {
                return { error: 'That tile is already taken' };
            }
            // Find the tile in the remaining deck
            const fullTile = this.fullDeck[boneyardIndex];
            const deckIdx = this.deck.findIndex(d => d.left === fullTile.left && d.right === fullTile.right);
            if (deckIdx === -1) return { error: 'Tile not in deck' };
            bone = this.deck.splice(deckIdx, 1)[0];
            this.takenIndices.add(boneyardIndex);
        } else {
            // Default: draw random (for bots / auto-pass)
            bone = this.deck.pop();
            // Find and mark the corresponding fullDeck index
            for (let i = 0; i < this.fullDeck.length; i++) {
                if (!this.takenIndices.has(i) && this.fullDeck[i].left === bone.left && this.fullDeck[i].right === bone.right) {
                    this.takenIndices.add(i);
                    break;
                }
            }
        }

        this.players[socketId].hand.push(bone);

        const newValidMoves = this.getValidMoves(this.players[socketId].hand);
        const canPlayNow = newValidMoves.length > 0;

        return { success: true, bone, drawnBone: bone, canPlayNow, deckRemaining: this.deck.length };
    }

    // ═══════════════════════════════════════════════════════════
    //  TURN ADVANCEMENT
    // ═══════════════════════════════════════════════════════════

    nextTurn() {
        this.turn = this._turnMgr.nextTurn(this.turn, this.playerOrder);
    }

    // ═══════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════

    /**
     * Build the standard "domino" win result payload.
     */
    _buildWinResult(winnerId, pointsEarnedThisTurn, reason) {
        this.state = 'finished';
        const winnerScore = this.calculateWinnerScore(winnerId);
        const allHands = {};
        this.playerOrder.forEach(id => { allHands[id] = this.players[id].hand; });
        return { success: true, winner: winnerId, pointsEarnedThisTurn, winnerScore, reason, allHands };
    }

    /**
     * Build the standard "blocked" result payload.
     */
    _buildBlockedResult(pointsEarnedThisTurn) {
        this.state = 'finished';
        const { blockedWinner, totals } = this.calculatePoints();
        const winnerScore = this.calculateWinnerScore(blockedWinner);
        const allHands = {};
        this.playerOrder.forEach(id => { allHands[id] = this.players[id].hand; });
        return { success: true, winner: blockedWinner, pointsEarnedThisTurn, winnerScore, reason: 'blocked', totals, allHands };
    }
}

module.exports = DominoGame;
