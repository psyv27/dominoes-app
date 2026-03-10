import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { LogOut, Plus, Users, Hash, PlaySquare, ShoppingBag, Backpack, Bot, Timer } from 'lucide-react';
import './Lobby.css';

export default function Lobby() {
    const { user, logout } = useAuth() as any;
    const { socket, isConnected } = useSocket() as any;
    const navigate = useNavigate();
    
    const [rooms, setRooms] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showSinglePlayer, setShowSinglePlayer] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [settings, setSettings] = useState({
        roomType: 'Public',
        gameMode: 'Normal',
        teamMode: 'Free For All',
        targetScore: 100,
        turnTimer: 10
    });
    const [spSettings, setSpSettings] = useState({
        botDifficulty: 'normal',
        botCount: 1,
        gameMode: 'Normal',
        targetScore: 100,
        turnTimer: 10
    });

    useEffect(() => {
        if (!socket) return;
        if (!isConnected) socket.connect();

        socket.emit('getRooms');
        socket.on('roomsUpdated', (updatedRooms: any) => setRooms(updatedRooms));
        socket.on('roomJoined', (room: any) => navigate(`/room/${room.id}`));
        socket.on('error', (err: string) => alert(err));

        return () => {
            socket.off('roomsUpdated');
            socket.off('roomJoined');
            socket.off('error');
        };
    }, [socket, isConnected, navigate]);

    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        socket.emit('createRoom', { playerDetails: user, settings });
    };

    const handleStartSinglePlayer = (e: React.FormEvent) => {
        e.preventDefault();
        socket.emit('createSinglePlayer', {
            playerDetails: user,
            settings: spSettings
        });
    };

    const handleJoinPublic = (roomId: string) => {
        socket.emit('joinRoom', { roomId, playerDetails: user });
    };

    const handleJoinPrivate = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.trim()) {
            socket.emit('joinRoom', { roomId: joinCode.trim(), playerDetails: user });
        }
    };

    const handleLogout = () => {
        if (socket) socket.disconnect();
        logout();
        navigate('/');
    };

    return (
        <div className="lobby-container">
            <header className="lobby-header">
                <div>
                    <h1>Dominoes Master</h1>
                    <div className="user-profile">
                        <span className="nickname">{user?.nickname}</span>
                        {user?.isGuest ? (
                            <span className="badge guest-badge">Guest</span>
                        ) : (
                            <>
                                <span className="badge rank-badge">Rank {user?.rank_level}</span>
                                <span className="xp-text">{user?.xp} XP</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="lobby-nav">
                    <button className="nav-btn" onClick={() => navigate('/store')}>
                        <ShoppingBag size={18} /> Store
                    </button>
                    <button className="nav-btn" onClick={() => navigate('/inventory')}>
                        <Backpack size={18} /> Inventory
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            <div className="lobby-content">
                {/* ================== SINGLE PLAYER SECTION ================== */}
                <div className="sp-section">
                    <button className="sp-toggle-btn" onClick={() => { setShowSinglePlayer(!showSinglePlayer); setShowCreate(false); }}>
                        <Bot size={20} /> Play vs Bots
                    </button>

                    {showSinglePlayer && (
                        <div className="sp-panel">
                            <h3><Bot size={18} /> Single Player Setup</h3>
                            <form onSubmit={handleStartSinglePlayer}>
                                <div className="settings-grid">
                                    <label>
                                        Bot Difficulty
                                        <select value={spSettings.botDifficulty} onChange={e => setSpSettings({...spSettings, botDifficulty: e.target.value})}>
                                            <option value="easy">🟢 Easy</option>
                                            <option value="normal">🟡 Normal</option>
                                            <option value="hard">🔴 Hard</option>
                                        </select>
                                    </label>
                                    <label>
                                        Number of Bots
                                        <select value={spSettings.botCount} onChange={e => setSpSettings({...spSettings, botCount: parseInt(e.target.value)})}>
                                            <option value={1}>1 Bot (1v1)</option>
                                            <option value={3}>3 Bots (1v3)</option>
                                        </select>
                                    </label>
                                    <label>
                                        Game Mode
                                        <select value={spSettings.gameMode} onChange={e => setSpSettings({...spSettings, gameMode: e.target.value})}>
                                            <option>Normal</option>
                                            <option>All Fives</option>
                                            <option>Blocking Mode</option>
                                        </select>
                                    </label>
                                    <label>
                                        Target Score
                                        <input type="number" value={spSettings.targetScore} min="10" step="10" onChange={e => setSpSettings({...spSettings, targetScore: parseInt(e.target.value)})} />
                                    </label>
                                    <label>
                                        <Timer size={14} /> Turn Timer (sec)
                                        <input type="number" value={spSettings.turnTimer} min={10} max={60} step={5} onChange={e => setSpSettings({...spSettings, turnTimer: parseInt(e.target.value) || 10})} />
                                    </label>
                                </div>
                                <button type="submit" className="primary-btn sp-start-btn">
                                    <Bot size={18} /> Start Game
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* ================== MULTIPLAYER SECTION ================== */}
                <div className="rooms-section">
                    <div className="section-header">
                        <h2>Public Rooms</h2>
                        <button className="create-btn" onClick={() => { setShowCreate(!showCreate); setShowSinglePlayer(false); }}>
                            <Plus size={18} /> Create Room
                        </button>
                    </div>

                    {showCreate && (
                        <div className="create-room-panel">
                            <h3>Room Settings</h3>
                            <form onSubmit={handleCreateRoom}>
                                <div className="settings-grid">
                                    <label>
                                        Room Type
                                        <select value={settings.roomType} onChange={e => setSettings({...settings, roomType: e.target.value})}>
                                            <option>Public</option>
                                            <option>Private</option>
                                        </select>
                                    </label>
                                    <label>
                                        Game Mode
                                        <select value={settings.gameMode} onChange={e => setSettings({...settings, gameMode: e.target.value})}>
                                            <option>Normal</option>
                                            <option>All Fives</option>
                                            <option>Blocking Mode</option>
                                        </select>
                                    </label>
                                    <label>
                                        Team Mode
                                        <select value={settings.teamMode} onChange={e => setSettings({...settings, teamMode: e.target.value})}>
                                            <option>Free For All</option>
                                            <option>Team Mode (2 vs 2)</option>
                                        </select>
                                    </label>
                                    <label>
                                        Target Score
                                        <input type="number" value={settings.targetScore} min="10" step="10" onChange={e => setSettings({...settings, targetScore: parseInt(e.target.value)})} />
                                    </label>
                                    <label>
                                        <Timer size={14} /> Turn Timer (sec)
                                        <input type="number" value={settings.turnTimer} min={10} max={60} step={5} onChange={e => setSettings({...settings, turnTimer: parseInt(e.target.value) || 10})} />
                                    </label>
                                </div>
                                <button type="submit" className="primary-btn">Create & Join</button>
                            </form>
                        </div>
                    )}

                    <div className="private-join-panel">
                        <form onSubmit={handleJoinPrivate} className="private-join-form">
                            <div className="input-group">
                                <Hash className="input-icon" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Enter Private Room Code" 
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="join-btn">Join</button>
                        </form>
                    </div>

                    <div className="rooms-list">
                        {rooms.length === 0 ? (
                            <div className="empty-rooms">
                                <PlaySquare size={48} opacity={0.2} />
                                <p>No public rooms available.</p>
                                <span>Create one to start playing!</span>
                            </div>
                        ) : (
                            rooms.map(room => (
                                <div key={room.id} className="room-card">
                                    <div className="room-info">
                                        <h4>{room.gameMode}</h4>
                                        <div className="room-tags">
                                            <span className="tag"><Users size={14}/> {room.playerCount}/4</span>
                                            <span className="tag mode-tag">{room.teamMode}</span>
                                            <span className="tag score-tag">First to {room.targetScore}</span>
                                            <span className="tag timer-tag"><Timer size={12}/> {room.turnTimer}s</span>
                                        </div>
                                    </div>
                                    <button 
                                        className="join-btn" 
                                        onClick={() => handleJoinPublic(room.id)}
                                        disabled={room.playerCount >= 4}
                                    >
                                        {room.playerCount >= 4 ? 'Full' : 'Join'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
