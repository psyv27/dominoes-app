const DominoGame = require('./game');
const { v4: uuidv4 } = require('uuid');

class RoomManager {
    constructor() {
        this.rooms = {}; // roomId -> room object
        this.socketToRoom = {}; // socketId -> roomId
    }

    createRoom(hostId, hostDetails, settings) {
        const roomId = uuidv4().substring(0, 8);
        
        const room = {
            id: roomId,
            hostId,
            players: {}, // socketId -> { id, nickname, isGuest, team, isBot, botDifficulty }
            roomType: settings.roomType || 'Public',
            gameMode: settings.gameMode || 'Normal',
            teamMode: settings.teamMode || 'Free For All',
            matchFormat: settings.matchFormat || 'Score', // 'Score', 'Best of 1', 'Best of 3', 'Best of 5'
            targetScore: settings.targetScore || 100, // Only used if matchFormat === 'Score'
            turnTimer: Math.max(10, Math.min(60, settings.turnTimer || 10)), // 10-60 seconds
            isSinglePlayer: settings.isSinglePlayer || false,
            botDifficulty: settings.botDifficulty || 'normal',
            botCount: settings.botCount || 1, // 1 or 3 bots
            state: 'waiting',
            game: null,
            scores: {},
            roundWins: {}, // For Best of X formats
            currentRoundNumber: 1
        };

        this.rooms[roomId] = room;
        return roomId;
    }

    getRoom(roomId) {
        return this.rooms[roomId];
    }

    getPublicRooms() {
        return Object.values(this.rooms)
            .filter(r => r.roomType === 'Public' && r.state === 'waiting' && !r.isSinglePlayer)
            .map(r => ({
                id: r.id,
                hostId: r.hostId,
                playerCount: Object.keys(r.players).filter(id => !r.players[id].isBot).length,
                gameMode: r.gameMode,
                teamMode: r.teamMode,
                matchFormat: r.matchFormat,
                targetScore: r.targetScore,
                turnTimer: r.turnTimer
            }));
    }

    joinRoom(roomId, socketId, playerDetails) {
        const room = this.rooms[roomId];
        if (!room) return { error: 'Room not found' };
        if (room.state !== 'waiting') return { error: 'Game already started' };
        
        const currentPlayers = Object.keys(room.players).length;
        if (currentPlayers >= 4) return { error: 'Room is full' };

        let team = null;
        if (room.teamMode === 'Team Mode (2 vs 2)') {
            team = (currentPlayers % 2 === 0) ? 1 : 2;
        }

        room.players[socketId] = {
            ...playerDetails,
            socketId,
            team,
            ready: false,
            isBot: false
        };

        this.socketToRoom[socketId] = roomId;
        return { success: true, room };
    }

    /**
     * Add bot players to a room
     */
    addBots(roomId, count, difficulty) {
        const room = this.rooms[roomId];
        if (!room) return;

        const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];
        const botColors = ['#26a5c9', '#e8a030', '#9c5ec4'];

        for (let i = 0; i < count && Object.keys(room.players).length < 4; i++) {
            const botId = `bot-${uuidv4().substring(0, 6)}`;
            room.players[botId] = {
                nickname: botNames[i] || `Bot ${i + 1}`,
                isGuest: true,
                isBot: true,
                botDifficulty: difficulty,
                botColor: botColors[i] || '#888',
                socketId: botId,
                team: null,
                ready: true
            };
        }
    }

    leaveRoom(socketId) {
        const roomId = this.socketToRoom[socketId];
        if (!roomId) return null;

        const room = this.rooms[roomId];
        if (room) {
            const wasPlaying = room.state === 'playing';
            const wasHost = room.hostId === socketId;
            let destroyed = false;
            let aborted = false;

            delete room.players[socketId];
            delete this.socketToRoom[socketId];

            if (room.game) {
                room.game.removePlayer(socketId);
            }

            // Remove all bots if human leaves a single-player room
            if (room.isSinglePlayer) {
                const humanPlayers = Object.keys(room.players).filter(id => !room.players[id].isBot);
                if (humanPlayers.length === 0) {
                    delete this.rooms[roomId];
                    return { room, destroyed: true };
                }
            }

            if (Object.keys(room.players).filter(id => !room.players[id]?.isBot).length === 0 || wasHost) {
                // Host left or room empty -> Destroy room
                delete this.rooms[roomId];
                destroyed = true;
            } else if (wasPlaying) {
                // A player left during an active match -> Abort Match
                room.state = 'waiting';
                room.game = null;
                aborted = true;
            }

            return { room, destroyed, aborted };
        }
        return null;
    }

    startGame(roomId) {
        const room = this.rooms[roomId];
        if (!room) return { error: 'Room not found' };
        
        const playerIds = Object.keys(room.players);
        if (playerIds.length < 2) return { error: 'Need at least 2 players' };

        room.state = 'playing';
        room.game = new DominoGame(
            room.gameMode, 
            room.teamMode, 
            room.matchFormat, 
            room.currentRoundNumber,
            room.lastRoundWinner,
            room.lastPlayerToMove
        );
        
        playerIds.forEach(id => {
            room.scores[id] = room.scores[id] || 0;
            room.roundWins[id] = room.roundWins[id] || 0;
            room.game.addPlayer(id);
        });

        room.game.startGame();
        return { success: true, room };
    }

    /**
     * Get list of bot player IDs in a room
     */
    getBotIds(roomId) {
        const room = this.rooms[roomId];
        if (!room) return [];
        return Object.keys(room.players).filter(id => room.players[id]?.isBot);
    }
}

module.exports = RoomManager;
