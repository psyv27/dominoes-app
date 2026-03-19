import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Users, UserPlus, ShieldBan, Check, X, Search, ArrowLeft, Gamepad } from 'lucide-react';
import './Friends.css';

export default function Friends() {
    const { user } = useAuth() as any;
    const { socket } = useSocket() as any;
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('friends'); // friends, requests, blocked
    const [friends, setFriends] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [blocked, setBlocked] = useState<any[]>([]);
    
    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchError, setSearchError] = useState('');

    const token = localStorage.getItem('token');
    const API_URL = 'http://localhost:5001/auth';

    const loadSocialData = async () => {
        try {
            const res = await fetch(`${API_URL}/social`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFriends(data.friends || []);
                setPendingRequests(data.pendingRequests || []);
                setSentRequests(data.sentRequests || []);
                setBlocked(data.blocked || []);
            }
        } catch (err) {
            console.error('Error loading social data', err);
        }
    };

    useEffect(() => {
        if (!user) return navigate('/');
        loadSocialData();
    }, [user, navigate]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchError('');
        if (!searchQuery.trim()) return;
        
        try {
            const res = await fetch(`${API_URL}/search?username=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data.length === 0) {
                setSearchError('User not found');
            }
            setSearchResults(data);
        } catch (err) {
            setSearchError('Search failed');
        }
    };

    const sendRequest = async (toId: string) => {
        try {
            const res = await fetch(`${API_URL}/friend-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ toId })
            });
            if (res.ok) {
                alert('Friend request sent!');
                loadSocialData();
            } else {
                const { error } = await res.json();
                alert(error || 'Failed to send request');
            }
        } catch (err) {
            alert('Error');
        }
    };

    const acceptRequest = async (id: string) => {
        await fetch(`${API_URL}/friend-request/${id}/accept`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
        loadSocialData();
    };

    const rejectRequest = async (id: string) => {
        await fetch(`${API_URL}/friend-request/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        loadSocialData();
    };

    const removeFriend = async (id: string) => {
        if (!confirm('Remove this friend?')) return;
        await fetch(`${API_URL}/friends/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        loadSocialData();
    };

    const blockUser = async (blockedId: string) => {
        if (!confirm('Block this user? They will not be able to interact with you.')) return;
        try {
            await fetch(`${API_URL}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ blockedId })
            });
            loadSocialData();
            setSearchResults([]);
        } catch (err) {
            console.error(err);
        }
    };

    const unblockUser = async (id: string) => {
        await fetch(`${API_URL}/block/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        loadSocialData();
    };

    const inviteToGame = (friendId: string) => {
        // Find if we are currently in a room
        // Actually, we can prompt for a room code or if they are in a room, send it.
        // For simplicity, we just prompt for a code to invite to (or we could store their current room locally).
        const roomId = prompt("Enter your Room Code to invite them to:");
        if (roomId && socket) {
            socket.emit('inviteToGame', { toId: friendId, roomId });
            alert("Invite sent!");
        }
    };

    return (
        <div className="friends-container">
            <header className="friends-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h1>Social Center</h1>
                <div style={{ width: 80 }}></div> {/* spacer */}
            </header>

            <div className="friends-content">
                <div className="tabs">
                    <button className={activeTab === 'friends' ? 'active' : ''} onClick={() => setActiveTab('friends')}>
                        <Users size={18} /> My Friends ({friends.length})
                    </button>
                    <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>
                        <UserPlus size={18} /> Requests ({pendingRequests.length})
                    </button>
                    <button className={activeTab === 'blocked' ? 'active' : ''} onClick={() => setActiveTab('blocked')}>
                        <ShieldBan size={18} /> Blocked ({blocked.length})
                    </button>
                </div>

                {/* FRIENDS TAB */}
                {activeTab === 'friends' && (
                    <div className="tab-pane">
                        <form className="search-bar" onSubmit={handleSearch}>
                            <Search size={18} />
                            <input 
                                type="text" 
                                placeholder="Search usernames to add friends..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit">Search</button>
                        </form>
                        {searchError && <p className="error-text">{searchError}</p>}
                        
                        {searchResults.length > 0 && (
                            <div className="search-results">
                                <h3>Search Results</h3>
                                {searchResults.map(u => (
                                    <div key={u.id} className="user-card">
                                        <div className="user-info">
                                            <strong>{u.nickname}</strong>
                                            <span>@{u.username}</span>
                                        </div>
                                        <div className="user-actions">
                                            {u.id !== user.id && (
                                                <>
                                                    <button onClick={() => sendRequest(u.id)} className="action-btn success"><UserPlus size={16} /> Add</button>
                                                    <button onClick={() => blockUser(u.id)} className="action-btn danger"><ShieldBan size={16} /> Block</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="list-section">
                            <h3>My Friends</h3>
                            {friends.length === 0 ? (
                                <p className="empty-text">You haven't added any friends yet.</p>
                            ) : (
                                friends.map(f => (
                                    <div key={f.id} className="user-card">
                                        <div className="user-info">
                                            <strong>{f.nickname}</strong>
                                            <span>@{f.username}</span>
                                        </div>
                                        <div className="user-actions">
                                            <button onClick={() => inviteToGame(f.id)} className="action-btn primary"><Gamepad size={16} /> Invite</button>
                                            <button onClick={() => removeFriend(f.id)} className="action-btn danger">Remove</button>
                                            <button onClick={() => blockUser(f.id)} className="action-btn dark"><ShieldBan size={16} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* REQUESTS TAB */}
                {activeTab === 'requests' && (
                    <div className="tab-pane">
                        <div className="list-section">
                            <h3>Incoming Requests</h3>
                            {pendingRequests.length === 0 ? (
                                <p className="empty-text">No pending requests.</p>
                            ) : (
                                pendingRequests.map(r => (
                                    <div key={r.id} className="user-card">
                                        <div className="user-info">
                                            <strong>{r.fromNickname}</strong>
                                            <span>@{r.fromUsername}</span>
                                        </div>
                                        <div className="user-actions">
                                            <button onClick={() => acceptRequest(r.id)} className="action-btn success"><Check size={16} /> Accept</button>
                                            <button onClick={() => rejectRequest(r.id)} className="action-btn danger"><X size={16} /> Decline</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="list-section mt-4">
                            <h3>Sent Requests</h3>
                            {sentRequests.length === 0 ? (
                                <p className="empty-text">No sent requests.</p>
                            ) : (
                                sentRequests.map(r => (
                                    <div key={r.id} className="user-card">
                                        <div className="user-info">
                                            <strong>{r.toNickname}</strong>
                                            <span>@{r.toUsername}</span>
                                        </div>
                                        <div className="user-actions">
                                            <button onClick={() => rejectRequest(r.id)} className="action-btn dark">Cancel</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* BLOCKED TAB */}
                {activeTab === 'blocked' && (
                    <div className="tab-pane">
                        <div className="list-section">
                            <h3>Blocked Users</h3>
                            {blocked.length === 0 ? (
                                <p className="empty-text">You haven't blocked anyone.</p>
                            ) : (
                                blocked.map(b => (
                                    <div key={b.id} className="user-card">
                                        <div className="user-info">
                                            <strong>{b.nickname}</strong>
                                            <span>@{b.username}</span>
                                        </div>
                                        <div className="user-actions">
                                            <button onClick={() => unblockUser(b.id)} className="action-btn">Unblock</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
