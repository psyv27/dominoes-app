import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import DashboardLayout from '../components/DashboardLayout';

export default function Friends() {
    const { user } = useAuth() as any;
    const { socket } = useSocket() as any;
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('all');
    const [friends, setFriends] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [blocked, setBlocked] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchError, setSearchError] = useState('');

    const token = localStorage.getItem('token');
    const API_URL = 'http://localhost:5001/auth';

    const loadSocialData = async () => {
        try {
            const res = await fetch(`${API_URL}/social`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setFriends(data.friends || []);
                setPendingRequests(data.pendingRequests || []);
                setSentRequests(data.sentRequests || []);
                setBlocked(data.blocked || []);
            }
        } catch (err) { console.error('Error loading social data', err); }
    };

    useEffect(() => {
        if (!user) return navigate('/') as any;
        loadSocialData();
    }, [user, navigate]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchError('');
        if (!searchQuery.trim()) return;
        try {
            const res = await fetch(`${API_URL}/search?username=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data.length === 0) setSearchError('User not found');
            setSearchResults(data);
        } catch { setSearchError('Search failed'); }
    };

    const sendRequest = async (toId: string) => {
        try {
            const res = await fetch(`${API_URL}/friend-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ toId })
            });
            if (res.ok) { alert('Friend request sent!'); loadSocialData(); }
            else { const { error } = await res.json(); alert(error || 'Failed'); }
        } catch { alert('Error'); }
    };

    const acceptRequest = async (id: string) => {
        await fetch(`${API_URL}/friend-request/${id}/accept`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        loadSocialData();
    };

    const rejectRequest = async (id: string) => {
        await fetch(`${API_URL}/friend-request/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadSocialData();
    };

    const removeFriend = async (id: string) => {
        if (!confirm('Remove this friend?')) return;
        await fetch(`${API_URL}/friends/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadSocialData();
    };

    const blockUser = async (blockedId: string) => {
        if (!confirm('Block this user?')) return;
        try {
            await fetch(`${API_URL}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ blockedId })
            });
            loadSocialData();
            setSearchResults([]);
        } catch (err) { console.error(err); }
    };

    const unblockUser = async (id: string) => {
        await fetch(`${API_URL}/block/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadSocialData();
    };

    const inviteToGame = (friendId: string) => {
        const roomId = prompt("Enter your Room Code to invite them to:");
        if (roomId && socket) {
            socket.emit('inviteToGame', { toId: friendId, roomId });
            alert("Invite sent!");
        }
    };

    const onlineFriends = friends.filter(f => f.isOnline);
    const offlineFriends = friends.filter(f => !f.isOnline);
    const displayedFriends = activeTab === 'online' ? onlineFriends : activeTab === 'offline' ? offlineFriends : friends;

    return (
        <DashboardLayout activePage="Social">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <header className="mb-12 relative">
                    <h1 className="text-6xl font-headline font-extrabold tracking-tighter text-on-surface mb-2 opacity-90">Social Orbit</h1>
                    <p className="text-on-surface-variant/60 text-lg max-w-xl font-light">Your inner circle in the domino galaxy. Connect, compete, and conquer with your allies.</p>
                    <div className="absolute -top-12 -right-12 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
                </header>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-12 gap-8 items-start">

                    {/* Right Column: Requests + Blacklist */}
                    <section className="col-span-12 lg:col-span-4 order-1 lg:order-2 space-y-8">
                        {/* Friend Requests */}
                        <div className="glass-panel p-6 rounded-2xl border border-outline-variant/10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
                                    <span className="material-symbols-outlined">person_add</span>
                                    Friend Requests
                                </h3>
                                <span className="bg-primary/20 text-primary-fixed-dim text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingRequests.length} PENDING</span>
                            </div>
                            <div className="space-y-4">
                                {pendingRequests.map(r => (
                                    <div key={r.id} className="bg-surface-container-low/40 p-4 rounded-xl flex items-center gap-4 border border-outline-variant/5">
                                        <div className="w-12 h-12 rounded-full bg-surface-container-highest border-2 border-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                                            {(r.fromNickname || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-on-surface">{r.fromNickname}</p>
                                            <p className="text-xs text-on-surface-variant/60">@{r.fromUsername}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => acceptRequest(r.id)} className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all">
                                                <span className="material-symbols-outlined text-sm">check</span>
                                            </button>
                                            <button onClick={() => rejectRequest(r.id)} className="w-8 h-8 rounded-full bg-error-container/20 text-error flex items-center justify-center hover:bg-error-container transition-all">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {pendingRequests.length === 0 && (
                                    <p className="text-on-surface-variant/40 text-sm text-center py-4">No pending requests</p>
                                )}
                            </div>
                        </div>

                        {/* Blacklist */}
                        <div className="glass-panel p-6 rounded-2xl border border-outline-variant/10">
                            <h3 className="font-headline font-bold text-xl text-on-surface/70 flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined">block</span>
                                Blacklist
                            </h3>
                            <div className="space-y-3">
                                {blocked.map(b => (
                                    <div key={b.id} className="flex items-center justify-between bg-surface-container-lowest/50 p-3 rounded-xl group hover:bg-surface-container-high transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant/50">
                                                <span className="material-symbols-outlined text-sm">person_off</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-on-surface/70">{b.nickname}</p>
                                                <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">@{b.username}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => unblockUser(b.id)} className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all hover:underline">UNBLOCK</button>
                                    </div>
                                ))}
                                {blocked.length === 0 && (
                                    <p className="text-on-surface-variant/40 text-sm text-center py-4">No blocked users</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Left Column: Main Friends List */}
                    <section className="col-span-12 lg:col-span-8 order-2 lg:order-1">
                        {/* Tabs + Search */}
                        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                            <div className="flex gap-8">
                                <button onClick={() => setActiveTab('all')} className={`pb-2 font-bold ${activeTab === 'all' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant/50 hover:text-on-surface/70'} transition-all`}>ALL FRIENDS ({friends.length})</button>
                                <button onClick={() => setActiveTab('online')} className={`pb-2 font-bold ${activeTab === 'online' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant/50 hover:text-on-surface/70'} transition-all`}>ONLINE ({onlineFriends.length})</button>
                                <button onClick={() => setActiveTab('offline')} className={`pb-2 font-bold ${activeTab === 'offline' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant/50 hover:text-on-surface/70'} transition-all`}>OFFLINE ({offlineFriends.length})</button>
                            </div>
                            <form onSubmit={handleSearch} className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-sm">search</span>
                                <input
                                    className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-6 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 w-64 placeholder:text-on-surface-variant/30"
                                    placeholder="Search friends..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="glass-panel rounded-2xl border border-outline-variant/10 p-6 mb-8">
                                <h4 className="font-headline font-bold text-sm text-primary uppercase tracking-widest mb-4">Search Results</h4>
                                <div className="space-y-3">
                                    {searchResults.map(u => (
                                        <div key={u.id} className="flex items-center justify-between bg-surface-container-low/40 p-4 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-primary">
                                                    {u.nickname.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-on-surface">{u.nickname}</p>
                                                    <p className="text-xs text-on-surface-variant/50">@{u.username}</p>
                                                </div>
                                            </div>
                                            {u.id !== user.id && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => sendRequest(u.id)} className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs font-bold hover:bg-primary hover:text-on-primary transition-all">Add Friend</button>
                                                    <button onClick={() => blockUser(u.id)} className="px-4 py-2 rounded-lg bg-error-container/20 text-error text-xs font-bold hover:bg-error-container transition-all">Block</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {searchError && <p className="text-error text-sm mb-4">{searchError}</p>}

                        {/* Friends Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedFriends.map(f => {
                                const isOnline = f.isOnline;
                                return (
                                    <div key={f.id} className={`glass-panel p-5 rounded-2xl border border-outline-variant/10 group transition-all duration-300 ${!isOnline ? 'opacity-70 hover:opacity-100' : 'hover:bg-surface-container-high/60'}`}>
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className={`relative ${!isOnline ? 'grayscale group-hover:grayscale-0 transition-all' : ''}`}>
                                                <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-2xl font-bold text-primary overflow-hidden">
                                                    {f.avatar ? (
                                                        <img alt={f.nickname} className="w-full h-full object-cover" src={f.avatar} />
                                                    ) : (
                                                        f.nickname.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-surface-container rounded-full ${isOnline ? 'bg-primary shadow-[0_0_10px_rgba(255,184,0,0.5)]' : 'bg-on-surface-variant/30'}`}></div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-bold text-xl ${isOnline ? 'text-on-surface' : 'text-on-surface/50'}`}>{f.nickname}</h4>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 rounded bg-surface-container-highest text-on-surface/50 uppercase tracking-tighter">LVL {f.rank_level || 1}</span>
                                                    <span className={`text-xs ${isOnline ? 'text-primary font-bold' : 'text-on-surface-variant/40'}`}>
                                                        {isOnline ? 'Online' : 'Offline'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => isOnline && inviteToGame(f.id)}
                                                disabled={!isOnline}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isOnline ? 'bg-gradient-to-r from-primary-container to-primary text-on-primary hover:scale-[1.02] active:scale-95' : 'bg-surface-container text-on-surface-variant/30 cursor-not-allowed'}`}
                                            >
                                                Invite to Game
                                            </button>
                                            <button onClick={() => removeFriend(f.id)} className="w-12 h-10 rounded-xl bg-surface-container text-on-surface/50 flex items-center justify-center hover:bg-surface-container-highest hover:text-error transition-all">
                                                <span className="material-symbols-outlined text-lg">person_remove</span>
                                            </button>
                                            <button onClick={() => blockUser(f.id)} className="w-12 h-10 rounded-xl bg-surface-container text-on-surface/50 flex items-center justify-center hover:bg-surface-container-highest hover:text-error transition-all">
                                                <span className="material-symbols-outlined text-lg">block</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {displayedFriends.length === 0 && (
                            <div className="text-center py-16">
                                <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-4 block">group</span>
                                <p className="text-on-surface-variant/50 font-body">No friends to display. Search to add new allies!</p>
                            </div>
                        )}

                        {/* Status Bar */}
                        <div className="mt-12 flex items-center gap-8 glass-panel p-6 rounded-2xl border border-outline-variant/5">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(255,184,0,0.8)]"></div>
                                <span className="font-label text-sm text-primary tracking-widest uppercase">{onlineFriends.length} friends in orbit</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-on-surface-variant/30"></div>
                                <span className="font-label text-sm text-on-surface-variant/50 tracking-widest uppercase">{offlineFriends.length} drifting in void</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
