import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Trash2, Plus, X, Users, MessageSquare, Gamepad2 } from 'lucide-react';
import './Admin.css';

export default function Admin() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // users, words, messages
    const [users, setUsers] = useState<any[]>([]);
    const [bannedWords, setBannedWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState('');
    const [predefinedMessages, setPredefinedMessages] = useState<string[]>([]);
    const [newMessage, setNewMessage] = useState('');
    
    const API_URL = 'http://localhost:4000/admin';

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
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td className="id-cell" title={u.id}>{u.id.substring(0, 8)}...</td>
                                                <td>{u.username}</td>
                                                <td>{u.nickname}</td>
                                                <td>Level {u.rank_level}</td>
                                                <td>
                                                    <button onClick={() => deleteUser(u.id)} className="delete-icon-btn" title="Ban / Delete User">
                                                        <Trash2 size={16} />
                                                    </button>
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
                </div>
            </div>
        </div>
    );
}
