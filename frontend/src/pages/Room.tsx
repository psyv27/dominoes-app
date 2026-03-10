import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Users, Crown, LogOut, MessageSquare, X } from 'lucide-react';
import Gameplay from './Gameplay';
import './Room.css';

export default function Room() {
    const { id } = useParams();
    const { user } = useAuth() as any;
    const { socket } = useSocket() as any;
    const navigate = useNavigate();
    const location = useLocation();

    // If room was passed via navigation state (from Lobby), use it immediately
    const passedRoom = (location.state as any)?.room || null;
    const [room, setRoom] = useState<any>(passedRoom);
    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        if (!socket) return;

        // Only emit joinRoom if room wasn't already passed (i.e. direct URL navigation)
        if (!passedRoom) {
            socket.emit('joinRoom', { roomId: id, playerDetails: user });
        }

        socket.on('roomUpdated', (updatedRoom: any) => {
            setRoom(updatedRoom);
        });

        socket.on('roomJoined', (joinedRoom: any) => {
            setRoom(joinedRoom);
        });

        socket.on('gameStarted', (startedRoom: any) => {
            setRoom(startedRoom);
        });

        socket.on('chatMessage', (msg: any) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('kicked', (reason: string) => {
            alert(reason);
            navigate('/lobby');
        });

        return () => {
            socket.off('roomUpdated');
            socket.off('roomJoined');
            socket.off('gameStarted');
            socket.off('chatMessage');
            socket.off('kicked');
        };
    }, [id, socket, user, navigate]);

    const handleLeave = () => {
        socket.emit('leaveRoom');
        navigate('/lobby');
    };

    const handleStartGame = () => {
        socket.emit('startGame', id);
    };

    const handleSendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            socket.emit('chatMessage', { 
                roomId: id, 
                message: chatInput, 
                nickname: user?.nickname || 'Guest'
            });
            setChatInput('');
        }
    };

    const handleKick = (targetSocketId: string) => {
        socket.emit('kickPlayer', { roomId: id, targetSocketId });
    };

    const handleSwitchTeam = (team: number) => {
        socket.emit('switchTeam', { roomId: id, team });
    };

    if (!room) {
        return <div className="room-loading">Loading room...</div>;
    }

    if (room.state === 'playing' || room.state === 'finished') {
        return <Gameplay room={room} />;
    }

    const isHost = room.hostId === socket.id;
    const players = Object.values(room.players) as any[];
    const isTeamMode = room.teamMode === 'Team Mode (2 vs 2)';

    return (
        <div className="room-container">
            <header className="room-header">
                <div className="room-title">
                    <h1>Room Code: <span>{room.id}</span></h1>
                    <div className="room-badges">
                        <span className="badge">{room.gameMode}</span>
                        <span className="badge">{room.teamMode}</span>
                        {room.matchFormat === 'Score' ? (
                            <span className="badge">First to {room.targetScore}</span>
                        ) : (
                            <span className="badge">{room.matchFormat}</span>
                        )}
                    </div>
                </div>
                <button className="leave-btn" onClick={handleLeave}>
                    <LogOut size={18} /> Leave
                </button>
            </header>

            <div className="room-layout">
                <div className="players-panel">
                    <div className="panel-header">
                        <h2>Players ({players.length}/4)</h2>
                        <Users size={20} className="icon-muted" />
                    </div>
                    
                    <div className="players-list">
                        {players.map((p: any) => (
                            <div key={p.socketId} className={`player-row ${p.socketId === socket.id ? 'is-me' : ''}`}>
                                <div className="player-info">
                                    <div className="avatar">{p.nickname?.charAt(0)?.toUpperCase() || '?'}</div>
                                    <div>
                                        <div className="p-name">
                                            {p.nickname} {p.socketId === socket.id && '(You)'}
                                        </div>
                                        {isTeamMode && (
                                            <div className="team-controls">
                                                {p.socketId === socket.id ? (
                                                    <>
                                                        <button 
                                                            className={`team-btn ${p.team === 1 ? 'active-team' : ''}`}
                                                            onClick={() => handleSwitchTeam(1)}
                                                        >Team 1</button>
                                                        <button 
                                                            className={`team-btn ${p.team === 2 ? 'active-team' : ''}`}
                                                            onClick={() => handleSwitchTeam(2)}
                                                        >Team 2</button>
                                                    </>
                                                ) : (
                                                    <span className="p-team">Team {p.team || '?'}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="player-actions">
                                    {room.hostId === p.socketId && <Crown size={18} color="#cf9b22" />}
                                    {isHost && p.socketId !== socket.id && (
                                        <button className="kick-btn" onClick={() => handleKick(p.socketId)} title="Kick Player">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {[...Array(4 - players.length)].map((_, i) => (
                            <div key={`empty-${i}`} className="player-row empty-slot">
                                Waiting for player...
                            </div>
                        ))}
                    </div>

                    {isHost && (
                        <div className="host-controls">
                            <button 
                                className="start-btn" 
                                onClick={handleStartGame}
                                disabled={players.length < 2}
                            >
                                Start Game
                            </button>
                            {players.length < 2 && <p className="host-tip">Need at least 2 players to start.</p>}
                        </div>
                    )}
                </div>

                <div className="chat-panel">
                    <div className="panel-header">
                        <h2>Lobby Chat</h2>
                        <MessageSquare size={20} className="icon-muted" />
                    </div>
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="empty-chat">Say hello!</div>
                        ) : (
                            messages.map((m: any, i: number) => (
                                <div key={i} className="message">
                                    <span className="msg-author">{m.nickname}:</span>
                                    <span className="msg-text">{m.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <form className="chat-input" onSubmit={handleSendChat}>
                        <input 
                            type="text" 
                            placeholder="Type a message..." 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                        />
                        <button type="submit">Send</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
