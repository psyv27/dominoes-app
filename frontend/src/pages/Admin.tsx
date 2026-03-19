import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Trash2, Plus, X, Users, MessageSquare, Gamepad2, Smile, Coins } from 'lucide-react';
import './Admin.css';

export default function Admin() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // users, words, messages
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
        <div className="admin-container">
            <header className="admin-header">
                <div>
                    <h1><ShieldAlert color="var(--danger)" /> Admin Dashboard</h1>
                    <p className="subtitle">Secret control panel for Emin</p>
                </div>
                <button className="exit-btn" onClick={() => navigate('/')}>Exit Admin</button>
            </header>

            <div className="admin-content">
                <div className="admin-sidebar">
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                        <Users size={18} /> Manage Users
                    </button>
                    <button className={activeTab === 'words' ? 'active' : ''} onClick={() => setActiveTab('words')}>
                        <MessageSquare size={18} /> Chat Filter
                    </button>
                    <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>
                        <Gamepad2 size={18} /> In-Game Chat
                    </button>
                    <button className={activeTab === 'stickers' ? 'active' : ''} onClick={() => setActiveTab('stickers')}>
                        <Smile size={18} /> Custom Stickers
                    </button>
                </div>

                <div className="admin-main">
                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="panel">
                            <h2>Registered Users ({users.length})</h2>
                            <div className="table-responsive">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Username</th>
                                            <th>Nickname</th>
                                            <th>Rank</th>
                                            <th>Coins</th>
                                            <th>P/W/L/D</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td className="id-cell" title={u.id}>{u.id.substring(0, 8)}...</td>
                                                <td>{u.username}</td>
                                                <td>{u.nickname}</td>
                                                <td>Level {u.rank_level || 1}</td>
                                                <td style={{ color: '#d4a962', fontWeight: 'bold' }}>{u.coins || 0}</td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    {u.games_played || 0} / {u.games_won || 0} / {u.games_lost || 0} / {u.games_drawn || 0}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button onClick={() => adjustCoins(u.id)} title="Adjust Coins" style={{ background: 'transparent', border: 'none', color: '#d4a962', cursor: 'pointer' }}>
                                                            <Coins size={16} />
                                                        </button>
                                                        <button onClick={() => deleteUser(u.id)} className="delete-icon-btn" title="Ban / Delete User">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>No users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* WORDS TAB */}
                    {activeTab === 'words' && (
                        <div className="panel">
                            <h2>Banned Words Filter</h2>
                            <p className="help-text">Any word in this list will be replaced with ****** in game chat.</p>
                            
                            <form className="add-word-form" onSubmit={addWord}>
                                <input 
                                    type="text" 
                                    placeholder="Enter a vulgar word to ban..." 
                                    value={newWord}
                                    onChange={(e) => setNewWord(e.target.value)}
                                />
                                <button type="submit"><Plus size={18} /> Add Word</button>
                            </form>

                            <div className="words-grid">
                                {bannedWords.map((word, idx) => (
                                    <div key={idx} className="word-tag">
                                        <span>{word}</span>
                                        <button onClick={() => removeWord(word)}><X size={14} /></button>
                                    </div>
                                ))}
                                {bannedWords.length === 0 && (
                                    <p className="empty-text" style={{gridColumn: '1 / -1'}}>No banned words yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MESSAGES TAB */}
                    {activeTab === 'messages' && (
                        <div className="panel">
                            <h2>In-Game Quick Messages</h2>
                            <p className="help-text">Add emojis and short texts players can send during game.</p>
                            
                            <form className="add-word-form" onSubmit={addMessage}>
                                <input 
                                    type="text" 
                                    placeholder="Enter emoji or quick message..." 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit"><Plus size={18} /> Add Message</button>
                            </form>

                            <div className="words-grid">
                                {predefinedMessages.map((msg, idx) => (
                                    <div key={idx} className="word-tag" style={{background: 'rgba(var(--primary-rgb), 0.1)', borderColor: 'rgba(var(--primary-rgb), 0.3)'}}>
                                        <span>{msg}</span>
                                        <button onClick={() => removeMessage(msg)}><X size={14} /></button>
                                    </div>
                                ))}
                                {predefinedMessages.length === 0 && (
                                    <p className="empty-text" style={{gridColumn: '1 / -1'}}>No predefined messages yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STICKERS TAB */}
                    {activeTab === 'stickers' && (
                        <div className="panel">
                            <h2>Custom Game Stickers</h2>
                            <p className="help-text">Upload new stickers and control who can use them.</p>
                            
                            <form className="add-word-form" onSubmit={addSticker} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input 
                                    type="text" 
                                    placeholder="Sticker Name..." 
                                    value={newStickerName}
                                    onChange={(e) => setNewStickerName(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <label style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input type="checkbox" checked={newStickerHidden} onChange={e => setNewStickerHidden(e.target.checked)} />
                                    Hidden (Admin/Allowed Only)
                                </label>
                                <button type="submit" disabled={!newStickerName || !newStickerFile}><Plus size={18} /> Upload</button>
                            </form>

                            <div className="table-responsive" style={{ marginTop: '20px' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Image</th>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Allowed User IDs</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stickers.map(stk => (
                                            <tr key={stk.id}>
                                                <td><img src={stk.url} alt={stk.name} style={{ width: 40, height: 40, objectFit: 'contain' }} /></td>
                                                <td>{stk.name}</td>
                                                <td>{stk.isHidden ? 'Hidden' : 'Public'}</td>
                                                <td>
                                                    {editingStickerId === stk.id ? (
                                                        <input 
                                                            type="text" 
                                                            value={editAllowedUsers} 
                                                            onChange={e => setEditAllowedUsers(e.target.value)}
                                                            placeholder="Comma separated user IDs"
                                                            style={{ width: '100%', padding: '4px' }}
                                                        />
                                                    ) : (
                                                        stk.allowedUsers.join(', ') || (stk.isHidden ? 'None' : 'All')
                                                    )}
                                                </td>
                                                <td>
                                                    {editingStickerId === stk.id ? (
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            <button onClick={() => saveStickerPermissions(stk.id, stk.isHidden)} style={{ background: 'var(--primary)', border: 'none', color: 'black', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                                                            <button onClick={() => setEditingStickerId(null)} style={{ background: 'var(--bg-lighter)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button onClick={() => { setEditingStickerId(stk.id); setEditAllowedUsers(stk.allowedUsers.join(', ')); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>Edit Perms</button>
                                                            <button onClick={() => deleteSticker(stk.id)} className="delete-icon-btn" title="Delete Sticker"><Trash2 size={16} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {stickers.length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>No custom stickers found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
