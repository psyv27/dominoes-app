import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Select, Slider, InputNumber, Modal, Input } from 'antd';
import { TrophyOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import './Lobby.css';

export default function Lobby() {
    const { user, logout, updateUser } = useAuth() as any;
    const { socket, isConnected } = useSocket() as any;
    const navigate = useNavigate();

    const [adLoading, setAdLoading] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showSinglePlayer, setShowSinglePlayer] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [showJoinCode, setShowJoinCode] = useState(false);
    const [joinCodeError, setJoinCodeError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [settings, setSettings] = useState({
        roomType: 'Public',
        inviteCode: '',
        gameMode: 'Normal',
        teamMode: 'Free For All',
        matchFormat: 'Score',
        targetScore: 100,
        turnTimer: 10,
        entryFee: 20
    });

    const [spSettings, setSpSettings] = useState({
        botDifficulty: 'normal',
        botCount: 1,
        gameMode: 'Normal',
        matchFormat: 'Score',
        targetScore: 100,
        turnTimer: 10
    });

    useEffect(() => {
        const isUserGuest = user?.isGuest || user?.is_guest;
        if (user && !isUserGuest) {
            const token = localStorage.getItem('token');
            if (token) {
                fetch('http://localhost:5001/auth/rewards/daily', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        updateUser({ coins: data.coins });
                        Modal.success({ title: 'Daily Bonus!', content: 'You received 100 coins for logging in today!', centered: true });
                    }
                })
                .catch(() => {});
            }
        }
    }, []);

    useEffect(() => {
        if (!socket) return;
        if (!isConnected) socket.connect();

        socket.emit('getRooms');
        socket.on('roomsUpdated', (updatedRooms: any) => setRooms(updatedRooms));
        socket.on('roomJoined', (room: any) => navigate(`/room/${room.id}`, { state: { room } }));
        socket.on('error', (err: string) => alert(err));
        socket.on('joinCodeError', (err: string) => setJoinCodeError(err));

        return () => {
            socket.off('roomsUpdated');
            socket.off('roomJoined');
            socket.off('error');
            socket.off('joinCodeError');
        };
    }, [socket, isConnected, navigate]);

    const getEquippedSkins = () => {
        try {
            const saved = localStorage.getItem('equipped');
            return saved ? JSON.parse(saved) : { domino: 'classic', table: 'dark' };
        } catch {
            return { domino: 'classic', table: 'dark' };
        }
    };

    const handleCreateRoom = () => {
        if (settings.roomType === 'Private' && settings.inviteCode.trim().length < 4) {
            alert("Private Room Code must be at least 4 characters.");
            return;
        }
        socket.emit('createRoom', {
            playerDetails: { ...user, equippedSkins: getEquippedSkins() },
            settings
        });
        setShowCreate(false);
    };

    const handleStartSinglePlayer = () => {
        socket.emit('createSinglePlayer', {
            playerDetails: { ...user, equippedSkins: getEquippedSkins() },
            settings: spSettings
        });
        setShowSinglePlayer(false);
    };

    const handleJoinPublic = (roomId: string) => {
        socket.emit('joinRoom', { roomId, playerDetails: { ...user, equippedSkins: getEquippedSkins() } });
    };

    const handleJoinByCode = () => {
        if (joinCode.trim()) {
            setJoinCodeError('');
            socket.emit('joinByCode', { inviteCode: joinCode.trim().toUpperCase(), playerDetails: { ...user, equippedSkins: getEquippedSkins() } });
        }
    };

    const handleLogout = () => {
        if (socket) socket.disconnect();
        logout();
        navigate('/');
    };

    const filteredRooms = rooms.filter(r =>
        r.gameMode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isGuest = user?.isGuest || user?.is_guest;

    return (
        <div className="font-body text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col md:flex-row overflow-x-hidden bg-[#0a0e17]">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="hidden md:flex bg-[#1c1f29]/80 backdrop-blur-2xl flex-col h-screen w-64 p-4 gap-2 border-none shadow-2xl shrink-0 z-50 fixed left-0 top-0">
                <div className="mb-12 px-2 mt-4 cursor-pointer" onClick={() => window.location.reload()}>
                    <span className="text-amber-500 font-headline text-2xl font-bold tracking-tighter">Dominoes</span>
                </div>
                <nav className="flex-1 space-y-1">
                    <a className="flex items-center gap-3 px-4 py-3 text-amber-400 bg-amber-400/10 rounded-xl font-medium transition-all duration-200" href="#">
                        <span className="material-symbols-outlined">home</span>
                        <span>Lobby</span>
                    </a>
                    <a onClick={() => setShowSinglePlayer(true)} className="flex items-center gap-3 px-4 py-3 text-[#dfe2ef]/70 hover:text-amber-300 hover:bg-white/5 rounded-xl font-medium transition-all duration-200 translate-x-0 hover:translate-x-1 cursor-pointer">
                        <span className="material-symbols-outlined">smart_toy</span>
                        <span>Vs AI Bots</span>
                    </a>
                    <a onClick={() => navigate('/inventory')} className="flex items-center gap-3 px-4 py-3 text-[#dfe2ef]/70 hover:text-amber-300 hover:bg-white/5 rounded-xl font-medium transition-all duration-200 translate-x-0 hover:translate-x-1 cursor-pointer">
                        <span className="material-symbols-outlined">style</span>
                        <span>Inventory</span>
                    </a>
                    <a onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-error hover:bg-white/5 rounded-xl font-medium transition-all duration-200 translate-x-0 hover:translate-x-1 cursor-pointer mt-auto">
                        <span className="material-symbols-outlined">logout</span>
                        <span>Sign Out</span>
                    </a>
                </nav>
                <div className="mt-auto p-4 bg-surface-container-low rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-primary/20 text-primary font-bold">
                            {user?.nickname?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-on-surface font-bold text-sm truncate w-32">{user?.nickname}</p>
                            <p className="text-[#dfe2ef]/50 text-xs">{isGuest ? 'Guest Player' : `Level ${user?.rank_level || 1} Elite`}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowCreate(true)}
                        className="w-full py-2 bg-primary-container text-on-primary-container rounded-lg font-bold text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        Create Custom Room
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 min-h-screen relative pb-20 md:pb-0">
                {/* Top Navigation Bar */}
                <header className="bg-[#0f131c]/80 backdrop-blur-xl flex justify-between items-center w-full px-6 py-4 sticky top-0 z-40 border-none shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent font-headline tracking-tight md:hidden">Dominoes</span>
                        <div className="hidden md:flex items-center gap-2 bg-surface-container-lowest px-4 py-1.5 rounded-full border border-white/5">
                            <span className="material-symbols-outlined text-amber-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                            <span className="font-headline font-bold text-sm tracking-wide">{isGuest ? 'GUEST ACCESS' : 'ELITE STATUS'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-surface-container-highest/50 px-3 py-1.5 rounded-full border border-white/5">
                            <span className="material-symbols-outlined text-primary-fixed-dim text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                            <span className="font-headline font-bold text-on-surface">{user?.coins?.toLocaleString() || 0}</span>
                            <span className="text-[10px] text-primary/60 font-bold uppercase tracking-widest ml-1">Coins</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span onClick={() => setShowJoinCode(true)} className="material-symbols-outlined text-[#dfe2ef] hover:bg-white/5 transition-all duration-300 p-2 rounded-full cursor-pointer">vpn_key</span>
                            <div className="w-8 h-8 rounded-full bg-surface-container flex justify-center items-center font-bold text-primary border border-primary/30">
                                {user?.nickname?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="px-6 md:px-12 pt-12 pb-16 relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
                    <div className="relative z-10 max-w-5xl">
                        <h1 className="font-headline text-5xl md:text-7xl font-bold mb-6 tracking-tighter max-w-3xl leading-none">
                            Master the <span className="text-primary">Double-Six</span> Arena.
                        </h1>
                        <p className="font-body text-lg text-on-surface-variant mb-10 max-w-xl">
                            Experience the ultimate high-stakes dominoes platform. Join professional lobbies or create your own private table with custom house rules.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={() => setShowCreate(true)} className="px-8 py-4 bg-gradient-to-r from-primary-container to-primary text-on-primary rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,184,0,0.3)] hover:scale-105 active:scale-95 transition-all">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                                Create Custom Room
                            </button>
                            <button onClick={() => setShowJoinCode(true)} className="px-8 py-4 bg-surface-variant/40 backdrop-blur-md border border-outline-variant/30 text-on-surface rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-2 hover:bg-surface-variant/60 active:scale-95 transition-all">
                                <span className="material-symbols-outlined">vpn_key</span>
                                Join Private Room
                            </button>
                        </div>
                    </div>
                </section>

                {/* Main Content: Game Rooms Grid */}
                <section className="px-6 md:px-12 pb-24">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h2 className="font-headline text-2xl font-bold tracking-tight mb-2">Active Lobbies</h2>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                <span className="text-xs font-bold text-primary tracking-widest uppercase">{filteredRooms.length} Matches In-Progress</span>
                            </div>
                        </div>
                        <div className="hidden md:flex gap-2">
                            <button onClick={() => socket.emit('getRooms')} className="p-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
                                <span className="material-symbols-outlined">refresh</span>
                            </button>
                        </div>
                    </div>

                    {filteredRooms.length === 0 ? (
                        <div className="w-full bg-surface-container-low/50 border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                            <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">sports_esports</span>
                            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">No Active Lobbies</h3>
                            <p className="text-on-surface-variant text-sm mb-6 max-w-sm">There are currently no public tables available. Be the first to start a match!</p>
                            <button onClick={() => setShowCreate(true)} className="px-6 py-2 bg-surface-container-highest text-on-surface rounded-lg font-bold hover:bg-primary hover:text-on-primary transition-all">
                                Create a Table
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRooms.map(room => (
                                <div key={room.id} className={`group relative bg-surface-container/60 backdrop-blur-xl rounded-2xl overflow-hidden hover:bg-surface-container-high/80 transition-all duration-300 ${room.entryFee >= 5000 ? 'border border-primary/20' : ''}`}>
                                    {room.entryFee >= 5000 && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                                    )}
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-md px-2 py-1 rounded-full border border-white/5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${room.gameMode === 'Normal' ? 'bg-primary' : 'bg-tertiary-container'}`}></span>
                                            <span className="text-[10px] font-bold text-on-surface/70 uppercase">{room.gameMode}</span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className={`font-headline text-xl font-bold mb-1 ${room.entryFee >= 5000 ? 'text-primary' : 'text-on-surface'}`}>
                                            {room.teamMode === 'Free For All' ? 'FFA Classic' : 'Tactical 2v2'} #{room.id.substring(0, 4)}
                                        </h3>
                                        <p className="text-on-surface-variant text-sm mb-6 font-medium">
                                            {room.matchFormat === 'Score' ? `Target: ${room.targetScore} Pts` : room.matchFormat} • {room.turnTimer}s Turn
                                        </p>
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-surface-container-low p-3 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-on-surface/40 uppercase font-bold mb-1">Players</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                                                    <span className="font-headline font-bold">{room.playerCount}/4</span>
                                                </div>
                                            </div>
                                            <div className="bg-surface-container-low p-3 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-on-surface/40 uppercase font-bold mb-1">Entry Fee</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
                                                    <span className="font-headline font-bold tracking-tight">{room.entryFee?.toLocaleString() || 20}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            disabled={room.playerCount >= 4}
                                            onClick={() => {
                                                if (!room.isSinglePlayer && (user?.coins || 0) < (room.entryFee || 20)) {
                                                    Modal.error({ title: "Not Enough Coins", content: `You need at least ${room.entryFee || 20} coins to join this room.` });
                                                    return;
                                                }
                                                handleJoinPublic(room.id);
                                            }}
                                            className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                                                room.playerCount >= 4 
                                                    ? 'bg-surface-container-low text-on-surface/30 cursor-not-allowed border border-white/5' 
                                                    : room.entryFee >= 5000
                                                        ? 'bg-primary text-on-primary hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20'
                                                        : 'bg-surface-container-highest text-on-surface hover:bg-primary hover:text-on-primary border border-white/5 hover:border-transparent'
                                            }`}
                                        >
                                            {room.playerCount >= 4 ? 'Table Full' : 'Join Room'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f131c]/90 backdrop-blur-2xl border-t border-white/5 px-6 py-3 flex justify-between items-center z-50">
                <a className="flex flex-col items-center gap-1 text-primary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Lobby</span>
                </a>
                <a onClick={() => setShowSinglePlayer(true)} className="flex flex-col items-center gap-1 text-[#dfe2ef]/50">
                    <span className="material-symbols-outlined">smart_toy</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Vs AI</span>
                </a>
                <div className="relative -top-6">
                    <button onClick={() => setShowCreate(true)} className="bg-primary p-4 rounded-full shadow-[0_0_20px_rgba(255,184,0,0.4)]">
                        <span className="material-symbols-outlined text-on-primary">add</span>
                    </button>
                </div>
                <a onClick={() => navigate('/inventory')} className="flex flex-col items-center gap-1 text-[#dfe2ef]/50">
                    <span className="material-symbols-outlined">style</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Gear</span>
                </a>
                <a onClick={handleLogout} className="flex flex-col items-center gap-1 text-[#dfe2ef]/50">
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Exit</span>
                </a>
            </nav>

            {/* Modals & Overlays from previous iteration */}
            {/* NEW PARLOR INVITATION - CREATE ROOM MODAL */}
            {showCreate && (
                <div className="parlor-overlay animate-fade-in" onClick={(e) => { if(e.target === e.currentTarget) setShowCreate(false); }} style={{ zIndex: 9999 }}>
                    <div className="parlor-container !bg-[#1c1f29]">
                        <div className="parlor-header">
                            <span className="parlor-invitation-tag !text-amber-500 !border-amber-500/30 !bg-amber-500/10">Parlor Invitation</span>
                            <h2 className="parlor-title !text-white">Set Up New Table</h2>
                            <p className="parlor-subtitle">
                                Arrange the conditions of your match. High stakes require a focused environment. Choose your rules with the precision of a master.
                            </p>
                        </div>
                        
                        <div className="parlor-content">
                            {/* Left Column */}
                            <div className="parlor-section">
                                <div>
                                    <div className="parlor-label">Winning Condition</div>
                                    <div className="parlor-cards-row">
                                        <div 
                                            className={`parlor-rule-card ${settings.matchFormat === 'Score' ? 'active' : ''}`}
                                            onClick={() => setSettings({ ...settings, matchFormat: 'Score' })}
                                        >
                                            <div className="prc-icon"><TrophyOutlined /></div>
                                            <div className="prc-title">First to Reach</div>
                                            <div className="prc-desc">Victory by points threshold</div>
                                        </div>
                                        <div 
                                            className={`parlor-rule-card ${settings.matchFormat === 'Best of 1' ? 'active' : ''}`}
                                            onClick={() => setSettings({ ...settings, matchFormat: 'Best of 1' })}
                                        >
                                            <div className="prc-icon"><ClockCircleOutlined /></div>
                                            <div className="prc-title">Timed Blitz</div>
                                            <div className="prc-desc">Highest score at buzzer</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="parlor-label">Target Score</div>
                                    <div className="parlor-tuner">
                                        <button 
                                            className="tuner-btn" 
                                            onClick={() => setSettings({ ...settings, targetScore: Math.max(10, settings.targetScore - 10) })}
                                            disabled={settings.matchFormat !== 'Score' || settings.targetScore <= 10}
                                        >−</button>
                                        <div className="tuner-value">
                                            <span className="tuner-number">{settings.matchFormat === 'Score' ? settings.targetScore : '—'}</span>
                                            <span className="tuner-label">POINTS</span>
                                        </div>
                                        <button 
                                            className="tuner-btn" 
                                            onClick={() => setSettings({ ...settings, targetScore: settings.targetScore + 10 })}
                                            disabled={settings.matchFormat !== 'Score'}
                                        >+</button>
                                    </div>
                                </div>

                                <div>
                                    <div className="parlor-turn-timer-header">
                                        <div className="parlor-label" style={{marginBottom: 0}}>Turn Timer</div>
                                        <div className="parlor-timer-val">{settings.turnTimer} Seconds</div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" max="120" step="5"
                                        className="parlor-slider"
                                        value={settings.turnTimer}
                                        onChange={(e) => setSettings({ ...settings, turnTimer: parseInt(e.target.value) })}
                                    />
                                    <div className="slider-ticks">
                                        <span>10S</span>
                                        <span>120S</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="parlor-section" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div className="parlor-label">Table Visibility</div>
                                    <div className="visibility-options">
                                        <div 
                                            className={`vis-option ${settings.roomType === 'Public' ? 'active' : ''}`}
                                            onClick={() => setSettings({ ...settings, roomType: 'Public' })}
                                        >
                                            <div className="vis-left">
                                                <div className="radio-circle"><div className="radio-circle-inner"></div></div>
                                                <div className="vis-text">
                                                    <h4>Public Study</h4>
                                                    <p>Open to all Grandmasters</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div 
                                            className={`vis-option ${settings.roomType === 'Private' ? 'active' : ''}`}
                                            onClick={() => {
                                                setSettings(prev => ({ ...prev, roomType: 'Private', inviteCode: prev.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase() }));
                                            }}
                                        >
                                            <div className="vis-left">
                                                <div className="radio-circle"><div className="radio-circle-inner"></div></div>
                                                <div className="vis-text">
                                                    <h4>Private Parlor</h4>
                                                    <p>Invitation link only</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {settings.roomType === 'Private' && (
                                            <input 
                                                className="private-code-input !bg-[#0a0e17] !border-[#ffb800]/50 !text-[#ffb800]"
                                                placeholder="SECRET CODE"
                                                maxLength={12}
                                                value={settings.inviteCode}
                                                onChange={e => setSettings({ ...settings, inviteCode: e.target.value.toUpperCase() })}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="table-stakes-card !bg-surface-container-low">
                                        <div className="stakes-header !text-amber-400">
                                            <TrophyOutlined /> Table Stakes
                                        </div>
                                        <div className="stakes-row border-b border-white/5 pb-2">
                                            <span className="stakes-label">Entry Fee</span>
                                            <span className="stakes-val">
                                                <Select
                                                    variant="borderless"
                                                    className="parlor-select !text-amber-200"
                                                    value={settings.entryFee}
                                                    onChange={v => setSettings({ ...settings, entryFee: v })}
                                                    options={[
                                                        { value: 20, label: '20 GOLD' },
                                                        { value: 50, label: '50 GOLD' },
                                                        { value: 100, label: '100 GOLD' },
                                                        { value: 500, label: '500 GOLD' },
                                                        { value: 1000, label: '1,000 GOLD' },
                                                        { value: 2000, label: '2,000 GOLD' }
                                                    ]}
                                                    popupMatchSelectWidth={false}
                                                    dropdownStyle={{ background: '#1c1f29', border: '1px solid #31353f' }}
                                                />
                                            </span>
                                        </div>
                                        <div className="stakes-row pt-2">
                                            <span className="stakes-label">Winner's Pot</span>
                                            <span className="stakes-val" style={{ color: 'white' }}>{settings.entryFee * 3.8} <span>GOLD</span></span>
                                        </div>
                                    </div>

                                    <button className="parlor-submit-btn !bg-gradient-to-r !from-amber-600 !to-amber-400" onClick={handleCreateRoom}>
                                        Host Table <RightOutlined style={{ fontSize: '1.2rem', strokeWidth: 20 }} />
                                    </button>
                                    <button className="parlor-cancel-btn hover:!bg-white/5 hover:!text-white" onClick={() => setShowCreate(false)}>
                                        Discard Configuration
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="parlor-footer-quote">
                            "Every move is a sentence, every game a story."
                        </div>
                    </div>
                </div>
            )}

            {/* Join Code Modal - Tailwind Version appended onto Antd */}
            <Modal
                open={showJoinCode}
                onCancel={() => setShowJoinCode(false)}
                className="custom-dark-modal"
                title="Join Private Game"
                centered
                width={440}
                footer={[
                    <button key="cancel" className="px-6 py-2 rounded-lg text-on-surface hover:bg-white/5 mr-2" onClick={() => setShowJoinCode(false)}>Cancel</button>,
                    <button key="join" className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold disabled:opacity-50" onClick={handleJoinByCode} disabled={joinCode.trim().length < 4}>
                        Join Game
                    </button>
                ]}
            >
                <p className="text-on-surface-variant mb-4 font-body">
                    Enter the secret code shared by the host to join their private parlor.
                </p>
                <Input
                    size="large"
                    maxLength={10}
                    placeholder="ENTER CODE"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    autoFocus
                    style={{ textAlign: 'center', fontSize: '1.5rem', fontFamily: 'monospace', letterSpacing: '0.35em', fontWeight: 800, background: '#181b25', color: 'white', border: '1px solid #31353f' }}
                />
                {joinCodeError && <p className="text-error mt-3 font-semibold text-sm">{joinCodeError}</p>}
            </Modal>

            {/* Single Player Config Modal */}
            <Modal
                open={showSinglePlayer}
                onCancel={() => setShowSinglePlayer(false)}
                title="Training Simulator Config"
                className="custom-dark-modal"
                footer={[
                    <button key="cancel" className="px-6 py-2 rounded-lg text-on-surface hover:bg-white/5 mr-2" onClick={() => setShowSinglePlayer(false)}>Cancel</button>,
                    <button key="submit" className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold disabled:opacity-50" onClick={handleStartSinglePlayer}>Start Training</button>
                ]}
                centered
                width={400}
            >
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">AI Intelligence</label>
                        <Select value={spSettings.botDifficulty} onChange={v => setSpSettings({ ...spSettings, botDifficulty: v })} dropdownStyle={{ background: '#1c1f29', border: '1px solid #31353f' }} style={{width:'100%'}} 
                            options={[{ value: 'easy', label: 'Beginner' }, { value: 'normal', label: 'Skilled' }, { value: 'hard', label: 'Grandmaster' }]} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Opponents</label>
                        <Select value={spSettings.botCount} onChange={v => setSpSettings({ ...spSettings, botCount: v })} dropdownStyle={{ background: '#1c1f29', border: '1px solid #31353f' }} style={{width:'100%'}} 
                            options={[{ value: 1, label: '1 Player (1v1)' }, { value: 3, label: '3 Players (1v3)' }]} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Rule Variation</label>
                        <Select value={spSettings.gameMode} onChange={v => setSpSettings({ ...spSettings, gameMode: v })} dropdownStyle={{ background: '#1c1f29', border: '1px solid #31353f' }} style={{width:'100%'}} options={[{ value: 'Normal', label: 'Normal' }, { value: 'All Fives', label: 'All Fives' }, { value: 'Blocking Mode', label: 'Blocking Mode' }]} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Turn Timer: {spSettings.turnTimer}s</label>
                        <Slider min={10} max={60} step={5} value={spSettings.turnTimer} onChange={v => setSpSettings({ ...spSettings, turnTimer: v })} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
