const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const DominoGame = require('./game');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const game = new DominoGame();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinGame', () => {
        const success = game.addPlayer(socket.id);
        if (success) {
            socket.emit('gameState', getGameStateForPlayer(socket.id));
            io.emit('playerList', game.playerOrder);
            console.log(`${socket.id} joined the game`);
        } else {
            socket.emit('error', 'Cannot join game. Game might be full or already started.');
        }
    });

    socket.on('startGame', () => {
        const success = game.startGame();
        if (success) {
            io.emit('gameStarted');
            broadcastGameState();
        }
    });

    socket.on('playBone', ({ bone, end }) => {
        const result = game.playBone(socket.id, bone, end);
        if (result.success) {
            if (result.winner) {
                io.emit('gameOver', { winner: result.winner });
            }
            broadcastGameState();
        } else {
            socket.emit('moveError', result.error);
        }
    });

    socket.on('drawBone', () => {
        const result = game.drawBone(socket.id);
        if (result.success) {
            socket.emit('gameState', getGameStateForPlayer(socket.id));
            if (result.message === 'No bones left, turn passed') {
                broadcastGameState();
            }
        } else {
            socket.emit('moveError', result.error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        game.removePlayer(socket.id);
        io.emit('playerList', game.playerOrder);
        broadcastGameState();
    });
});

function getGameStateForPlayer(socketId) {
    return {
        board: game.board,
        turn: game.turn,
        state: game.state,
        deckCount: game.deck.length,
        hand: game.players[socketId]?.hand || [],
        opponents: getOpponents(socketId)
    };
}

function getOpponents(socketId) {
    const opps = {};
    for (let id in game.players) {
        if (id !== socketId) {
            opps[id] = game.players[id].hand.length; // only send count of bones
        }
    }
    return opps;
}

function broadcastGameState() {
    game.playerOrder.forEach(socketId => {
        io.to(socketId).emit('gameState', getGameStateForPlayer(socketId));
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
