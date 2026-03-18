import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Image as ImageIcon, ArrowLeft, Save, Trophy, Coins, Target } from 'lucide-react';
import './Profile.css';

export default function Profile() {
    const { user, login } = useAuth() as any;
    const navigate = useNavigate();

    const [nickname, setNickname] = useState(user?.nickname || '');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    
    // Status
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ nickname, password, avatar })
            });

            const data = await res.json();
            if (res.ok) {
                // Update local context to reflect the new user object
                login(token, data.user);
                setSuccessMsg('Profile updated successfully!');
                setPassword(''); // clear out password after saving
            } else {
                setErrorMsg(data.error || 'Failed to update profile');
            }
        } catch (err) {
            setErrorMsg('Network error. Check server connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <button className="back-btn" onClick={() => navigate('/lobby')}>
                    <ArrowLeft size={20} /> Back to Lobby
                </button>
            </div>

            <div className="profile-content">
                <div className="profile-stats-panel" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '20px', justifyContent: 'space-around', color: '#fff' }}>
                    <div style={{ textAlign: 'center' }}>
                        <Coins size={32} color="#f5a623" />
                        <h3 style={{ margin: '10px 0 5px', fontSize: '1.5rem', color: '#f5a623' }}>{user?.coins || 0}</h3>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Coins</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <Trophy size={32} color="#2ecc71" />
                        <h3 style={{ margin: '10px 0 5px', fontSize: '1.5rem' }}>{user?.total_wins || user?.games_won || 0}</h3>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Match Wins</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <Target size={32} color="#9b59b6" />
                        <h3 style={{ margin: '10px 0 5px', fontSize: '1.5rem' }}>{user?.total_games || user?.games_played || 0}</h3>
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Total Played</p>
                    </div>
                </div>

                <div className="profile-card">
                    <h2>Edit Profile</h2>
                    
                    <div className="avatar-preview">
                        <div 
                            className="avatar-circle"
                            style={{ backgroundImage: avatar ? `url(${avatar})` : 'none' }}
                        >
                            {!avatar && <User size={40} opacity={0.5} />}
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="profile-form">
                        {errorMsg && <div className="error-box">{errorMsg}</div>}
                        {successMsg && <div className="success-box">{successMsg}</div>}

                        <div className="input-group">
                            <User className="input-icon" size={18} />
                            <input 
                                type="text" 
                                placeholder="Display Name (Nickname)" 
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <ImageIcon className="input-icon" size={18} />
                            <input 
                                type="text" 
                                placeholder="Profile Photo URL" 
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <KeyRound className="input-icon" size={18} />
                            <input 
                                type="password" 
                                placeholder="New Password (Leave blank to keep current)" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="primary-btn save-btn" 
                            disabled={loading}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
