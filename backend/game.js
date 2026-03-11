class DominoGame {
    constructor(gameMode = 'Normal', teamMode = 'Free For All', matchFormat = 'Score', currentRoundNumber = 1, lastRoundWinner = null, lastPlayerToMove = null) {
        this.deck = [];
        this.players = {}; // { socketId: { hand: [] } }
        this.board = []; // Array of dominoes e.g. [{ left: 6, right: 6 }]
        this.turn = null; 
        this.playerOrder = [];
        this.state = 'waiting'; 
        this.gameMode = gameMode;
        this.teamMode = teamMode;
        this.matchFormat = matchFormat;
        this.currentRoundNumber = currentRoundNumber;
        this.lastRoundWinner = lastRoundWinner; // player who Dominoed
        this.lastPlayerToMove = lastPlayerToMove; // player who caused Block
        this.roundStarterIndex = 0;
        this.passTracking = {}; // Track what numbers each player has passed on
    }

    generateDeck() {
        this.deck = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                this.deck.push({ left: i, right: j });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

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

    /**
     * Count how many tiles in a hand contain a given suit number (0-6).
     * A double like [3,3] counts once for suit 3.
     */
    _countSuit(hand, suit) {
        return hand.filter(b => b.left === suit || b.right === suit).length;
    }

    /**
     * Check if the current deal is a "misdeal" (invalid distribution).
     * Returns { isMisdeal: true, reason: string } or { isMisdeal: false }.
     *
     * Rules:
     *   Individual (per player):
     *     Case 2: 5 or more doubles
     *     Case 3: 6 or more tiles of the same suit
     *     Case 4: Exactly 5 tiles of a suit WITHOUT the double of that suit
     *   Team (players at index 0+2 vs 1+3, only when 4 players):
     *     Case 1: A team collectively holds all 7 tiles of one suit
     */
    checkMisdeal() {
        // --- Phase 2: Individual Validation ---
        for (const socketId of this.playerOrder) {
            const hand = this.players[socketId].hand;

            // Case 2: 5+ doubles
            const doubleCount = hand.filter(b => b.left === b.right).length;
            if (doubleCount >= 5) {
                return { isMisdeal: true, reason: `Player has ${doubleCount} doubles` };
            }

            // Case 3 & 4: suit frequency checks
            for (let suit = 0; suit <= 6; suit++) {
                const count = this._countSuit(hand, suit);

                // Case 3: 6+ of same suit
                if (count >= 6) {
                    return { isMisdeal: true, reason: `Player has ${count} tiles of suit ${suit}` };
                }

                // Case 4: exactly 5 of a suit but missing the double
                if (count === 5) {
                    const hasDouble = hand.some(b => b.left === suit && b.right === suit);
                    if (!hasDouble) {
                        return { isMisdeal: true, reason: `Player has 5 tiles of suit ${suit} without the double` };
                    }
                }
            }
        }

        // --- Phase 3: Team Validation (only for 4 players) ---
        if (this.playerOrder.length === 4) {
            const teams = [
                [this.playerOrder[0], this.playerOrder[2]], // Team 1
                [this.playerOrder[1], this.playerOrder[3]], // Team 2
            ];

            for (const [p1, p2] of teams) {
                const combined = [...this.players[p1].hand, ...this.players[p2].hand];
                for (let suit = 0; suit <= 6; suit++) {
                    const teamCount = combined.filter(b => b.left === suit || b.right === suit).length;
                    // There are exactly 7 tiles containing each suit (0-0,0-1,...,0-6)
                    if (teamCount === 7) {
                        return { isMisdeal: true, reason: `A team holds all 7 tiles of suit ${suit}` };
                    }
                }
            }
        }

        return { isMisdeal: false };
    }

    startGame() {
        if (this.playerOrder.length < 2) return false;

        let misdealCount = 0;
        const MAX_REDEALS = 50; // Safety cap

        // Phase 1-4 loop: deal, validate, re-deal if misdeal
        while (true) {
            this.generateDeck();
            this.shuffleDeck();
            this.board = [];
            this.passTracking = {};

            const handSize = 7;
            this.playerOrder.forEach(socketId => {
                this.players[socketId].hand = this.deck.splice(0, handSize);
                this.passTracking[socketId] = [];
            });

            // Phase 2 & 3: Validate the deal
            const result = this.checkMisdeal();
            if (!result.isMisdeal) {
                break; // Valid deal — proceed
            }

            misdealCount++;
            this.lastMisdealReason = result.reason;

            if (misdealCount >= MAX_REDEALS) {
                break;
            }
        }

        this.misdealCount = misdealCount;

        let startingPlayer = null;
        let forceDoubleOne = this.currentRoundNumber === 1 && (this.gameMode === 'Blocking' || this.gameMode === 'Normal');

        // Rule: Subsequent rounds start with the previous winner/blocker
        if (this.currentRoundNumber > 1 && (this.lastRoundWinner || this.lastPlayerToMove)) {
            startingPlayer = this.lastRoundWinner || this.lastPlayerToMove;
            // In this case, startingPlayer can play ANY tile (no restriction in playBone)
        } else if (forceDoubleOne) {
            // First round: [1,1] MUST start
            this.playerOrder.forEach(socketId => {
                const has11 = this.players[socketId].hand.some(b => b.left === 1 && b.right === 1);
                if (has11) startingPlayer = socketId;
            });
            
            // If No one has [1,1] due to some freak shuffle, fallback to existing logic
            if (!startingPlayer) {
                let requiredDouble = 1;
                while (requiredDouble <= 6 && !startingPlayer) {
                    this.playerOrder.forEach(socketId => {
                        const hasDouble = this.players[socketId].hand.some(b => b.left === requiredDouble && b.right === requiredDouble);
                        if (hasDouble) startingPlayer = socketId;
                    });
                    if (!startingPlayer) requiredDouble++;
                }
            }
        }

        // Final fallback if still null (should not happen with logic above but for safety)
        if (!startingPlayer) {
            let highestDouble = -1;
            this.playerOrder.forEach(socketId => {
                this.players[socketId].hand.forEach(bone => {
                    if (bone.left === bone.right && bone.left > highestDouble) {
                        highestDouble = bone.left;
                        startingPlayer = socketId;
                    }
                });
            });
        }

        if (!startingPlayer) {
            let highestPip = -1;
            this.playerOrder.forEach(socketId => {
                this.players[socketId].hand.forEach(bone => {
                    const total = bone.left + bone.right;
                    if (total > highestPip) {
                        highestPip = total;
                        startingPlayer = socketId;
                    }
                });
            });
        }

        this.turn = startingPlayer;
        this.state = 'playing';
        return true;
    }

    getValidMoves(hand) {
        if (this.board.length === 0) return hand;

        const leftEnd = this.board[0].left;
        const rightEnd = this.board[this.board.length - 1].right;

        return hand.filter(bone => 
            bone.left === leftEnd || bone.right === leftEnd || 
            bone.left === rightEnd || bone.right === rightEnd
        );
    }

    // Get open ends of the board
    getOpenEnds() {
        if (this.board.length === 0) return [];
        return [this.board[0].left, this.board[this.board.length - 1].right];
    }

    checkBlocked() {
        // Blocked: NO player can move AND the boneyard is empty
        if (this.deck.length > 0) return false;

        for (let socketId of this.playerOrder) {
            const moves = this.getValidMoves(this.players[socketId].hand);
            if (moves.length > 0) return false;
        }
        return true;
    }

    calculatePoints() {
        let totals = {};
        
        // Count individual totals
        this.playerOrder.forEach(socketId => {
            let total = 0;
            this.players[socketId].hand.forEach(b => { total += b.left + b.right });
            totals[socketId] = total;
        });

        let blockedWinnerId = null;
        let winningTeam = null;

        if (this.teamMode === '2v2' && this.playerOrder.length === 4) {
            const team1Total = totals[this.playerOrder[0]] + totals[this.playerOrder[2]];
            const team2Total = totals[this.playerOrder[1]] + totals[this.playerOrder[3]];
            
            if (team1Total < team2Total) {
                winningTeam = 1;
                blockedWinnerId = totals[this.playerOrder[0]] <= totals[this.playerOrder[2]] ? this.playerOrder[0] : this.playerOrder[2];
            } else if (team2Total < team1Total) {
                winningTeam = 2;
                blockedWinnerId = totals[this.playerOrder[1]] <= totals[this.playerOrder[3]] ? this.playerOrder[1] : this.playerOrder[3];
            } else {
                // Tie: Usually last player to move wins or no points. 
                // Let's award it to the last player to move as requested.
                blockedWinnerId = this.lastPlayerToMove || this.playerOrder[0];
                const wIdx = this.playerOrder.indexOf(blockedWinnerId);
                winningTeam = (wIdx % 2 === 0) ? 1 : 2;
            }
        } else {
            // FFA
            let lowestTotal = Infinity;
            for (let id of this.playerOrder) {
                if (totals[id] < lowestTotal) {
                    lowestTotal = totals[id];
                    blockedWinnerId = id;
                }
            }
        }

        return { totals, blockedWinner: blockedWinnerId, winningTeam };
    }

    calculateWinnerScore(winnerId) {
        let score = 0;
        
        if (this.teamMode === '2v2' && this.playerOrder.length === 4) {
            const winnerIndex = this.playerOrder.indexOf(winnerId);
            const oppIndices = [(winnerIndex + 1) % 4, (winnerIndex + 3) % 4];
            
            // Winner gets score of BOTH opponents
            oppIndices.forEach(idx => {
                const oppId = this.playerOrder[idx];
                this.players[oppId].hand.forEach(b => { score += b.left + b.right });
            });
        } else {
            // FFA: Winner gets pips from all others
            this.playerOrder.forEach(socketId => {
                if (socketId !== winnerId) {
                    this.players[socketId].hand.forEach(b => { score += b.left + b.right });
                }
            });
        }
        
        return score;
    }

    playBone(socketId, bone, end) {
        if (this.turn !== socketId) return { error: 'Not your turn' };

        const playerHand = this.players[socketId].hand;
        const boneIndex = playerHand.findIndex(b => 
            (b.left === bone.left && b.right === bone.right) || 
            (b.left === bone.right && b.right === bone.left)
        );
        
        if (boneIndex === -1) return { error: 'Bone not in hand' };

        let playedBone = playerHand[boneIndex];
        let pointsEarnedThisTurn = 0;

        if (this.board.length === 0) {
            // Enforcement: Round 1 must start with 1|1 in Blocking/Normal mode if anyone has it.
            // (startGame already set turn to the player with 1|1)
            if (this.currentRoundNumber === 1 && (this.gameMode === 'Blocking' || this.gameMode === 'Normal')) {
                const isDoubleOne = (bone.left === 1 && bone.right === 1);
                if (!isDoubleOne) {
                    // Check if player actually HAS 1|1 (they should if they are starting)
                    const hasDoubleOne = playerHand.some(b => b.left === 1 && b.right === 1);
                    if (hasDoubleOne) {
                        return { error: 'You must start with 1|1' };
                    }
                }
            }

            this.board.push(playedBone);
            playerHand.splice(boneIndex, 1);
            
            if (this.gameMode === 'All Fives') {
                pointsEarnedThisTurn = this.calculateAllFivesPoints();
            }

            // Domino! Hand empty = immediate win
            if (playerHand.length === 0) {
                this.state = 'finished';
                const winnerScore = this.calculateWinnerScore(socketId);
                return { success: true, winner: socketId, pointsEarnedThisTurn, winnerScore, reason: 'domino' };
            }

            this.nextTurn();
            return { success: true, pointsEarnedThisTurn };
        }

        const leftEnd = this.board[0].left;
        const rightEnd = this.board[this.board.length - 1].right;

        if (end === 'left') {
            if (playedBone.right === leftEnd) {
                this.board.unshift(playedBone);
            } else if (playedBone.left === leftEnd) {
                this.board.unshift({ left: playedBone.right, right: playedBone.left });
            } else {
                return { error: 'Invalid move' };
            }
        } else if (end === 'right') {
            if (playedBone.left === rightEnd) {
                this.board.push(playedBone);
            } else if (playedBone.right === rightEnd) {
                this.board.push({ left: playedBone.right, right: playedBone.left });
            } else {
                return { error: 'Invalid move' };
            }
        } else {
             return { error: 'Invalid move end' };
        }

        playerHand.splice(boneIndex, 1);

        if (this.gameMode === 'All Fives') {
            pointsEarnedThisTurn = this.calculateAllFivesPoints();
        }

        // Domino! Hand empty = immediate round win
        if (playerHand.length === 0) {
            this.state = 'finished';
            const winnerScore = this.calculateWinnerScore(socketId);
            return { success: true, winner: socketId, pointsEarnedThisTurn, winnerScore, reason: 'domino' };
        }

        this.lastPlayerToMove = socketId;

        // Check if game is now blocked
        if (this.checkBlocked()) {
            this.state = 'finished';
            const { blockedWinner, totals } = this.calculatePoints();
            const winnerScore = this.calculateWinnerScore(blockedWinner);
            return { success: true, winner: blockedWinner, pointsEarnedThisTurn, winnerScore, reason: 'blocked', totals };
        }

        this.nextTurn();
        return { success: true, pointsEarnedThisTurn };
    }

    calculateAllFivesPoints() {
        if (this.board.length === 0) return 0;
        
        let sum = 0;
        const leftBone = this.board[0];
        const rightBone = this.board[this.board.length - 1];

        if (this.board.length === 1) {
            sum = leftBone.left + leftBone.right;
        } else {
            sum += leftBone.left === leftBone.right ? leftBone.left * 2 : leftBone.left;
            sum += rightBone.left === rightBone.right ? rightBone.right * 2 : rightBone.right;
        }

        if (sum % 5 === 0) return sum;
        return 0;
    }

    // Draw from boneyard — standard rules:
    // If player has valid moves, they CANNOT draw
    // If no valid moves, draw ONE tile from boneyard
    // If boneyard is empty and still no valid moves, PASS turn
    drawBone(socketId) {
        if (this.turn !== socketId) return { error: 'Not your turn' };
        
        const validMoves = this.getValidMoves(this.players[socketId].hand);
        if (validMoves.length > 0) return { error: 'You have valid moves, cannot draw' };

        // Boneyard empty — must pass
        if (this.deck.length === 0) {
            // Track what numbers the player passed on
            const openEnds = this.getOpenEnds();
            if (!this.passTracking[socketId]) this.passTracking[socketId] = [];
            this.passTracking[socketId].push(...openEnds);

            // Check if the game is completely blocked after this pass
            this.nextTurn();
            
            if (this.checkBlocked()) {
                this.state = 'finished';
                const { blockedWinner } = this.calculatePoints();
                const winnerScore = this.calculateWinnerScore(blockedWinner);
                return { success: true, passed: true, blocked: true, winner: blockedWinner, winnerScore, reason: 'blocked' };
            }

            return { success: true, passed: true, message: 'No bones left, turn passed' };
        }

        // Draw one bone from boneyard
        const bone = this.deck.pop();
        this.players[socketId].hand.push(bone);

        // Check if drawn bone is playable
        const newValidMoves = this.getValidMoves(this.players[socketId].hand);
        const canPlayNow = newValidMoves.length > 0;

        return { success: true, bone, drawnBone: bone, canPlayNow, deckRemaining: this.deck.length };
    }

    nextTurn() {
        const turnIndex = this.playerOrder.indexOf(this.turn);
        this.turn = this.playerOrder[(turnIndex + 1) % this.playerOrder.length];
    }
}

module.exports = DominoGame;
