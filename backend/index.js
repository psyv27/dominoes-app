const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const RoomManager = require('./RoomManager');
const BotAI = require('./BotAI');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

app.use('/auth', authRoutes);

// Serve frontend static files in production (when frontend/dist exists)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const roomManager = new RoomManager();
const turnTimers = {}; // roomId -> { timer, secondsLeft }
const botInstances = {}; // roomId -> BotAI instance

// ---- TURN TIMER ----
function startTurnTimer(roomId) {
    clearTurnTimer(roomId);
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game || room.game.state !== 'playing') return;

    const duration = room.turnTimer || 10;
    let secondsLeft = duration;

    io.to(roomId).emit('turnTimerStart', { secondsLeft, turn: room.game.turn });

    turnTimers[roomId] = {
        secondsLeft,
        timer: setInterval(() => {
            secondsLeft--;
            io.to(roomId).emit('turnTimerTick', { secondsLeft, turn: room.game.turn });

            if (secondsLeft <= 0) {
                clearTurnTimer(roomId);
                // Auto-pass: time ran out
                handleAutoPass(roomId);
            }
        }, 1000)
    };
}

function clearTurnTimer(roomId) {
    if (turnTimers[roomId]) {
        clearInterval(turnTimers[roomId].timer);
        delete turnTimers[roomId];
    }
}

function handleAutoPass(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game || room.game.state !== 'playing') return;

    const currentTurn = room.game.turn;

    // Try to draw if possible, otherwise pass
    const result = room.game.drawBone(currentTurn);
    if (result.success) {
        if (result.blocked && result.winner) {
            handleRoundEnd(roomId, result);
            return;
        }
        if (result.passed) {
            io.to(roomId).emit('playerAutoAction', { playerId: currentTurn, action: 'passed' });
        }
    } else {
        // Has valid moves but didn't play — force a random play
        const hand = room.game.players[currentTurn]?.hand;
        if (hand && hand.length > 0) {
            const validMoves = room.game.getValidMoves(hand);
            if (validMoves.length > 0) {
                const bone = validMoves[0];
                const board = room.game.board;
                let end = 'right';
                if (board.length > 0) {
                    const leftEnd = board[0].left;
                    const rightEnd = board[board.length - 1].right;
                    if (bone.left === rightEnd || bone.right === rightEnd) end = 'right';
                    else end = 'left';
                }
                const playResult = room.game.playBone(currentTurn, bone, end);
                if (playResult.success && playResult.winner) {
                    handleRoundEnd(roomId, playResult);
                    return;
                }
            }
        }
    }

    broadcastGameState(roomId);
    scheduleBotTurn(roomId);
    startTurnTimer(roomId);
}

// ---- ROUND END HELPER ----
function handleRoundEnd(roomId, result) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    clearTurnTimer(roomId);
    
    // Increment points
    const winnerScore = result.winnerScore || 0;
    room.scores[result.winner] = (room.scores[result.winner] || 0) + winnerScore;

    // Increment round wins for Best Of formats
    if (result.winner) {
        room.roundWins[result.winner] = (room.roundWins[result.winner] || 0) + 1;
    }

    let matchOver = false;
    
    if (room.matchFormat === 'Score') {
        for (let id in room.scores) {
            if (room.scores[id] >= room.targetScore) {
                matchOver = true;
                io.to(roomId).emit('matchOver', { winner: id, scores: room.scores });
                room.state = 'finished';
                break;
            }
        }
    } else {
        // Match formats: Best of 1, 3, or 5
        let requiredWins = 1;
        if (room.matchFormat === 'Best of 3') requiredWins = 2;
        if (room.matchFormat === 'Best of 5') requiredWins = 3;

        for (let id in room.roundWins) {
            if (room.roundWins[id] >= requiredWins) {
                matchOver = true;
                // Emit with roundWins instead of scores for the end screen
                io.to(roomId).emit('matchOver', { winner: id, scores: room.roundWins, formatWins: true });
                room.state = 'finished';
                break;
            }
        }
    }

    if (!matchOver) {
        io.to(roomId).emit('roundEnd', { winner: result.winner, reason: result.reason, scores: room.scores, roundWins: room.roundWins });
    }
    broadcastGameState(roomId);
}

// ---- BOT TURN LOGIC ----
function scheduleBotTurn(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game || room.game.state !== 'playing') return;

    const currentTurn = room.game.turn;
    const player = room.players[currentTurn];
    if (!player || !player.isBot) return;

    const bot = botInstances[roomId];
    if (!bot) return;

    // Bot thinks for a realistic delay based on difficulty
    const delays = { easy: 1200, normal: 1800, hard: 2500 };
    const delay = delays[player.botDifficulty] || 1500;

    setTimeout(() => {
        executeBotTurn(roomId, currentTurn);
    }, delay);
}

function executeBotTurn(roomId, botId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game || room.game.state !== 'playing') return;
    if (room.game.turn !== botId) return; // Turn may have changed

    const bot = botInstances[roomId];
    const game = room.game;
    const hand = game.players[botId]?.hand;
    if (!hand) return;

    // Check if bot has valid moves
    const validMoves = game.getValidMoves(hand);

    if (validMoves.length === 0) {
        // Need to draw or pass
        const drawResult = game.drawBone(botId);
        if (drawResult.success) {
            if (drawResult.blocked && drawResult.winner) {
                handleRoundEnd(roomId, drawResult);
                return;
            }
            if (drawResult.passed) {
                // Track passes for hard AI
                const openEnds = game.getOpenEnds();
                bot.recordPass(botId, openEnds);
                io.to(roomId).emit('playerAutoAction', { playerId: botId, action: 'passed' });
                broadcastGameState(roomId);
                startTurnTimer(roomId);
                scheduleBotTurn(roomId);
                return;
            }
            // Drew a bone — try to play again
            broadcastGameState(roomId);
            setTimeout(() => executeBotTurn(roomId, botId), 800);
            return;
        }
        return;
    }

    // Bot chooses a move
    const move = bot.chooseMove(hand, game.board, room.scores, game.playerOrder, botId);
    if (!move) return;

    const result = game.playBone(botId, move.bone, move.end);
    if (result.success) {
        if (result.pointsEarnedThisTurn > 0) {
            room.scores[botId] = (room.scores[botId] || 0) + result.pointsEarnedThisTurn;
        }
        if (result.winner) {
            handleRoundEnd(roomId, result);
            return;
        }
        broadcastGameState(roomId);
        clearTurnTimer(roomId);
        startTurnTimer(roomId);
        scheduleBotTurn(roomId);
    }
}

// ---- SOCKET EVENTS ----
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.emit('roomsUpdated', roomManager.getPublicRooms());

    // --- LOBBY ---
    socket.on('getRooms', () => {
        socket.emit('roomsUpdated', roomManager.getPublicRooms());
    });

    socket.on('createRoom', (data) => {
        const roomId = roomManager.createRoom(socket.id, data.playerDetails, data.settings);
        const result = roomManager.joinRoom(roomId, socket.id, data.playerDetails);
        socket.join(roomId);
        io.emit('roomsUpdated', roomManager.getPublicRooms());
        socket.emit('roomJoined', result.room);
    });

    // --- SINGLE PLAYER ---
    socket.on('createSinglePlayer', (data) => {
        // data: { playerDetails, settings: { botDifficulty, botCount, gameMode, matchFormat, targetScore, turnTimer } }
        const settings = {
            ...data.settings,
            roomType: 'Private',
            isSinglePlayer: true,
            botDifficulty: data.settings.botDifficulty || 'normal',
            botCount: data.settings.botCount || 1
        };
        const roomId = roomManager.createRoom(socket.id, data.playerDetails, settings);
        const result = roomManager.joinRoom(roomId, socket.id, data.playerDetails);
        const room = roomManager.getRoom(roomId);

        // Add bots
        roomManager.addBots(roomId, settings.botCount, settings.botDifficulty);

        // Create bot AI instance
        botInstances[roomId] = new BotAI(settings.botDifficulty);

        socket.join(roomId);

        // Auto-start game BEFORE emitting roomJoined so room.state is 'playing'
        const startResult = roomManager.startGame(roomId);
        if (!startResult.error) {
            // Now emit roomJoined with room in 'playing' state
            socket.emit('roomJoined', room);
            io.to(roomId).emit('gameStarted', room);
            setTimeout(() => {
                broadcastGameState(roomId);
                startTurnTimer(roomId);
                scheduleBotTurn(roomId);
            }, 500);
        } else {
            socket.emit('roomJoined', room);
        }
    });

    socket.on('joinRoom', (data) => {
        const result = roomManager.joinRoom(data.roomId, socket.id, data.playerDetails);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            socket.join(data.roomId);
            io.to(data.roomId).emit('roomUpdated', result.room);
            io.emit('roomsUpdated', roomManager.getPublicRooms());
            socket.emit('roomJoined', result.room);
        }
    });

    socket.on('leaveRoom', () => {
        const room = roomManager.leaveRoom(socket.id);
        if (room) {
            clearTurnTimer(room.id);
            delete botInstances[room.id];
            socket.leave(room.id);
            io.to(room.id).emit('roomUpdated', room);
            io.emit('roomsUpdated', roomManager.getPublicRooms());
        }
    });

    socket.on('chatMessage', (data) => {
        io.to(data.roomId).emit('chatMessage', data);
    });

    socket.on('sendEmoji', (data) => {
        // data: { roomId, emoji, senderId }
        io.to(data.roomId).emit('emojiReceived', data);
    });

    socket.on('kickPlayer', ({ roomId, targetSocketId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.hostId !== socket.id) return;
        if (room.state !== 'waiting') return;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.leave(roomId);
            targetSocket.emit('kicked', 'You have been kicked from the room.');
        }
        delete room.players[targetSocketId];
        delete roomManager.socketToRoom[targetSocketId];
        io.to(roomId).emit('roomUpdated', room);
        io.emit('roomsUpdated', roomManager.getPublicRooms());
    });

    socket.on('switchTeam', ({ roomId, team }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.state !== 'waiting') return;
        if (!room.players[socket.id]) return;
        room.players[socket.id].team = team;
        io.to(roomId).emit('roomUpdated', room);
    });

    // --- GAME EVENTS ---
    socket.on('startGame', (roomId) => {
        const room = roomManager.getRoom(roomId);
        if (room && room.hostId === socket.id) {
            const result = roomManager.startGame(roomId);
            if (result.error) {
                socket.emit('error', result.error);
            } else {
                io.to(roomId).emit('gameStarted', room);
                setTimeout(() => {
                    broadcastGameState(roomId);
                    startTurnTimer(roomId);
                    scheduleBotTurn(roomId);
                }, 500);
            }
        }
    });

    socket.on('playBone', ({ roomId, bone, end }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;

        const result = room.game.playBone(socket.id, bone, end);
        if (result.success) {
            if (result.pointsEarnedThisTurn > 0) {
                room.scores[socket.id] = (room.scores[socket.id] || 0) + result.pointsEarnedThisTurn;
            }
            if (result.winner) {
                handleRoundEnd(roomId, result);
                return;
            }
            broadcastGameState(roomId);
            clearTurnTimer(roomId);
            startTurnTimer(roomId);
            scheduleBotTurn(roomId);
        } else {
            socket.emit('moveError', result.error);
        }
    });

    socket.on('nextRound', (roomId) => {
        const room = roomManager.getRoom(roomId);
        if (room && room.hostId === socket.id && room.state !== 'finished') {
            room.currentRoundNumber++;
            // Pass the updated round number
            room.game = new DominoGame(room.gameMode, room.teamMode, room.matchFormat, room.currentRoundNumber);
            room.game.startGame();
            
            // Re-add players to the new game instance
            Object.keys(room.players).forEach(id => {
                room.game.addPlayer(id);
            });
            room.game.startGame();

            io.to(roomId).emit('gameStarted', room);
            broadcastGameState(roomId);
            startTurnTimer(roomId);
            scheduleBotTurn(roomId);
        }
    });

    socket.on('drawBone', (roomId) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;

        const result = room.game.drawBone(socket.id);
        if (result.success) {
            if (result.blocked && result.winner) {
                handleRoundEnd(roomId, result);
                return;
            }
            if (result.passed) {
                socket.emit('playerPassed', { playerId: socket.id });
                broadcastGameState(roomId);
                clearTurnTimer(roomId);
                startTurnTimer(roomId);
                scheduleBotTurn(roomId);
                return;
            }
            socket.emit('boneDrawn', { bone: result.drawnBone, canPlayNow: result.canPlayNow, deckRemaining: result.deckRemaining });
            socket.emit('gameState', getGameStateForPlayer(roomId, socket.id));
            broadcastGameState(roomId);
        } else {
            socket.emit('moveError', result.error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const room = roomManager.leaveRoom(socket.id);
        if (room) {
            clearTurnTimer(room.id);
            delete botInstances[room.id];
            io.to(room.id).emit('roomUpdated', room);
            io.emit('roomsUpdated', roomManager.getPublicRooms());
        }
    });
});

// ---- HELPER FUNCTIONS ----
function getGameStateForPlayer(roomId, socketId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game) return null;
    const game = room.game;
    return {
        board: game.board,
        turn: game.turn,
        state: game.state,
        deckCount: game.deck.length,
        hand: game.players[socketId]?.hand || [],
        opponents: getOpponents(roomId, socketId),
        scores: room.scores,
        turnTimer: room.turnTimer
    };
}

function getOpponents(roomId, socketId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game) return {};
    const opps = {};
    for (let id in room.game.players) {
        if (id !== socketId) {
            opps[id] = room.game.players[id].hand.length;
        }
    }
    return opps;
}

function broadcastGameState(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game) return;
    // Only broadcast to real sockets (not bots)
    room.game.playerOrder.forEach(socketId => {
        if (!room.players[socketId]?.isBot) {
            io.to(socketId).emit('gameState', getGameStateForPlayer(roomId, socketId));
        }
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
