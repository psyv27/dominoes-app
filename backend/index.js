const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const RoomManager = require('./RoomManager');
const DominoGame = require('./game');
const BotAI = require('./BotAI');
const db = require('./db');
const InputValidator = require('./engine/InputValidator');
const GameStateSerializer = require('./engine/GameStateSerializer');

const app = express();
app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    console.log(`${req.method} ${req.url}`);
    next();
});

const userSocketMap = {}; // Maps userId -> socketId
const socketUserMap = {}; // Maps socketId -> userId
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Backend is alive on 5001');
});

app.get('/api/predefined-messages', (req, res) => {
    res.json(db.predefinedMessages);
});

// Serve frontend static files in production (when frontend/dist exists)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('{*path}', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
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

async function processMatchOver(room, winnerId) {
    if (!winnerId || room.isSinglePlayer) return;

    try {
        const entryFee = room.entryFee || 20;
        const totalPot = Object.keys(room.players).length * entryFee;
        const isTeam = room.teamMode === '2v2 Teams';
        const numPlayers = Object.keys(room.players).length;

        const playersArr = Object.values(room.players).filter(p => !p.isBot);
        if (playersArr.length === 0) return;

        let winners = [];
        if (isTeam) {
            const winTeam = room.players[winnerId].team;
            winners = Object.keys(room.players).filter(id => room.players[id].team === winTeam);
        } else {
            winners = [winnerId];
        }

        let ranked = Object.keys(room.players).sort((a,b) => (room.scores[b] || 0) - (room.scores[a] || 0));
        
        for (let i = 0; i < ranked.length; i++) {
            const pId = ranked[i];
            const player = room.players[pId];
            if (player.isBot) continue;

            const dbId = player.id; // From playerDetails

            let prize = 0;
            if (isTeam) {
                if (winners.includes(pId)) {
                    prize = totalPot / 2;
                }
            } else {
                if (numPlayers === 4) {
                    if (pId === winnerId) prize = entryFee * 2;
                    else if (i === 1) prize = entryFee * 1;
                    else if (i === 2) prize = entryFee;
                    else prize = 0;
                } else if (numPlayers === 3) {
                    if (pId === winnerId) prize = entryFee * 2;
                    else if (i === 1) prize = entryFee;
                    else prize = 0;
                } else {
                    if (pId === winnerId) prize = totalPot;
                }
            }

            const winIncr = winners.includes(pId) ? 1 : 0;
            const lossIncr = !winners.includes(pId) ? 1 : 0;

            await db.query(
                "UPDATE Users SET coins = coins + $1, games_played = games_played + 1, games_won = games_won + $2, games_lost = games_lost + $3, total_wins = total_wins + $2, total_games = total_games + 1 WHERE id = $4",
                [prize, winIncr, lossIncr, dbId]
            );
        }
    } catch (err) {
        console.error("Prize Dist Error:", err);
    }
}

// ---- ROUND END HELPER ----
function handleRoundEnd(roomId, result) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    clearTurnTimer(roomId);
    
    // Increment points
    const winnerScore = result.winnerScore || 0;
    room.scores[result.winner] = (room.scores[result.winner] || 0) + winnerScore;

    // Save previous winner info for next round
    room.lastRoundWinner = result.winner;
    room.lastPlayerToMove = room.game.lastPlayerToMove;
    room.currentRoundNumber++;

    // Increment round wins for Best Of formats
    if (result.winner) {
        room.roundWins[result.winner] = (room.roundWins[result.winner] || 0) + 1;
    }

    let matchOver = false;
    
    if (room.matchFormat === 'Score') {
        for (let id in room.scores) {
            if (room.scores[id] >= room.targetScore) {
                matchOver = true;
                processMatchOver(room, id);
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
                processMatchOver(room, id);
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

// ---- ANIMATED DEAL SEQUENCE ----
const MAX_DEAL_REDEALS = 10;

function startDealSequence(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game) return;

    const game = room.game;
    const DEAL_DELAY = 200; // ms between each tile

    game.dealOrder.forEach((deal, i) => {
        setTimeout(() => {
            // Guard: room may have been destroyed during dealing
            const currentRoom = roomManager.getRoom(roomId);
            if (!currentRoom || !currentRoom.game) return;

            currentRoom.game.dealTileToPlayer(deal.tileIndex, deal.toPlayer);

            io.to(roomId).emit('dealTile', {
                tileIndex: deal.tileIndex,
                toPlayer: deal.toPlayer,
                dealStep: deal.dealStep,
                totalDealt: i + 1,
                totalToDeal: game.dealOrder.length
            });

            // After the last tile is dealt, finalize
            if (i === game.dealOrder.length - 1) {
                setTimeout(() => {
                    const rm = roomManager.getRoom(roomId);
                    if (!rm || !rm.game) return;

                    const finalResult = rm.game.finalizeDeal();

                    if (finalResult.misdeal) {
                        // Get the invalid hand for reveal
                        const misdealInfo = rm.game.getMisdealHand();
                        io.to(roomId).emit('misdealReveal', {
                            playerId: misdealInfo?.playerId,
                            hand: misdealInfo?.hand,
                            reason: finalResult.reason
                        });

                        // After 3.5s reveal, restart dealing (with cap)
                        if (rm.game.misdealCount < MAX_DEAL_REDEALS) {
                            setTimeout(() => {
                                const rm2 = roomManager.getRoom(roomId);
                                if (!rm2 || !rm2.game) return;

                                rm2.game.prepareGame();
                                io.to(roomId).emit('dealPhaseStart', {
                                    fullDeck: rm2.game.fullDeck,
                                    playerOrder: rm2.game.playerOrder,
                                    dealOrder: rm2.game.dealOrder
                                });
                                startDealSequence(roomId);
                            }, 3500);
                        } else {
                            // Too many misdeals — fall back to instant deal
                            rm.game.startGame();
                            io.to(roomId).emit('dealComplete', {
                                boneyardIndices: [...Array(28).keys()].filter(idx => !rm.game.takenIndices.has(idx))
                            });
                            setTimeout(() => {
                                broadcastGameState(roomId);
                                startTurnTimer(roomId);
                                scheduleBotTurn(roomId);
                            }, 500);
                        }
                        return;
                    }

                    // No misdeal — transition to play
                    io.to(roomId).emit('dealComplete', {
                        boneyardIndices: [...Array(28).keys()].filter(idx => !rm.game.takenIndices.has(idx))
                    });

                    // Give time for boneyard formation animation
                    setTimeout(() => {
                        broadcastGameState(roomId);
                        startTurnTimer(roomId);
                        scheduleBotTurn(roomId);
                    }, 1500);
                }, 500); // brief pause after last deal
            }
        }, DEAL_DELAY * (i + 1));
    });
}

// ---- SOCKET EVENTS ----
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Register user ID for presence/invites
    socket.on('registerUser', (userId) => {
        if (userId) {
            userSocketMap[userId] = socket.id;
            socketUserMap[socket.id] = userId;
        }
    });

    socket.emit('roomsUpdated', roomManager.getPublicRooms());

    // --- LOBBY ---
    socket.on('getRooms', () => {
        socket.emit('roomsUpdated', roomManager.getPublicRooms());
    });

    socket.on('createRoom', async (data) => {
        if (!data.settings.isSinglePlayer) {
            const userCheck = await db.query('SELECT coins FROM Users WHERE id = $1', [data.playerDetails.id]);
            const coins = userCheck.rows.length > 0 ? userCheck.rows[0].coins : 0;
            const fee = data.settings.entryFee || 20;
            if (coins < fee) {
                socket.emit('error', 'Not enough coins to create this room (Requires ' + fee + ').');
                return;
            }
        }

        const createResult = roomManager.createRoom(socket.id, data.playerDetails, data.settings);
        if (createResult.error) {
            socket.emit('error', createResult.error);
            return;
        }
        const roomId = createResult.roomId;
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
        const createResult = roomManager.createRoom(socket.id, data.playerDetails, settings);
        if (createResult.error) {
            socket.emit('error', createResult.error);
            return;
        }
        const roomId = createResult.roomId;
        const result = roomManager.joinRoom(roomId, socket.id, data.playerDetails);
        const room = roomManager.getRoom(roomId);

        // Add bots
        roomManager.addBots(roomId, settings.botCount, settings.botDifficulty);

        // Create bot AI instance
        botInstances[roomId] = new BotAI(settings.botDifficulty);

        socket.join(roomId);

        // Auto-start game with animated dealing
        const startResult = roomManager.startGameWithDealing(roomId);
        if (!startResult.error) {
            // Now emit roomJoined with room in 'playing' state
            socket.emit('roomJoined', room);
            io.to(roomId).emit('gameStarted', room);

            // Emit deal phase start for animation
            io.to(roomId).emit('dealPhaseStart', {
                fullDeck: room.game.fullDeck,
                playerOrder: room.game.playerOrder,
                dealOrder: room.game.dealOrder
            });

            startDealSequence(roomId);
        } else {
            socket.emit('roomJoined', room);
        }
    });

    socket.on('joinRoom', async (data) => {
        const tempRoom = roomManager.getRoom(data.roomId);
        if (tempRoom && !tempRoom.isSinglePlayer) {
            const userCheck = await db.query('SELECT coins FROM Users WHERE id = $1', [data.playerDetails.id]);
            const coins = userCheck.rows.length > 0 ? userCheck.rows[0].coins : 0;
            if (coins < (tempRoom.entryFee || 20)) {
                socket.emit('error', 'Not enough coins to join this room (Requires ' + (tempRoom.entryFee || 20) + ').');
                return;
            }
        }

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

    socket.on('joinByCode', async (data) => {
        const roomId = roomManager.findRoomByInviteCode(data.inviteCode);
        if (!roomId) {
            socket.emit('joinCodeError', 'Invalid invite code');
            return;
        }
        
        const tempRoom = roomManager.getRoom(roomId);
        if (tempRoom && !tempRoom.isSinglePlayer) {
            const userCheck = await db.query('SELECT coins FROM Users WHERE id = $1', [data.playerDetails.id]);
            const coins = userCheck.rows.length > 0 ? userCheck.rows[0].coins : 0;
            if (coins < (tempRoom.entryFee || 20)) {
                socket.emit('joinCodeError', 'Not enough coins to join this room (Requires ' + (tempRoom.entryFee || 20) + ').');
                return;
            }
        }

        const result = roomManager.joinRoom(roomId, socket.id, data.playerDetails);
        if (result.error) {
            socket.emit('joinCodeError', result.error);
        } else {
            socket.join(roomId);
            io.to(roomId).emit('roomUpdated', result.room);
            io.emit('roomsUpdated', roomManager.getPublicRooms());
            socket.emit('roomJoined', result.room);
        }
    });

    socket.on('leaveRoom', () => {
        const result = roomManager.leaveRoom(socket.id);
        if (result && result.room) {
            const { room, destroyed, aborted } = result;
            clearTurnTimer(room.id);
            delete botInstances[room.id];
            socket.leave(room.id);

            if (destroyed) {
                io.to(room.id).emit('roomDestroyed', 'The host has left or room is empty. Room destroyed.');
                io.in(room.id).socketsLeave(room.id);
            } else if (aborted) {
                io.to(room.id).emit('matchAborted', 'A player disconnected. The match has been aborted.');
                io.to(room.id).emit('roomUpdated', room);
            } else {
                io.to(room.id).emit('roomUpdated', room);
            }
            io.emit('roomsUpdated', roomManager.getPublicRooms());
        }
    });

    socket.on('chatMessage', (data) => {
        if (data) {
            if (data.text) data.text = db.filterMessage(data.text);
            if (data.message) data.message = db.filterMessage(data.message);
        }
        io.to(data.roomId).emit('chatMessage', data);
    });

    socket.on('sendEmoji', (data) => {
        // data: { roomId, emoji, senderId }
        io.to(data.roomId).emit('emojiReceived', data);
    });

    socket.on('getAvailableStickers', () => {
        const userId = socketUserMap[socket.id];
        let allowed = [];
        if (userId) {
            allowed = db.customStickers.filter(s => !s.isHidden || s.allowedUsers.includes(userId));
        } else {
            allowed = db.customStickers.filter(s => !s.isHidden);
        }
        socket.emit('availableStickers', allowed);
    });

    socket.on('sendSticker', (data) => {
        // data: { roomId, stickerId, senderId }
        const userId = socketUserMap[socket.id];
        const defaultStickers = ['happy', 'angry', 'shocked', 'sad', 'laughing', 'cool', 'winking'];
        let valid = false;
        let attachUrl = null;

        if (defaultStickers.includes(data.stickerId)) {
            valid = true;
        } else {
            const ct = db.customStickers.find(s => s.id === data.stickerId);
            if (ct && (!ct.isHidden || (userId && ct.allowedUsers.includes(userId)))) {
                valid = true;
                attachUrl = ct.url;
            }
        }

        if (valid) {
            io.to(data.roomId).emit('stickerReceived', { ...data, stickerUrl: attachUrl });
        }
    });

    // Handle game invites
    socket.on('inviteToGame', ({ toId, roomId }) => {
        const targetSocketId = userSocketMap[toId];
        const senderUserId = socketUserMap[socket.id];
        if (targetSocketId && senderUserId) {
            const senderUser = db.users.find(u => u.id === senderUserId);
            io.to(targetSocketId).emit('gameInvite', {
                roomId,
                fromId: senderUserId,
                fromNickname: senderUser ? senderUser.nickname : 'A friend'
            });
        }
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
            const result = roomManager.startGameWithDealing(roomId);
            if (result.error) {
                socket.emit('error', result.error);
            } else {
                // Deduct entry fee on actual game start
                if (!room.isSinglePlayer) {
                    const entryFee = room.entryFee || 20;
                    for (const pid of Object.keys(room.players)) {
                        const player = room.players[pid];
                        if (!player.isBot) {
                            db.query("UPDATE Users SET coins = coins - $1 WHERE id = $2", [entryFee, player.id]).catch(err => console.error("Money Deduction Error", err));
                        }
                    }
                }

                const game = room.game;
                io.to(roomId).emit('gameStarted', room);

                // Emit deal phase start — client shows 28 face-down tiles
                io.to(roomId).emit('dealPhaseStart', {
                    fullDeck: game.fullDeck,
                    playerOrder: game.playerOrder,
                    dealOrder: game.dealOrder
                });

                // Start the animated dealing sequence
                startDealSequence(roomId);
            }
        }
    });

    socket.on('playBone', (data) => {
        // Input validation
        const validation = InputValidator.validatePlayBonePayload(data);
        if (!validation.valid) {
            socket.emit('moveError', validation.error);
            return;
        }
        const { roomId, bone, end } = validation.sanitized;

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
        if (!room || room.hostId !== socket.id) return;
        if (room.state === 'finished') return;

        room.currentRoundNumber++;
        room.state = 'playing';
        // Create fresh game instance with updated round number and previous winners
        room.game = new DominoGame(room.gameMode, room.teamMode, room.matchFormat, room.currentRoundNumber, room.lastRoundWinner, room.lastPlayerToMove);
        
        // Add all players FIRST, then prepare for animated dealing
        Object.keys(room.players).forEach(id => {
            room.game.addPlayer(id);
        });
        room.game.prepareGame();

        io.to(roomId).emit('gameStarted', room);

        // Emit deal phase start
        io.to(roomId).emit('dealPhaseStart', {
            fullDeck: room.game.fullDeck,
            playerOrder: room.game.playerOrder,
            dealOrder: room.game.dealOrder
        });

        startDealSequence(roomId);
    });

    socket.on('drawBone', (payload) => {
        // Support both old format (string roomId) and new format ({ roomId, boneyardIndex })
        let roomId, boneyardIndex;
        if (typeof payload === 'string') {
            roomId = payload;
            boneyardIndex = undefined;
        } else if (payload && typeof payload === 'object') {
            roomId = payload.roomId;
            boneyardIndex = payload.boneyardIndex;
        } else {
            socket.emit('moveError', 'Invalid drawBone payload');
            return;
        }

        // Input validation
        const roomIdCheck = InputValidator.validateDrawBonePayload(roomId);
        if (!roomIdCheck.valid) {
            socket.emit('moveError', roomIdCheck.error);
            return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;

        const result = room.game.drawBone(socket.id, boneyardIndex);
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
            socket.emit('gameState', GameStateSerializer.serializeForPlayer(room.game, room, socket.id));
            broadcastGameState(roomId);
        } else {
            socket.emit('moveError', result.error);
        }
    });

    // NOTE: Duplicate nextRound handler removed (was lines 515-533).
    // The primary nextRound handler above (line 467) handles both formats.

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Clean up socket map
        const userId = socketUserMap[socket.id];
        if (userId) {
            delete userSocketMap[userId];
            delete socketUserMap[socket.id];
        }

        const result = roomManager.leaveRoom(socket.id);
        if (result && result.room) {
            const { room, destroyed, aborted } = result;
            clearTurnTimer(room.id);
            delete botInstances[room.id];

            if (destroyed) {
                io.to(room.id).emit('roomDestroyed', 'The host has left or room is empty. Room destroyed.');
                io.in(room.id).socketsLeave(room.id);
            } else if (aborted) {
                io.to(room.id).emit('matchAborted', 'A player disconnected. The match has been aborted.');
                io.to(room.id).emit('roomUpdated', room);
            } else {
                io.to(room.id).emit('roomUpdated', room);
            }
            io.emit('roomsUpdated', roomManager.getPublicRooms());
        }
    });
});

// ---- HELPER FUNCTIONS ----
// Serialization delegated to GameStateSerializer for clean separation of concerns.

function getGameStateForPlayer(roomId, socketId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game) return null;
    return GameStateSerializer.serializeForPlayer(room.game, room, socketId);
}

function broadcastGameState(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game) return;
    // Only broadcast to real sockets (not bots)
    room.game.playerOrder.forEach(socketId => {
        if (!room.players[socketId]?.isBot) {
            io.to(socketId).emit('gameState', GameStateSerializer.serializeForPlayer(room.game, room, socketId));
        }
    });
}

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
