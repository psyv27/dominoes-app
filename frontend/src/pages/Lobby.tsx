import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import DashboardLayout from '../components/DashboardLayout';
import './Lobby.css';

export default function Lobby() {
    const { user, updateUser } = useAuth() as any;
    const { socket, isConnected } = useSocket() as any;
    const navigate = useNavigate();

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
        entryFee: 1000
    });

    const [spSettings, setSpSettings] = useState({
        botDifficulty: 'normal',
        botCount: 1,
        gameMode: 'Normal',
        matchFormat: 'Score',
        targetScore: 100,
        turnTimer: 10
    });

    const ENTRY_FEE_OPTIONS = [20, 50, 100, 500, 1000, 5000, 15000, 50000];

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

    const getRoomVisuals = (room: any) => {
        const fee = room.entryFee || 1000;
        const mode = room.gameMode || 'Normal';
        
        let type = 'CASUAL';
        let typeColor = 'bg-secondary-container text-on-secondary-container';
        let name = 'Gilded Arena';
        let image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD61WiTSMjpPekPjyFCzLsDirEtzDHliaYUAxHRhKRuii-EqIApviGHektzRJqRce--aKxUEYq0Fm3h9uiYcEK9Pm3ODq3zYQ_EfVh5Ui4_Q9n2MzDd1QIDZeAYaniWKlMhhuFH8q_I7xExEm7Jbyovytd-z82lglwnxAPL-EBxM6SnRE7LGxvMGnvp2Mz4MYxBzK55DIJWZmDdOLrL6u_ib7f1OMHqQpCulxN-qflP9jbphIc47c5ZhYCIrfH34g4Vr_0jCnz-8Xw';
        
        if (fee >= 50000) {
            type = 'HIGH STAKES';
            typeColor = 'bg-primary-container text-on-primary';
            name = 'Neon Nights';
            image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSbrfNLuwzCvA0E9ViyS4H097OJXIl8TxSpeaLF3iIP_Xj24E2-xJVrKs5wUa6AAD9qg5j0md9CftXoVbRF-lxpn2Lo1D8Ae-wAohCWDvxDuk5TCBR7DDrho3Im3rg5cCEphMb20eKMIbPzaWIg39NiMEKsQNTk546KU3_D3ncgOP1LzvMxJTqMLcECKgyIyy210fV1Ltu3xxjo-1BRVRBXgyMQzpv19GqbfUzCx9hDuyikAgKD97j9t57nX06DlU8x41ECzfS2fY';
        } else if (fee >= 15000) {
            type = mode === 'All Fives' ? 'TURBO MODE' : 'ELITE TABLE';
            typeColor = mode === 'All Fives' ? 'bg-[#17d8ff] text-on-tertiary' : 'bg-primary-container text-on-primary';
            name = 'Diamond Club';
            image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyOpj9k2POutfnxbWxh9fIEr63q42vFCZuejbKJMP3CltBq19Dqx4dM4IBUv13J9GNHwnWqsC0gcIxCjTlAVdUFPbZtNF2cEgoF8gwuUItn2R3vTiIYf_kQpgtaqd50MYtZD5CpFUj-o9Gh1zQgE8ncGTYUHSdi2EfFKDsA45RIzOVndfbYJJMr88M-kzk8ZIm_vp0KZNNy3eqFZ565KLDwe-venD0CIL49l0lOP3OGHzfXPXzFxjfJ7XYKhwc-1oufrI0C7XTJgc';
        } else if (fee >= 5000) {
            type = 'PRO TABLE';
            typeColor = 'bg-primary-container text-on-primary';
            name = 'Royal Terrace';
            image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPeWClc3YS66pXPc7FwAGjyvABo7UjGyhyIA_nYTDKjneN5HNvIF5VW5vnQOxyxrdEEUlCvsfFmHf8AbI0t1YKtrgLfElXiZskPnwqhopYRJBCf5NfJjBZIDWrck6sy7wZOVUkZy_u2KmXJ5UtGYgN0QpuYVOkAdpnXYcaWApTEnvLd7ftmKhT6HCfuSiVyaERZ-hNqsb7ySpV0Bopn-T_R9DIPo-cyhcUFCu-LZyKKJqhz9pjBoGJtAh5SVDVFUcMRr-WwXK6Zrw';
        }

        if (mode === 'All Fives' && fee < 15000) {
            type = 'TURBO MODE';
            typeColor = 'bg-[#17d8ff] text-on-tertiary';
        }

        return { type, typeColor, name, image };
    };

    return (
        <DashboardLayout activePage="Lobby">
            {/* Hero Title (Editorial) */}
            <div className="mb-12 relative">
                <h2 className="text-6xl md:text-8xl font-headline font-black text-on-surface opacity-5 absolute -top-8 left-4 select-none pointer-events-none">LOBBY</h2>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8">
                    <div>
                        <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Active Tables</h2>
                        <p className="text-on-surface-variant max-w-md mt-2">Browse the orbital gaming floors. Find your table, place your stakes, and dominate the tiles.</p>
                    </div>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center glass-panel p-2 rounded-2xl ring-1 ring-outline-variant/10">
                        <div className="flex flex-col px-4 border-r border-outline-variant/20">
                            <span className="text-[10px] font-black text-primary-container uppercase tracking-widest mb-1">Stake</span>
                            <select className="bg-transparent text-sm font-bold text-on-surface border-none p-0 focus:ring-0 cursor-pointer">
                                <option className="bg-surface">Low to High</option>
                                <option className="bg-surface">High to Low</option>
                            </select>
                        </div>
                        <div className="flex flex-col px-4 border-r border-outline-variant/20">
                            <span className="text-[10px] font-black text-primary-container uppercase tracking-widest mb-1">Players</span>
                            <select className="bg-transparent text-sm font-bold text-on-surface border-none p-0 focus:ring-0 cursor-pointer">
                                <option className="bg-surface">Any Players</option>
                                <option className="bg-surface">2 Players</option>
                                <option className="bg-surface">4 Players</option>
                            </select>
                        </div>
                        <div className="flex flex-col px-4 border-r border-outline-variant/20">
                            <span className="text-[10px] font-black text-primary-container uppercase tracking-widest mb-1">Mode</span>
                            <select className="bg-transparent text-sm font-bold text-on-surface border-none p-0 focus:ring-0 cursor-pointer">
                                <option className="bg-surface">Classic</option>
                                <option className="bg-surface">Turbo</option>
                            </select>
                        </div>
                        <button onClick={() => socket?.emit('getRooms')} className="bg-surface-container-highest p-3 rounded-xl hover:bg-primary-container hover:text-on-primary transition-all group flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm block group-hover:rotate-180 transition-transform">refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {rooms.filter(r => r.roomType === 'Public').map(room => {
                    const visuals = getRoomVisuals(room);
                    const isFull = room.playerCount >= (room.maxPlayers || 4);
                    
                    return (
                        <div key={room.id} className="group relative overflow-hidden rounded-[2rem] bg-surface-container-high transition-all duration-500 hover:bg-surface-container-highest hover:-translate-y-2">
                            <div className="h-40 relative">
                                <img alt={visuals.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={visuals.image} />
                                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-surface-container-high/40 to-transparent"></div>
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {Array.from({ length: room.playerCount || 1 }).map((_, i) => (
                                            <img key={i} alt="Player" className="w-6 h-6 rounded-full border-2 border-surface bg-surface" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.id}_${i}`} />
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-on-surface/60">{room.playerCount}/{room.maxPlayers || 4} Players</span>
                                </div>
                                <div className="absolute bottom-4 left-6">
                                    <span className={`inline-block ${visuals.typeColor} text-[10px] font-black px-2 py-1 rounded tracking-widest uppercase mb-1`}>
                                        {visuals.type}
                                    </span>
                                    <h3 className="text-2xl font-headline font-bold text-on-surface">{visuals.name}</h3>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Entry Stake</p>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
                                        <span className="text-xl font-headline font-black text-primary tracking-tight">{(room.entryFee || 1000).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !isFull && handleJoinPublic(room.id)}
                                    disabled={isFull}
                                    className={`px-8 py-3 rounded-xl font-headline font-black tracking-tighter transition-all scale-95 hover:scale-100 active:scale-95 ${
                                        isFull 
                                            ? 'bg-surface-container-lowest text-on-surface/30 cursor-not-allowed' 
                                            : 'bg-gradient-to-r from-primary-container to-primary text-on-primary hover:shadow-lg hover:shadow-primary-container/20'
                                    }`}
                                >
                                    {isFull ? 'FULL' : 'JOIN'}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Custom Bento Action Card */}
                <div onClick={() => setShowCreate(true)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-container to-primary p-1 cursor-pointer group hover:-translate-y-2 transition-all duration-500">
                    <div className="h-full w-full bg-surface-container-high rounded-[1.9rem] flex flex-col items-center justify-center text-center p-8 border border-white/5 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:bg-primary-container/20">
                            <span className="material-symbols-outlined text-4xl text-primary-container">add_circle</span>
                        </div>
                        <h3 className="text-2xl font-headline font-bold text-on-surface mb-2">Create Private Table</h3>
                        <p className="text-on-surface-variant text-sm mb-8">Play with friends by creating your own orbital room with custom rules.</p>
                        <button className="text-primary-container font-headline font-black tracking-widest text-sm group-hover:underline transition-all">START SESSION</button>
                    </div>
                </div>
            </div>

            {/* Empty State / Join via Code */}
            {rooms.length === 0 && (
                <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-8 text-center bg-surface-container-low/50 backdrop-blur-md rounded-[2rem] p-12 border border-outline-variant/10">
                    <div className="max-w-sm">
                        <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">vpn_key_alert</span>
                        <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Have an Invite Code?</h3>
                        <p className="text-on-surface-variant text-sm mb-6">Join a private orbital table created by a friend.</p>
                        <button onClick={() => setShowJoinCode(true)} className="px-6 py-3 border border-outline-variant/30 rounded-xl font-bold hover:bg-surface-container-high transition-all w-full">Enter Code</button>
                    </div>
                </div>
            )}

            {/* FAB for Mobile */}
            <button onClick={() => navigate('/store')} className="md:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-primary-container to-primary text-on-primary shadow-2xl flex items-center justify-center z-50 hover:scale-105 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-3xl">storefront</span>
            </button>

            {/* ===== CREATE ROOM MODAL ===== */}
            {showCreate && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
                    <div className="bg-surface-container w-full max-w-2xl rounded-2xl p-6 md:p-8 border border-outline-variant/15 shadow-2xl relative overflow-hidden mx-4 max-h-[85vh] overflow-y-auto">
                        <div className="mb-6 text-left">
                            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">Create Room</h1>
                            <div className="h-1 w-16 bg-primary-container rounded-full"></div>
                        </div>
                        
                        {/* Play Mode: Multiplayer vs Single Player */}
                        <div className="flex bg-surface-container-low rounded-xl p-1 mb-6 border border-outline-variant/10">
                            {[
                                { id: 'multiplayer', label: 'Multiplayer', icon: 'public' },
                                { id: 'singleplayer', label: 'Play against Bots', icon: 'smart_toy' }
                            ].map(mode => (
                                <button 
                                    key={mode.id}
                                    onClick={() => {
                                        if (mode.id === 'singleplayer') setShowSinglePlayer(true);
                                        else setShowSinglePlayer(false);
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                                        (!showSinglePlayer && mode.id === 'multiplayer') || (showSinglePlayer && mode.id === 'singleplayer')
                                        ? 'bg-surface-container-highest text-on-surface shadow-sm border border-outline-variant/20' 
                                        : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{mode.icon}</span>
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-6">
                            {/* Game Mode */}
                            <section>
                                <h3 className="font-headline text-xs font-bold text-primary flex items-center gap-1 mb-2 tracking-wide uppercase">
                                    <span className="material-symbols-outlined text-[14px]">rocket_launch</span> Game Mode
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { v: 'Normal', l: 'Classic', i: 'style' }, 
                                        { v: 'Block', l: 'Block', i: 'block' },
                                        { v: 'All Fives', l: 'All Fives', i: 'bolt' }
                                    ].map(m => (
                                        <button key={m.v} onClick={() => {
                                            if (showSinglePlayer) setSpSettings({ ...spSettings, gameMode: m.v });
                                            else setSettings({ ...settings, gameMode: m.v });
                                        }}
                                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl font-bold border transition-all ${((showSinglePlayer ? spSettings.gameMode : settings.gameMode) === m.v) ? 'bg-primary-container/10 text-primary-container border-primary-container/50 shadow-[0_0_10px_rgba(255,184,0,0.1)]' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20 hover:border-primary/40'}`}>
                                            <span className="material-symbols-outlined text-[18px] mb-1">{m.i}</span>
                                            <span className="text-xs text-center leading-tight">{m.l}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Entry Stake (Only for Multiplayer) */}
                            {!showSinglePlayer && (
                                <section>
                                    <div className="flex justify-between items-end mb-1">
                                        <h3 className="font-headline text-xs font-bold text-primary flex items-center gap-1 tracking-wide uppercase">
                                            <span className="material-symbols-outlined text-[14px]">payments</span> Entry Stake
                                        </h3>
                                        <span className="text-sm font-bold font-headline text-on-surface">{settings.entryFee.toLocaleString()} <span className="text-primary text-[9px]">COINS</span></span>
                                    </div>
                                    <div className="relative w-full py-1 group h-6 flex items-center">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max={ENTRY_FEE_OPTIONS.length - 1} 
                                            step="1"
                                            value={ENTRY_FEE_OPTIONS.indexOf(settings.entryFee)}
                                            onChange={(e) => setSettings({ ...settings, entryFee: ENTRY_FEE_OPTIONS[parseInt(e.target.value)] })}
                                            className="w-full absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-full h-1.5 bg-surface-container-lowest rounded-full border border-outline-variant/10 absolute"></div>
                                        <div 
                                            className="h-1.5 bg-gradient-to-r from-primary-container to-primary rounded-full absolute" 
                                            style={{ width: `${(ENTRY_FEE_OPTIONS.indexOf(settings.entryFee) / (ENTRY_FEE_OPTIONS.length - 1)) * 100}%` }}
                                        ></div>
                                        <div 
                                            className="w-5 h-5 bg-primary-container rounded-full ring-2 ring-primary/20 shadow-lg absolute -ml-2.5 transition-transform group-active:scale-110 pointer-events-none"
                                            style={{ left: `${(ENTRY_FEE_OPTIONS.indexOf(settings.entryFee) / (ENTRY_FEE_OPTIONS.length - 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-[10px] font-bold text-on-surface-variant font-headline">
                                        <span>{ENTRY_FEE_OPTIONS[0].toLocaleString()}</span>
                                        <span>{ENTRY_FEE_OPTIONS[ENTRY_FEE_OPTIONS.length - 1].toLocaleString()}</span>
                                    </div>
                                </section>
                            )}

                            {/* Bot Difficulty (Only for Single Player) */}
                            {showSinglePlayer && (
                                <section>
                                    <h3 className="font-headline text-sm font-bold text-primary flex items-center gap-2 mb-3 tracking-wide uppercase">
                                        <span className="material-symbols-outlined text-[16px]">psychology</span> Bot Difficulty
                                    </h3>
                                    <div className="flex gap-3">
                                        {[{ v: 'easy', l: 'Rookie' }, { v: 'normal', l: 'Pro' }, { v: 'hard', l: 'Master' }].map(d => (
                                            <button key={d.v} onClick={() => setSpSettings({ ...spSettings, botDifficulty: d.v })}
                                                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${spSettings.botDifficulty === d.v ? 'bg-surface-container-lowest border border-primary text-primary' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}>
                                                {d.l}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Players & Privacy */}
                            {!showSinglePlayer && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <section>
                                        <h3 className="font-headline text-sm font-bold text-primary flex items-center gap-2 mb-3 tracking-wide uppercase">
                                            <span className="material-symbols-outlined text-[16px]">groups</span> Max Players
                                        </h3>
                                        <div className="flex gap-3">
                                            {[{ v: 'Free For All', l: '2 Players' }, { v: '2v2', l: '4 Players' }].map(p => (
                                                <button key={p.v} onClick={() => setSettings({ ...settings, teamMode: p.v })}
                                                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${settings.teamMode === p.v ? 'bg-surface-container-lowest border border-primary text-primary' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}>
                                                    {p.l}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="font-headline text-sm font-bold text-primary flex items-center gap-2 mb-3 tracking-wide uppercase">
                                            <span className="material-symbols-outlined text-[16px]">visibility</span> Privacy
                                        </h3>
                                        <div className="flex items-center justify-between p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/10 cursor-pointer"
                                            onClick={() => setSettings(prev => prev.roomType === 'Public' ? { ...prev, roomType: 'Private', inviteCode: prev.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase() } : { ...prev, roomType: 'Public' })}>
                                            <span className="text-sm font-medium pl-2">{settings.roomType === 'Public' ? 'Public Room' : 'Private Room'}</span>
                                            <div className={`w-12 h-6 rounded-full relative p-1 transition-colors ${settings.roomType === 'Private' ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
                                                <div className={`w-4 h-4 bg-on-surface-variant rounded-full shadow-sm transition-transform ${settings.roomType === 'Private' ? 'translate-x-6' : ''}`}></div>
                                            </div>
                                        </div>
                                        {settings.roomType === 'Private' && (
                                            <input className="mt-2 w-full bg-surface-container-lowest border border-primary/50 text-primary rounded-xl px-4 py-2 text-center font-mono text-sm tracking-widest font-bold uppercase placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="SECRET CODE" maxLength={12} value={settings.inviteCode} onChange={e => setSettings({ ...settings, inviteCode: e.target.value.toUpperCase() })} />
                                        )}
                                    </section>
                                </div>
                            )}

                            {showSinglePlayer && (
                                <section>
                                    <h3 className="font-headline text-sm font-bold text-primary flex items-center gap-2 mb-3 tracking-wide uppercase">
                                        <span className="material-symbols-outlined text-[16px]">groups</span> Opponents Count
                                    </h3>
                                    <div className="flex gap-3">
                                        {[1, 3].map(count => (
                                            <button key={count} onClick={() => setSpSettings({ ...spSettings, botCount: count })}
                                                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${spSettings.botCount === count ? 'bg-surface-container-lowest border border-primary text-primary' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}>
                                                {count === 1 ? '1 Bot (2 Players)' : '3 Bots (4 Players)'}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Actions */}
                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                <button onClick={showSinglePlayer ? handleStartSinglePlayer : handleCreateRoom} className="flex-[2] py-4 bg-gradient-to-r from-primary-container to-primary text-on-primary font-black text-sm tracking-widest rounded-xl shadow-[0_5px_15px_rgba(255,184,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase">
                                    {showSinglePlayer ? 'Start Training Mode' : 'Create Room'}
                                </button>
                                <button onClick={() => setShowCreate(false)} className="flex-1 py-4 border border-outline-variant/30 text-on-surface-variant font-bold rounded-xl text-sm hover:bg-surface-container-high transition-all">Cancel</button>
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
        </DashboardLayout>
    );
}
