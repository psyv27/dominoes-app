class DominoGame {
    constructor() {
        this.deck = [];
        this.players = {}; // { socketId: { hand: [] } }
        this.board = []; // Array of dominoes played e.g. [{ left: 6, right: 6 }]
        this.turn = null; // socketId of the player whose turn it is
        this.playerOrder = [];
        this.state = 'waiting'; // waiting, playing, finished
        
        this.generateDeck();
        this.shuffleDeck();
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
        if (this.state !== 'waiting') return false;
        if (Object.keys(this.players).length >= 4) return false;

        this.players[socketId] = { hand: [] };
        this.playerOrder.push(socketId);
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        this.playerOrder = this.playerOrder.filter(id => id !== socketId);
        if (this.turn === socketId) {
            this.nextTurn();
        }
        if (Object.keys(this.players).length < 2) {
            this.state = 'waiting';
        }
    }

    startGame() {
        if (Object.keys(this.players).length < 2) return false;
        
        this.generateDeck();
        this.shuffleDeck();
        this.board = [];
        
        // Deal 7 bones to each player
        for (let socketId in this.players) {
            this.players[socketId].hand = this.deck.splice(0, 7);
        }

        // Determine starting player (simplification: random or first)
        this.turn = this.playerOrder[0];
        this.state = 'playing';
        return true;
    }

    getValidMoves(hand) {
        if (this.board.length === 0) {
            // first move, everything is valid
            return hand;
        }

        const leftEnd = this.board[0].left;
        const rightEnd = this.board[this.board.length - 1].right;

        return hand.filter(bone => 
            bone.left === leftEnd || bone.right === leftEnd || 
            bone.left === rightEnd || bone.right === rightEnd
        );
    }

    playBone(socketId, bone, end) { // end can be 'left' or 'right'
        if (this.turn !== socketId) return { error: 'Not your turn' };

        const playerHand = this.players[socketId].hand;
        const boneIndex = playerHand.findIndex(b => (b.left === bone.left && b.right === bone.right) || (b.left === bone.right && b.right === bone.left));
        
        if (boneIndex === -1) return { error: 'Bone not in hand' };

        let playedBone = playerHand[boneIndex];

        if (this.board.length === 0) {
            this.board.push(playedBone);
            playerHand.splice(boneIndex, 1);
            this.nextTurn();
            return { success: true };
        }

        const leftEnd = this.board[0].left;
        const rightEnd = this.board[this.board.length - 1].right;

        // Check valid placement
        if (end === 'left') {
            if (playedBone.right === leftEnd) {
                this.board.unshift(playedBone);
            } else if (playedBone.left === leftEnd) {
                // flip
                this.board.unshift({ left: playedBone.right, right: playedBone.left });
            } else {
                return { error: 'Invalid move' };
            }
        } else if (end === 'right') {
            if (playedBone.left === rightEnd) {
                this.board.push(playedBone);
            } else if (playedBone.right === rightEnd) {
                // flip
                this.board.push({ left: playedBone.right, right: playedBone.left });
            } else {
                return { error: 'Invalid move' };
            }
        } else {
             return { error: 'Invalid move end' };
        }

        playerHand.splice(boneIndex, 1);

        if (playerHand.length === 0) {
            this.state = 'finished';
            return { success: true, winner: socketId };
        }

        this.nextTurn();
        return { success: true };
    }

    drawBone(socketId) {
        if (this.turn !== socketId) return { error: 'Not your turn' };
        
        const validMoves = this.getValidMoves(this.players[socketId].hand);
        if (validMoves.length > 0) return { error: 'You have valid moves, cannot draw' };

        if (this.deck.length === 0) {
            // Pass turn
            this.nextTurn();
            return { success: true, message: 'No bones left, turn passed' };
        }

        const bone = this.deck.pop();
        this.players[socketId].hand.push(bone);
        return { success: true, bone };
    }

    nextTurn() {
        const turnIndex = this.playerOrder.indexOf(this.turn);
        this.turn = this.playerOrder[(turnIndex + 1) % this.playerOrder.length];
    }
}

module.exports = DominoGame;
