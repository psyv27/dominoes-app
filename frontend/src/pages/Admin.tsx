import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

export default function Admin() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // users, words, messages, stickers
    const [users, setUsers] = useState<any[]>([]);
    const [bannedWords, setBannedWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState('');
    const [predefinedMessages, setPredefinedMessages] = useState<string[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [stickers, setStickers] = useState<any[]>([]);
    const [newStickerName, setNewStickerName] = useState('');
    const [newStickerFile, setNewStickerFile] = useState<string | null>(null);
    const [newStickerHidden, setNewStickerHidden] = useState(false);
    const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
    const [editAllowedUsers, setEditAllowedUsers] = useState('');
    
    const API_URL = 'http://localhost:5001/admin';

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        try {
            if (activeTab === 'users') {
                const res = await fetch(`${API_URL}/users`);
                const data = await res.json();
                setUsers(data);
            } else if (activeTab === 'words') {
                const res = await fetch(`${API_URL}/banned-words`);
                const data = await res.json();
                setBannedWords(data);
            } else if (activeTab === 'messages') {
                const res = await fetch(`${API_URL}/predefined-messages`);
                const data = await res.json();
                setPredefinedMessages(data);
            } else if (activeTab === 'stickers') {
                const res = await fetch(`${API_URL}/stickers`);
                const data = await res.json();
                setStickers(data);
            }
        } catch (err) {
            console.error('Failed to load admin data', err);
        }
    };

    const deleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to completely delete this user and all their data?')) return;
        try {
            await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const adjustCoins = async (id: string) => {
        const amountStr = prompt('Enter coins amount to add (use negative value to subtract):', '0');
        if (!amountStr) return;
        const amount = Number(amountStr);
        if (isNaN(amount) || amount === 0) return;
        
        try {
            await fetch(`${API_URL}/users/${id}/coins`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
            loadData();
        } catch (err) {
            console.error('Failed to adjust coins:', err);
        }
    };

    const addWord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWord.trim()) return;
        try {
            await fetch(`${API_URL}/banned-words`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: newWord.trim() })
            });
            setNewWord('');
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const removeWord = async (word: string) => {
        try {
            await fetch(`${API_URL}/banned-words/${encodeURIComponent(word)}`, { method: 'DELETE' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const addMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await fetch(`${API_URL}/predefined-messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg: newMessage.trim() })
            });
            setNewMessage('');
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const removeMessage = async (msg: string) => {
        try {
            await fetch(`${API_URL}/predefined-messages/${encodeURIComponent(msg)}`, { method: 'DELETE' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewStickerFile(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const addSticker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStickerName.trim() || !newStickerFile) return;
        try {
            await fetch(`${API_URL}/stickers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newStickerName.trim(), 
                    url: newStickerFile,
                    isHidden: newStickerHidden,
                    allowedUsers: [] 
                })
            });
            setNewStickerName('');
            setNewStickerFile(null);
            setNewStickerHidden(false);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteSticker = async (id: string) => {
        try {
            await fetch(`${API_URL}/stickers/${id}`, { method: 'DELETE' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const saveStickerPermissions = async (id: string, isHidden: boolean) => {
        try {
            const usersArray = editAllowedUsers.split(',').map(u => u.trim()).filter(Boolean);
            await fetch(`${API_URL}/stickers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isHidden, allowedUsers: usersArray })
            });
            setEditingStickerId(null);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="admin-global min-h-screen selection:bg-admin-primary/30 antialiased overflow-hidden">
            {/* TopNavBar */}
            <header className="bg-[#0c1324] flex justify-between items-center w-full px-6 py-4 fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 shadow-2xl shadow-indigo-950/20">
                <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-[#dce1fb] flex items-center gap-2 font-headline tracking-tight">
                        <span className="material-symbols-outlined text-admin-primary" style={{fontVariationSettings: "'FILL' 1"}}>shield_person</span>
                        Admin Dashboard
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all duration-200 ease-in-out">
                        <span className="material-symbols-outlined">shield_alert</span>
                        <span className="text-sm font-medium font-body hidden md:inline">Security Logs</span>
                    </button>
                    <button onClick={() => navigate('/')} className="bg-admin-primary/10 text-admin-primary px-6 py-2 rounded-xl font-bold font-body text-sm hover:bg-admin-primary/20 active:scale-95 transition-all">
                        Exit Admin
                    </button>
                </div>
            </header>

            <div className="flex h-screen pt-16">
                {/* SideNavBar */}
                <aside className="fixed left-0 top-0 h-full flex flex-col gap-2 p-4 pt-24 border-r border-slate-800/50 bg-[#0c1324] w-64 z-40">
                    <div className="px-4 mb-6">
                        <h2 className="text-lg font-semibold font-headline text-[#dce1fb] tracking-tight">Admin Dashboard</h2>
                        <p className="text-sm font-medium font-body text-slate-400">Secret control panel for Emin</p>
                    </div>
                    
                    <nav className="flex flex-col gap-2">
                        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-all duration-200 cursor-pointer active:scale-95 ${activeTab === 'users' ? 'bg-slate-800/60 text-[#c0c1ff] border-l-2 border-[#c0c1ff]' : 'text-slate-400 hover:bg-slate-800/30'}`}>
                            <span className="material-symbols-outlined" style={activeTab === 'users' ? {fontVariationSettings: "'FILL' 1"} : {}}>group</span>
                            <span className="text-sm font-medium font-body">Manage Users</span>
                        </button>
                        
                        <button onClick={() => setActiveTab('words')} className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-all duration-200 cursor-pointer active:scale-95 ${activeTab === 'words' ? 'bg-slate-800/60 text-[#c0c1ff] border-l-2 border-[#c0c1ff]' : 'text-slate-400 hover:bg-slate-800/30'}`}>
                            <span className="material-symbols-outlined" style={activeTab === 'words' ? {fontVariationSettings: "'FILL' 1"} : {}}>message</span>
                            <span className="text-sm font-medium font-body">Chat Filter</span>
                        </button>
                        
                        <button onClick={() => setActiveTab('messages')} className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-all duration-200 cursor-pointer active:scale-95 ${activeTab === 'messages' ? 'bg-slate-800/60 text-[#c0c1ff] border-l-2 border-[#c0c1ff]' : 'text-slate-400 hover:bg-slate-800/30'}`}>
                            <span className="material-symbols-outlined" style={activeTab === 'messages' ? {fontVariationSettings: "'FILL' 1"} : {}}>videogame_asset</span>
                            <span className="text-sm font-medium font-body">In-Game Chat</span>
                        </button>
                        
                        <button onClick={() => setActiveTab('stickers')} className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-all duration-200 cursor-pointer active:scale-95 ${activeTab === 'stickers' ? 'bg-slate-800/60 text-[#c0c1ff] border-l-2 border-[#c0c1ff]' : 'text-slate-400 hover:bg-slate-800/30'}`}>
                            <span className="material-symbols-outlined" style={activeTab === 'stickers' ? {fontVariationSettings: "'FILL' 1"} : {}}>mood</span>
                            <span className="text-sm font-medium font-body">Custom Stickers</span>
                        </button>
                    </nav>
                    
                    <div className="mt-auto p-4 hidden lg:block glass-panel rounded-2xl border border-admin-outline-variant/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-admin-primary-container/20 flex items-center justify-center border border-admin-primary/20">
                                <span className="material-symbols-outlined text-admin-primary">admin_panel_settings</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold font-headline text-admin-on-surface">Emin Admin</p>
                                <p className="text-[10px] text-admin-on-surface-variant font-label">Root Privileges</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Canvas */}
                <main className="ml-64 flex-1 overflow-y-auto p-8 bg-admin-surface-container-low">
                    
                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="max-w-7xl mx-auto space-y-8 pb-12">
                            <div className="flex items-end justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-4xl font-bold font-headline tracking-tight text-admin-on-surface">Registered Users</h2>
                                    <p className="text-admin-on-surface-variant font-body text-sm">Reviewing {users.length} players across all servers</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-admin-outline text-lg">search</span>
                                        <input type="text" placeholder="Search user..." className="bg-admin-surface-container-high border-none ring-1 ring-admin-outline-variant/20 rounded-xl pl-10 pr-4 py-2 text-sm font-body focus:ring-admin-primary focus:ring-2 transition-all w-64 placeholder:text-admin-outline text-admin-on-surface" />
                                    </div>
                                    <button className="bg-admin-primary text-admin-on-primary px-6 py-2 rounded-xl font-headline font-bold text-sm shadow-lg shadow-admin-primary/10 hover:opacity-90 active:scale-95 transition-all">
                                        Add User
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-admin-outline-variant/5 hover:border-admin-primary/20 transition-colors">
                                    <p className="text-xs font-bold font-label uppercase tracking-widest text-admin-outline mb-2">Total Activity</p>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-3xl font-bold font-headline">842 <span className="text-sm font-medium text-emerald-400">+12%</span></h3>
                                        <span className="material-symbols-outlined text-admin-primary opacity-50 text-4xl">insights</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-admin-outline-variant/5 hover:border-admin-secondary/20 transition-colors">
                                    <p className="text-xs font-bold font-label uppercase tracking-widest text-admin-outline mb-2">Economy Circulation</p>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-3xl font-bold font-headline text-admin-secondary">4.2M</h3>
                                        <span className="material-symbols-outlined text-admin-secondary opacity-50 text-4xl">payments</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-admin-outline-variant/5 hover:border-admin-tertiary/20 transition-colors">
                                    <p className="text-xs font-bold font-label uppercase tracking-widest text-admin-outline mb-2">Banned Users</p>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-3xl font-bold font-headline text-admin-tertiary">14</h3>
                                        <span className="material-symbols-outlined text-admin-tertiary opacity-50 text-4xl">block</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-admin-surface-container-highest/30 rounded-2xl overflow-hidden border border-admin-outline-variant/10">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-admin-surface-container-high/50 border-b border-admin-outline-variant/10">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold font-label uppercase text-admin-outline tracking-wider">ID</th>
                                            <th className="px-6 py-4 text-xs font-bold font-label uppercase text-admin-outline tracking-wider">User Profile</th>
                                            <th className="px-6 py-4 text-xs font-bold font-label uppercase text-admin-outline tracking-wider">Rank</th>
                                            <th className="px-6 py-4 text-xs font-bold font-label uppercase text-admin-outline tracking-wider">Coins</th>
                                            <th className="px-6 py-4 text-xs font-bold font-label uppercase text-admin-outline tracking-wider">Performance (P/W/L/D)</th>
                                            <th className="px-6 py-4 text-xs font-bold font-label uppercase text-admin-outline tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-admin-outline-variant/5">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-admin-surface-container-highest/40 transition-colors group">
                                                <td className="px-6 py-5 font-label text-sm text-admin-outline" title={u.id}>
                                                    #{u.id.substring(0, 4)}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-admin-outline-variant/20 flex items-center justify-center font-bold text-admin-primary">
                                                            {u.nickname.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold font-headline text-admin-on-surface">{u.nickname}</p>
                                                            <p className="text-xs font-body text-admin-outline-variant">{u.username}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold font-label bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
                                                        LEVEL {u.rank_level || 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-1 text-admin-secondary font-bold font-headline">
                                                        <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>monetization_on</span>
                                                        {u.coins || 0}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 font-label text-xs text-admin-on-surface-variant">
                                                    <span className="text-admin-on-surface">{u.games_played || 0}</span> / <span className="text-emerald-400">{u.games_won || 0}</span> / <span className="text-admin-error">{u.games_lost || 0}</span> / <span className="text-admin-outline">{u.games_drawn || 0}</span>
                                                </td>
                                                <td className="px-6 py-5 text-right space-x-2">
                                                    <button onClick={() => adjustCoins(u.id)} className="p-2 rounded-lg text-admin-secondary hover:bg-admin-secondary/10 transition-colors active:scale-90" title="Adjust Coins">
                                                        <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>paid</span>
                                                    </button>
                                                    <button onClick={() => deleteUser(u.id)} className="p-2 rounded-lg text-admin-error hover:bg-admin-error/10 transition-colors active:scale-90" title="Delete User">
                                                        <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-admin-outline">No users found in database.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                
                                <div className="bg-admin-surface-container-high/30 px-6 py-4 flex items-center justify-between border-t border-admin-outline-variant/5">
                                    <p className="text-xs font-body text-admin-outline">Showing {users.length} of {users.length} users</p>
                                    <div className="flex gap-2">
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-admin-outline-variant/10 text-admin-outline hover:bg-admin-surface-container-highest transition-colors">
                                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                                        </button>
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-admin-primary text-admin-on-primary text-xs font-bold">1</button>
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-admin-outline-variant/10 text-admin-outline hover:bg-admin-surface-container-highest transition-colors text-xs font-bold">2</button>
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-admin-outline-variant/10 text-admin-outline hover:bg-admin-surface-container-highest transition-colors">
                                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WORDS TAB */}
                    {activeTab === 'words' && (
                        <div className="max-w-6xl mx-auto pb-12">
                            <header className="mb-12">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-admin-primary/10 text-admin-primary-fixed-dim px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase font-label">Security Module</span>
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-bold font-headline tracking-tighter text-admin-on-surface mb-3">Banned Words Filter</h1>
                                <p className="text-lg text-admin-on-surface-variant font-body max-w-2xl leading-relaxed">
                                    Any word in this list will be replaced with ****** in game chat. Protect your community by maintaining a clean environment.
                                </p>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <section className="lg:col-span-1">
                                    <div className="bg-admin-surface-container-low p-8 rounded-3xl border border-admin-outline-variant/15 shadow-xl h-full flex flex-col justify-between">
                                        <form onSubmit={addWord}>
                                            <div className="flex items-center gap-2 mb-6">
                                                <span className="material-symbols-outlined text-admin-secondary">add_moderator</span>
                                                <h3 className="text-lg font-bold font-headline tracking-tight">Add New Rule</h3>
                                            </div>
                                            <div className="space-y-6">
                                                <div className="relative group">
                                                    <label className="block text-xs font-bold font-label text-slate-500 uppercase tracking-widest mb-2 px-1">Restricted Term</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Enter a vulgar word..." 
                                                        className="w-full bg-admin-surface-container-high border-none rounded-2xl px-5 py-4 text-admin-on-surface placeholder:text-slate-600 focus:ring-2 focus:ring-admin-primary/40 transition-all font-body"
                                                        value={newWord}
                                                        onChange={(e) => setNewWord(e.target.value)}
                                                    />
                                                </div>
                                                <div className="relative group">
                                                    <label className="block text-xs font-bold font-label text-slate-500 uppercase tracking-widest mb-2 px-1">Match Type</label>
                                                    <select className="w-full bg-admin-surface-container-high border-none rounded-2xl px-5 py-4 text-admin-on-surface focus:ring-2 focus:ring-admin-primary/40 transition-all font-body appearance-none">
                                                        <option>Exact Match</option>
                                                        <option>Partial/Regex</option>
                                                        <option>Fuzzy Match</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button type="submit" className="mt-8 w-full bg-admin-primary hover:bg-admin-primary-container text-admin-on-primary font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 group">
                                                <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
                                                Add Word
                                            </button>
                                        </form>
                                    </div>
                                </section>

                                <section className="lg:col-span-2">
                                    <div className="bg-admin-surface-container-lowest p-8 rounded-3xl border border-admin-outline-variant/15 shadow-inner min-h-[500px]">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-admin-primary">list_alt</span>
                                                <h3 className="text-lg font-bold font-headline tracking-tight">Active Filter List</h3>
                                                <span className="bg-admin-surface-container-highest px-3 py-1 rounded-full text-xs font-bold font-label text-admin-on-surface-variant">{bannedWords.length} Active</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-2 rounded-lg bg-admin-surface-container-high text-slate-400 hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-sm">search</span>
                                                </button>
                                                <button className="p-2 rounded-lg bg-admin-surface-container-high text-slate-400 hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-sm">filter_list</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {bannedWords.map((word, idx) => (
                                                <div key={idx} className="group flex items-center gap-2 bg-admin-surface-container-high hover:bg-admin-surface-container-highest border border-admin-outline-variant/10 px-4 py-2.5 rounded-full transition-all cursor-default">
                                                    <span className="text-sm font-medium font-body text-admin-on-surface">{word}</span>
                                                    <button onClick={() => removeWord(word)} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-admin-error/10 hover:bg-admin-error/20 text-admin-error rounded-full p-1">
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            {bannedWords.length === 0 && (
                                                <div className="mt-12 flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800/50 rounded-3xl opacity-40 w-full">
                                                    <span className="material-symbols-outlined text-4xl mb-3">add_circle</span>
                                                    <p className="text-sm font-body">Words added via the sidebar will appear here.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* MESSAGES TAB */}
                    {activeTab === 'messages' && (
                        <div className="max-w-6xl mx-auto pb-12">
                            <header className="mb-12">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-admin-primary/10 text-admin-primary-fixed-dim px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase font-label">Interaction Rules</span>
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-bold font-headline tracking-tighter text-admin-on-surface mb-3">In-Game Quick Messages</h1>
                                <p className="text-lg text-admin-on-surface-variant font-body max-w-2xl leading-relaxed">
                                    Manage the preset communication strings available to players for rapid strategic coordination and social interaction.
                                </p>
                            </header>

                            <div className="bg-admin-surface-container-low p-8 rounded-3xl border border-admin-outline-variant/15 shadow-xl mb-8">
                                <form onSubmit={addMessage}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold font-headline tracking-tight">Define New Macro</h3>
                                            <p className="text-xs text-admin-on-surface-variant font-body mt-1">Limit macros to 40 characters for optimal HUD display.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="relative flex-1">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">sort</span>
                                            <input 
                                                type="text" 
                                                placeholder="Enter message text (e.g. 'Rush Site B!')" 
                                                className="w-full bg-admin-surface-container-high border-none rounded-xl px-12 py-4 text-admin-on-surface placeholder:text-slate-600 focus:ring-2 focus:ring-admin-primary/40 transition-all font-body"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                            />
                                        </div>
                                        <button type="submit" className="bg-admin-primary-fixed-dim hover:opacity-90 text-admin-on-primary-fixed px-8 rounded-xl font-bold font-body transition-all active:scale-95 flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">add</span>
                                            Add Message
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="bg-admin-surface-container-lowest p-8 rounded-3xl border border-admin-outline-variant/10 shadow-inner min-h-[300px]">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-bold font-headline tracking-tight flex items-center gap-3">
                                        <span className="material-symbols-outlined text-admin-secondary">grid_view</span>
                                        Current Macro Pool
                                    </h3>
                                    <span className="bg-admin-surface-container-highest px-3 py-1 rounded-full text-xs font-bold font-label text-admin-on-surface-variant uppercase tracking-widest">{predefinedMessages.length} Active Macros</span>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {predefinedMessages.map((msg, idx) => (
                                        <div key={idx} className="group flex items-center justify-between bg-admin-surface border border-admin-outline-variant/20 px-5 py-3 rounded-full hover:bg-admin-surface-container-high transition-all cursor-default">
                                            <span className="text-sm font-medium font-body text-admin-on-surface truncate">{msg}</span>
                                            <button onClick={() => removeMessage(msg)} className="opacity-0 group-hover:opacity-100 text-admin-error transition-opacity flex items-center justify-center">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    {predefinedMessages.length === 0 && (
                                        <div className="col-span-full py-12 text-center border-2 border-dashed border-admin-outline-variant/10 rounded-2xl">
                                            <p className="text-admin-outline font-body">No macros configured yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STICKERS TAB */}
                    {activeTab === 'stickers' && (
                        <div className="max-w-6xl mx-auto space-y-12 pb-12">
                            <section className="space-y-2">
                                <h1 className="text-4xl font-bold font-headline tracking-tighter text-admin-on-surface">Custom Game Stickers</h1>
                                <p className="text-admin-on-surface-variant font-body max-w-2xl">Manage the library of unique emoticons and stickers available to players. Control visibility, user permissions, and upload new assets to the game world.</p>
                            </section>

                            <section className="bg-admin-surface-container-highest/40 backdrop-blur-md rounded-2xl p-8 border border-admin-outline-variant/15 shadow-xl">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-admin-primary/10 rounded-xl">
                                        <span className="material-symbols-outlined text-admin-primary">upload_file</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold font-headline">New Sticker Upload</h3>
                                        <p className="text-xs text-admin-on-surface-variant font-label">Maximum file size: 2MB. Supports PNG, WEBP.</p>
                                    </div>
                                </div>
                                <form onSubmit={addSticker} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-admin-on-surface-variant uppercase tracking-wider font-label">Sticker Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Neon Dragon" 
                                            value={newStickerName}
                                            onChange={(e) => setNewStickerName(e.target.value)}
                                            className="w-full bg-admin-surface-container-high border-none rounded-xl px-4 py-3 text-admin-on-surface placeholder:text-admin-outline focus:ring-1 focus:ring-admin-primary transition-all font-body" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-admin-on-surface-variant uppercase tracking-wider font-label">File Asset</label>
                                        <div className="relative">
                                            <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            <label htmlFor="file-upload" className="flex items-center justify-between w-full bg-admin-surface-container-high cursor-pointer rounded-xl px-4 py-3 text-admin-outline text-sm hover:bg-admin-surface-container-highest transition-all border border-dashed border-admin-outline-variant/30">
                                                <span className="truncate max-w-[120px]">{newStickerFile ? 'Sticker loaded' : 'Select file...'}</span>
                                                <span className="material-symbols-outlined text-sm">attach_file</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 py-3 h-[52px]">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={newStickerHidden} onChange={e => setNewStickerHidden(e.target.checked)} />
                                            <div className="w-11 h-6 bg-admin-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-primary"></div>
                                            <span className="ml-3 text-sm font-medium text-admin-on-surface-variant font-body">Hidden from Shop</span>
                                        </label>
                                    </div>
                                    <button type="submit" disabled={!newStickerName || !newStickerFile} className={`h-[52px] w-full rounded-xl font-bold font-label flex items-center justify-center gap-2 transition-all ${!newStickerName || !newStickerFile ? 'bg-admin-primary/20 text-admin-on-primary-fixed/50 cursor-not-allowed opacity-50' : 'bg-admin-primary text-admin-on-primary hover:opacity-90 active:scale-95'}`}>
                                        <span className="material-symbols-outlined">cloud_upload</span>
                                        Upload Sticker
                                    </button>
                                </form>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-xl font-semibold font-headline">Sticker Library</h3>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 bg-admin-surface-container-highest rounded-full text-xs font-medium text-admin-outline-variant border border-admin-outline-variant/10">Total: {stickers.length}</span>
                                    </div>
                                </div>
                                <div className="bg-admin-surface-container-low rounded-2xl overflow-hidden shadow-lg border border-admin-outline-variant/5">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-admin-surface-container-high/40 text-admin-on-surface-variant/60 border-b border-admin-outline-variant/10">
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest font-label">Asset</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest font-label">Name</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest font-label">Status</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest font-label">Allowed User IDs</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest font-label text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-admin-outline-variant/5">
                                            {stickers.map(stk => (
                                                <tr key={stk.id} className="group hover:bg-admin-surface-container-highest transition-all duration-200">
                                                    <td className="px-6 py-4">
                                                        <div className="w-10 h-10 rounded-lg bg-admin-surface-container-high flex items-center justify-center overflow-hidden border border-admin-outline-variant/20">
                                                            <img className="w-8 h-8 object-contain" src={stk.url} alt={stk.name} />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold text-admin-on-surface font-body">{stk.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {stk.isHidden ? (
                                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-admin-secondary/10 text-admin-secondary border border-admin-secondary/20">Hidden</span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-admin-primary/10 text-admin-primary border border-admin-primary/20">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingStickerId === stk.id ? (
                                                            <input 
                                                                type="text" 
                                                                value={editAllowedUsers} 
                                                                onChange={e => setEditAllowedUsers(e.target.value)}
                                                                className="bg-admin-surface-container-high border border-admin-primary/40 rounded-lg px-3 py-2 text-sm text-admin-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary w-full max-w-xs"
                                                                placeholder="e.g. 1042, 9002..."
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-mono text-admin-outline font-label">
                                                                {stk.allowedUsers && stk.allowedUsers.length > 0 ? `UID: ${stk.allowedUsers.join(', ')}` : (stk.isHidden ? 'Admin Only' : 'All Players')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-4">
                                                            {editingStickerId === stk.id ? (
                                                                <>
                                                                    <button onClick={() => saveStickerPermissions(stk.id, stk.isHidden)} className="text-admin-emerald-400 font-bold text-xs font-label hover:underline text-emerald-400">Save</button>
                                                                    <button onClick={() => setEditingStickerId(null)} className="text-admin-error font-bold text-xs font-label hover:underline text-admin-error">Cancel</button>
                                                                </>
                                                            ) : (
                                                                <button onClick={() => { setEditingStickerId(stk.id); setEditAllowedUsers(stk.allowedUsers.join(', ')); }} className="text-admin-primary font-bold text-xs font-label hover:underline">Edit Perms</button>
                                                            )}
                                                            <button onClick={() => deleteSticker(stk.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-admin-tertiary hover:bg-admin-tertiary/10 transition-colors">
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {stickers.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-admin-outline">No custom stickers uploaded.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
