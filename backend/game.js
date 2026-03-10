class DominoGame {
    constructor(gameMode = 'Normal', teamMode = 'Free For All') {
        this.deck = [];
        this.players = {}; // { socketId: { hand: [] } }
        this.board = []; // Array of dominoes e.g. [{ left: 6, right: 6 }]
        this.turn = null; 
        this.playerOrder = [];
        this.state = 'waiting'; 
        this.gameMode = gameMode;
        this.teamMode = teamMode;
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

    startGame() {
        if (this.playerOrder.length < 2) return false;
        
        this.generateDeck();
        this.shuffleDeck();
        this.board = [];
        this.passTracking = {};
        
        // Hand size: 2 players = 7 each, 3 players = 7 each, 4 players = 7 each
        // (Standard double-six: 28 tiles / 4 = 7 each, no boneyard in 4-player)
        const handSize = 7;
        
        this.playerOrder.forEach(socketId => {
            this.players[socketId].hand = this.deck.splice(0, handSize);
            this.passTracking[socketId] = [];
        });

        // First move: player with the highest double starts
        let highestDouble = -1;
        let startingPlayer = null;

        this.playerOrder.forEach(socketId => {
            this.players[socketId].hand.forEach(bone => {
                if (bone.left === bone.right) {
                    if (bone.left > highestDouble) {
                        highestDouble = bone.left;
                        startingPlayer = socketId;
                    }
                }
            });
        });

        if (!startingPlayer) {
            // No doubles: player with highest single tile starts
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
        let lowestTotal = Infinity;
        let blockedWinner = null;
        
        const totals = {};
        
        this.playerOrder.forEach(socketId => {
            let total = 0;
            this.players[socketId].hand.forEach(b => { total += b.left + b.right });
            totals[socketId] = total;

            if (total < lowestTotal) {
                lowestTotal = total;
                blockedWinner = socketId;
            }
        });

        return { totals, blockedWinner };
    }

    // Calculate winner's score: sum of ALL opponents' remaining pips
    calculateWinnerScore(winnerId) {
        let score = 0;
        this.playerOrder.forEach(socketId => {
            if (socketId !== winnerId) {
                this.players[socketId].hand.forEach(b => {
                    score += b.left + b.right;
                });
            }
        });
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
