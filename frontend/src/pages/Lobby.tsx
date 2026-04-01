import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Lobby.css';

export default function Lobby() {
    const { user, logout, updateUser } = useAuth() as any;
    const { socket, isConnected } = useSocket() as any;
    const navigate = useNavigate();
    const location = useLocation();

    const [rooms, setRooms] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showSinglePlayer, setShowSinglePlayer] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [showJoinCode, setShowJoinCode] = useState(false);
    const [joinCodeError, setJoinCodeError] = useState('');

    const isGuest = user?.isGuest || user?.is_guest;

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

    const ENTRY_FEE_OPTIONS = [20, 50, 100, 500, 1000, 2000, 5000];

    const navItems = [
        { name: 'Home', icon: 'home', path: '/lobby' },
        { name: 'Lobby', icon: 'grid_view', path: '/lobby' },
        { name: 'Tournaments', icon: 'emoji_events', path: '#' },
        { name: 'Settings', icon: 'settings', path: '#' },
    ];

    // Daily reward
    useEffect(() => {
        if (user && !isGuest) {
            const token = localStorage.getItem('token');
            if (token) {
                fetch('http://localhost:5001/auth/rewards/daily', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.json())
                .then(data => { if (data.success) updateUser({ coins: data.coins }); })
                .catch(() => {});
            }
        }
    }, []);

    // Socket
    useEffect(() => {
        if (!socket) return;
        if (!isConnected) socket.connect();
        socket.emit('getRooms');
        socket.on('roomsUpdated', (r: any) => setRooms(r));
        socket.on('roomJoined', (room: any) => navigate(`/room/${room.id}`, { state: { room } }));
        socket.on('error', (err: string) => alert(err));
        socket.on('joinCodeError', (err: string) => setJoinCodeError(err));
        return () => { socket.off('roomsUpdated'); socket.off('roomJoined'); socket.off('error'); socket.off('joinCodeError'); };
    }, [socket, isConnected, navigate]);

    const getEquippedSkins = () => {
        try { const s = localStorage.getItem('equipped'); return s ? JSON.parse(s) : { domino: 'classic', table: 'dark' }; }
        catch { return { domino: 'classic', table: 'dark' }; }
    };

    const handleCreateRoom = () => {
        if (settings.roomType === 'Private' && settings.inviteCode.trim().length < 4) {
            alert("Private Room Code must be at least 4 characters."); return;
        }
        socket.emit('createRoom', { playerDetails: { ...user, equippedSkins: getEquippedSkins() }, settings });
        setShowCreate(false);
    };

    const handleStartSinglePlayer = () => {
        socket.emit('createSinglePlayer', { playerDetails: { ...user, equippedSkins: getEquippedSkins() }, settings: spSettings });
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

    const getRoomLabel = (room: any) => {
        if (room.entryFee >= 5000) return { text: 'Elite', icon: 'diamond' };
        if (room.gameMode === 'All Fives') return { text: 'Blitz', icon: 'bolt' };
        if (room.entryFee >= 1000) return { text: 'Pro', icon: null };
        return null;
    };

    const getRoomName = (room: any) => {
        const names = ['The Royal Suite', 'Oceanic Lounge', 'Lightning Table', 'Diamond Club', 'High Roller Pit', 'Beginner Bay'];
        const hash = room.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
        return names[hash % names.length];
    };

    const getRoomDesc = (room: any) => {
        if (room.gameMode === 'All Fives') return `All Fives • ${room.turnTimer || 10}s Turns`;
        if (room.entryFee >= 5000) return 'Elite Only • Manual Draw';
        if (room.entryFee >= 1000) return 'Tournament Standard • No Spinner';
        return `Casual Play • ${room.targetScore || 100} Points`;
    };

    return (
        <div className="font-body text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col md:flex-row overflow-x-hidden">
            {/* ===== SIDEBAR ===== */}
            <aside className="hidden md:flex bg-[#1c1f29]/80 backdrop-blur-2xl flex-col h-screen w-64 p-4 gap-2 shadow-2xl shrink-0 z-50 fixed left-0 top-0">
                <div className="mb-12 px-2">
                    <span className="text-amber-500 font-headline text-2xl font-bold tracking-tighter cursor-pointer" onClick={() => navigate('/')}>Dominoes</span>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item, i) => {
                        const isActive = i === 0; // Home is active on lobby page
                        return (
                            <a
                                key={item.name}
                                onClick={(e) => { e.preventDefault(); if (item.path !== '#') navigate(item.path); }}
                                href={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                                    isActive
                                        ? 'text-amber-400 bg-amber-400/10'
                                        : 'text-[#dfe2ef]/70 hover:text-amber-300 hover:bg-white/5 translate-x-0 hover:translate-x-1'
                                }`}
                            >
                                <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
                                <span>{item.name}</span>
                            </a>
                        );
                    })}
                </nav>

                {/* Bottom Profile */}
                <div className="mt-auto p-4 bg-surface-container-low rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <img
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                            alt="avatar"
                            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.nickname}`}
                        />
                        <div>
                            <p className="text-on-surface font-bold text-sm">{user?.nickname || 'Player'}</p>
                            <p className="text-[#dfe2ef]/50 text-xs">{isGuest ? 'Guest' : `Level ${user?.rank_level || 1} Elite`}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="w-full py-2 bg-primary-container text-on-primary-container rounded-lg font-bold text-xs hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Create Custom Room
                    </button>
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 md:ml-64 min-h-screen relative pb-20 md:pb-0">
                {/* Top Navigation */}
                <header className="bg-[#0f131c]/60 backdrop-blur-xl flex justify-between items-center w-full px-6 py-4 sticky top-0 z-40 bg-[#1c1f29]/30 shadow-[0_0_40px_rgba(10,14,23,0.15)]">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent font-headline tracking-tight md:hidden">Dominoes</span>
                        <div className="hidden md:flex items-center gap-2 bg-surface-container-lowest px-4 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-amber-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                            <span className="font-headline font-bold text-sm tracking-wide">{isGuest ? 'GUEST ACCESS' : 'ELITE STATUS'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-surface-container-highest/50 px-3 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-primary-fixed-dim text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                            <span className="font-headline font-bold text-on-surface">{user?.coins?.toLocaleString() || '0'}</span>
                            <span className="text-[10px] text-primary/60 font-bold uppercase tracking-widest ml-1">Coins</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#dfe2ef] hover:bg-white/5 transition-all duration-300 p-2 rounded-full cursor-pointer">workspace_premium</span>
                            <img
                                alt="User avatar"
                                className="w-8 h-8 rounded-full border border-primary/30 object-cover cursor-pointer"
                                onClick={() => navigate('/profile')}
                                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.nickname}`}
                            />
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
                            <button
                                onClick={() => setShowCreate(true)}
                                className="px-8 py-4 bg-gradient-to-r from-primary-container to-primary text-on-primary rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,184,0,0.3)] hover:scale-105 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                                Create Custom Room
                            </button>
                            <button
                                onClick={() => setShowJoinCode(true)}
                                className="px-8 py-4 bg-surface-variant/40 backdrop-blur-md border border-outline-variant/30 text-on-surface rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-2 hover:bg-surface-variant/60 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined">vpn_key</span>
                                Join Private Room
                            </button>
                        </div>
                    </div>
                </section>

                {/* Active Lobbies */}
                <section className="px-6 md:px-12 pb-24">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h2 className="font-headline text-2xl font-bold tracking-tight mb-2">Active Lobbies</h2>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                <span className="text-xs font-bold text-primary tracking-widest uppercase">{rooms.length > 0 ? `${rooms.reduce((a, r) => a + (r.playerCount || 0), 0)} Players Online` : 'Waiting for players'}</span>
                            </div>
                        </div>
                        <div className="hidden md:flex gap-2">
                            <button onClick={() => socket?.emit('getRooms')} className="p-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
                                <span className="material-symbols-outlined">filter_list</span>
                            </button>
                            <button onClick={() => socket?.emit('getRooms')} className="p-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
                                <span className="material-symbols-outlined">refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Room Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => {
                            const label = getRoomLabel(room);
                            const isFull = room.playerCount >= (room.maxPlayers || 4);
                            const isHighRoller = room.entryFee >= 5000;
                            return (
                                <div
                                    key={room.id}
                                    className={`group relative bg-surface-container/60 backdrop-blur-xl rounded-2xl overflow-hidden hover:bg-surface-container-high/80 transition-all duration-300 ${isHighRoller ? 'border border-primary/10' : ''}`}
                                >
                                    {/* Left accent bar for high rollers */}
                                    {isHighRoller && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}

                                    {/* Badge */}
                                    {label && (
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                                                label.icon === 'bolt'
                                                    ? 'bg-primary-container'
                                                    : 'bg-background/50 backdrop-blur-md'
                                            }`}>
                                                {label.icon && (
                                                    <span className={`material-symbols-outlined text-[12px] ${label.icon === 'bolt' ? 'text-on-primary' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {label.icon}
                                                    </span>
                                                )}
                                                {!label.icon && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                                                <span className={`text-[10px] font-bold uppercase ${label.icon === 'bolt' ? 'text-on-primary' : 'text-on-surface/70'}`}>{label.text}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6">
                                        <h3 className={`font-headline text-xl font-bold mb-1 ${isHighRoller ? 'text-primary' : 'text-on-surface'}`}>
                                            {getRoomName(room)}
                                        </h3>
                                        <p className="text-on-surface-variant text-sm mb-6 font-medium">{getRoomDesc(room)}</p>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-surface-container-low p-3 rounded-xl">
                                                <p className="text-[10px] text-on-surface/40 uppercase font-bold mb-1">Players</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                                                    <span className="font-headline font-bold">{room.playerCount}/{room.maxPlayers || 4}</span>
                                                </div>
                                            </div>
                                            <div className="bg-surface-container-low p-3 rounded-xl">
                                                <p className="text-[10px] text-on-surface/40 uppercase font-bold mb-1">Entry Fee</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
                                                    <span className="font-headline font-bold tracking-tight">{(room.entryFee || 20).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Join Button */}
                                        {isFull ? (
                                            <button disabled className="w-full py-3 bg-surface-container-low text-on-surface/30 rounded-xl font-bold cursor-not-allowed">
                                                Table Full
                                            </button>
                                        ) : isHighRoller ? (
                                            <button
                                                onClick={() => handleJoinPublic(room.id)}
                                                className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                Join Room
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleJoinPublic(room.id)}
                                                className="w-full py-3 bg-surface-container-highest text-on-surface rounded-xl font-bold hover:bg-primary hover:text-on-primary transition-all duration-300"
                                            >
                                                Join Room
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Single Player / Training Card */}
                        <div className="group relative bg-surface-container/60 backdrop-blur-xl rounded-2xl overflow-hidden hover:bg-surface-container-high/80 transition-all duration-300 border border-dashed border-outline-variant/20">
                            <div className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
                                <span className="material-symbols-outlined text-4xl text-primary/40 mb-4">smart_toy</span>
                                <h3 className="font-headline text-xl font-bold mb-1 text-on-surface">Training Mode</h3>
                                <p className="text-on-surface-variant text-sm mb-6 font-medium">Practice against AI opponents</p>
                                <button
                                    onClick={() => setShowSinglePlayer(true)}
                                    className="w-full py-3 bg-surface-container-highest text-on-surface rounded-xl font-bold hover:bg-primary hover:text-on-primary transition-all duration-300"
                                >
                                    Start Training
                                </button>
                            </div>
                        </div>
                    </div>

                    {rooms.length === 0 && (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-5xl text-on-surface/10 mb-4 block">sports_esports</span>
                            <h3 className="font-headline text-xl font-bold text-on-surface/50 mb-2">No Active Lobbies</h3>
                            <p className="text-on-surface-variant text-sm mb-6">Be the first to create a table and start playing!</p>
                            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-primary-container text-on-primary rounded-xl font-bold hover:scale-105 active:scale-95 transition-all">
                                Create a Table
                            </button>
                        </div>
                    )}
                </section>
            </main>

            {/* ===== MOBILE BOTTOM NAV ===== */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f131c]/90 backdrop-blur-2xl border-t border-white/5 px-6 py-3 flex justify-between items-center z-50">
                <a onClick={() => navigate('/lobby')} className="flex flex-col items-center gap-1 text-primary cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
                </a>
                <a onClick={() => navigate('/store')} className="flex flex-col items-center gap-1 text-[#dfe2ef]/50 cursor-pointer">
                    <span className="material-symbols-outlined">shopping_bag</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Store</span>
                </a>
                <div className="relative -top-6">
                    <button onClick={() => setShowCreate(true)} className="bg-primary p-4 rounded-full shadow-[0_0_20px_rgba(255,184,0,0.4)]">
                        <span className="material-symbols-outlined text-on-primary">add</span>
                    </button>
                </div>
                <a onClick={() => navigate('/friends')} className="flex flex-col items-center gap-1 text-[#dfe2ef]/50 cursor-pointer">
                    <span className="material-symbols-outlined">group</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Social</span>
                </a>
                <a className="flex flex-col items-center gap-1 text-[#dfe2ef]/50 cursor-pointer">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">More</span>
                </a>
            </nav>

            {/* ===== CREATE ROOM MODAL ===== */}
            {showCreate && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
                    <div className="bg-surface-container w-full max-w-2xl rounded-3xl p-8 md:p-12 border border-outline-variant/15 shadow-2xl relative overflow-hidden mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="mb-10 text-left">
                            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-2">Otaq Yarat</h1>
                            <div className="h-1 w-20 bg-primary-container rounded-full"></div>
                        </div>
                        <div className="space-y-10">
                            {/* Game Mode */}
                            <section>
                                <h3 className="font-headline text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">rocket_launch</span> Game Mode
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[{ v: 'Normal', l: 'Classic', i: 'style' }, { v: 'All Fives', l: 'Turbo', i: 'bolt' }].map(m => (
                                        <button key={m.v} onClick={() => setSettings({ ...settings, gameMode: m.v })}
                                            className={`flex items-center justify-center gap-4 p-5 rounded-2xl font-bold border transition-all ${settings.gameMode === m.v ? 'bg-primary-container text-on-primary border-primary/50 shadow-[0_0_20px_rgba(255,184,0,0.15)]' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20 hover:border-primary/40'}`}>
                                            <span className="material-symbols-outlined">{m.i}</span>
                                            <span className="text-lg">{m.l}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Entry Stake */}
                            <section>
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="font-headline text-lg font-bold text-primary flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">payments</span> Entry Stake
                                    </h3>
                                    <span className="text-2xl font-bold font-headline text-on-surface">{settings.entryFee.toLocaleString()} <span className="text-primary text-sm">COINS</span></span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {ENTRY_FEE_OPTIONS.map(fee => (
                                        <button key={fee} onClick={() => setSettings({ ...settings, entryFee: fee })}
                                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${settings.entryFee === fee ? 'bg-primary-container text-on-primary shadow-lg shadow-primary-container/20' : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant hover:border-primary/50'}`}>
                                            {fee.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Players & Privacy */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <section>
                                    <h3 className="font-headline text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">groups</span> Max Players
                                    </h3>
                                    <div className="flex gap-4">
                                        {[{ v: 'Free For All', l: '2 Players' }, { v: '2v2', l: '4 Players' }].map(p => (
                                            <button key={p.v} onClick={() => setSettings({ ...settings, teamMode: p.v })}
                                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${settings.teamMode === p.v ? 'bg-surface-container-lowest border border-primary text-primary' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}>
                                                {p.l}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h3 className="font-headline text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">visibility</span> Privacy
                                    </h3>
                                    <div className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10 cursor-pointer"
                                        onClick={() => setSettings(prev => prev.roomType === 'Public' ? { ...prev, roomType: 'Private', inviteCode: prev.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase() } : { ...prev, roomType: 'Public' })}>
                                        <span className="text-sm font-medium pl-2">{settings.roomType === 'Public' ? 'Public Room' : 'Private Room'}</span>
                                        <div className={`w-14 h-7 rounded-full relative p-1 transition-colors ${settings.roomType === 'Private' ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
                                            <div className={`w-5 h-5 bg-on-surface-variant rounded-full shadow-sm transition-transform ${settings.roomType === 'Private' ? 'translate-x-7' : ''}`}></div>
                                        </div>
                                    </div>
                                    {settings.roomType === 'Private' && (
                                        <input className="mt-3 w-full bg-surface-container-lowest border border-primary/50 text-primary rounded-xl px-4 py-3 text-center font-mono text-lg tracking-widest font-bold uppercase placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="SECRET CODE" maxLength={12} value={settings.inviteCode} onChange={e => setSettings({ ...settings, inviteCode: e.target.value.toUpperCase() })} />
                                    )}
                                </section>
                            </div>

                            {/* Target Score & Timer */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <section>
                                    <h3 className="font-headline text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">emoji_events</span> Target Score
                                    </h3>
                                    <div className="flex items-center gap-4 justify-center">
                                        <button className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-bold hover:bg-surface-container-highest transition-all" onClick={() => setSettings({ ...settings, targetScore: Math.max(10, settings.targetScore - 10) })}>−</button>
                                        <div className="text-center">
                                            <span className="text-3xl font-headline font-black text-on-surface">{settings.targetScore}</span>
                                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Points</p>
                                        </div>
                                        <button className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-bold hover:bg-surface-container-highest transition-all" onClick={() => setSettings({ ...settings, targetScore: settings.targetScore + 10 })}>+</button>
                                    </div>
                                </section>
                                <section>
                                    <h3 className="font-headline text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">timer</span> Turn Timer: {settings.turnTimer}s
                                    </h3>
                                    <input type="range" min="10" max="120" step="5" className="w-full accent-primary-container" value={settings.turnTimer} onChange={e => setSettings({ ...settings, turnTimer: parseInt(e.target.value) })} />
                                    <div className="flex justify-between mt-1 text-xs font-bold text-on-surface-variant"><span>10s</span><span>120s</span></div>
                                </section>
                            </div>

                            {/* Actions */}
                            <div className="pt-6 flex flex-col sm:flex-row gap-4">
                                <button onClick={handleCreateRoom} className="flex-[2] py-5 bg-gradient-to-r from-primary-container to-primary text-on-primary font-black text-lg tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(255,184,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase">Create Room</button>
                                <button onClick={() => setShowCreate(false)} className="flex-1 py-5 border border-outline-variant/30 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-high transition-all">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== JOIN CODE MODAL ===== */}
            {showJoinCode && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowJoinCode(false); }}>
                    <div className="bg-surface-container w-full max-w-md rounded-3xl p-8 border border-outline-variant/15 shadow-2xl mx-4">
                        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Join Private Game</h2>
                        <p className="text-on-surface-variant mb-6">Enter the secret code shared by the host.</p>
                        <input className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-4 text-center font-mono text-2xl tracking-[0.35em] font-extrabold text-primary placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/30 focus:outline-none uppercase" placeholder="ENTER CODE" maxLength={10} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} autoFocus />
                        {joinCodeError && <p className="text-error mt-3 font-semibold text-sm">{joinCodeError}</p>}
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowJoinCode(false)} className="flex-1 py-3 border border-outline-variant/30 text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-high transition-all">Cancel</button>
                            <button onClick={handleJoinByCode} disabled={joinCode.trim().length < 4} className="flex-1 py-3 bg-primary-container text-on-primary font-bold rounded-xl disabled:opacity-50 hover:opacity-90 transition-all">Join Game</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SINGLE PLAYER MODAL ===== */}
            {showSinglePlayer && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowSinglePlayer(false); }}>
                    <div className="bg-surface-container w-full max-w-md rounded-3xl p-8 border border-outline-variant/15 shadow-2xl mx-4">
                        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Training Simulator</h2>
                        <p className="text-on-surface-variant mb-6 text-sm">Configure your AI opponent parameters.</p>
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">AI Intelligence</label>
                                <div className="flex gap-3">
                                    {[{ v: 'easy', l: 'Beginner' }, { v: 'normal', l: 'Skilled' }, { v: 'hard', l: 'Grandmaster' }].map(d => (
                                        <button key={d.v} onClick={() => setSpSettings({ ...spSettings, botDifficulty: d.v })}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${spSettings.botDifficulty === d.v ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant hover:border-primary/50'}`}>{d.l}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Opponents</label>
                                <div className="flex gap-3">
                                    {[{ v: 1, l: '1v1' }, { v: 3, l: '1v3' }].map(d => (
                                        <button key={d.v} onClick={() => setSpSettings({ ...spSettings, botCount: d.v })}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${spSettings.botCount === d.v ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant hover:border-primary/50'}`}>{d.l}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Turn Timer: {spSettings.turnTimer}s</label>
                                <input type="range" min="10" max="60" step="5" className="w-full accent-primary-container" value={spSettings.turnTimer} onChange={v => setSpSettings({ ...spSettings, turnTimer: parseInt(v.target.value) })} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowSinglePlayer(false)} className="flex-1 py-3 border border-outline-variant/30 text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-high transition-all">Cancel</button>
                            <button onClick={handleStartSinglePlayer} className="flex-1 py-3 bg-gradient-to-r from-primary-container to-primary text-on-primary font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all">Start Training</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
