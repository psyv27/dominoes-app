import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Avatar, Button, Input, Select, Tag, Badge, Slider, InputNumber, Modal, Tooltip, Empty, Card } from 'antd';
import {
    LogoutOutlined, PlusOutlined, TeamOutlined, NumberOutlined,
    PlayCircleOutlined, ShoppingOutlined, SkinOutlined, RobotOutlined,
    TrophyOutlined, RightOutlined, SearchOutlined, LockOutlined,
    EditOutlined, ClockCircleOutlined
} from '@ant-design/icons';
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
        // Daily Login Check
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

    const handleWatchAd = () => {
        setAdLoading(true);
        setTimeout(() => {
            fetch('http://localhost:5001/auth/rewards/ad', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    updateUser({ coins: data.coins });
                    Modal.success({ title: 'Ad Complete', content: 'You received 50 coins!', centered: true });
                } else {
                    Modal.error({ title: 'Error', content: data.error });
                }
            })
            .finally(() => setAdLoading(false));
        }, 3000); // Simulate 3 seconds Ad
    };

    const filteredRooms = rooms.filter(r =>
        r.gameMode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isGuest = user?.isGuest || user?.is_guest;

    return (
        <div className="lobby-container animate-fade-in">
            {/* Sidebar */}
            <aside className="lobby-sidebar glass-effect">
                <div className="brand">
                    <div className="brand-logo premium-gradient">🂓</div>
                    <h1 className="font-heading">Domino</h1>
                </div>

                <div className="user-profile-card">
                    <Avatar
                        size={44}
                        style={{ background: 'linear-gradient(135deg, #d4a962, #a87b32)', fontWeight: 700, fontSize: '1.2rem' }}
                    >
                        {user?.nickname?.charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="user-info">
                        <span className="user-nick">{user?.nickname}</span>
                        <div className="user-badges">
                            {isGuest ? (
                                <Tag color="default">Guest</Tag>
                            ) : (
                                <Tag color="gold">Lvl {user?.rank_level || 1}</Tag>
                            )}
                            <Tag color="orange" style={{ fontWeight: 'bold' }}>🪙 {user?.coins || 0}</Tag>
                        </div>
                    </div>
                    <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate('/profile')} style={{ color: 'var(--text-secondary)' }} />
                </div>

                {!isGuest && (user?.coins < 20) && (
                    <div style={{ padding: '0 20px', marginBottom: 15 }}>
                        <Button 
                            type="dashed" block 
                            loading={adLoading}
                            onClick={handleWatchAd}
                            style={{ borderColor: '#d4a962', color: '#d4a962' }}
                        >
                            {adLoading ? 'Watching Ad...' : '▶ Watch Ad for 50 🪙'}
                        </Button>
                    </div>
                )}

                <nav className="side-nav">
                    <Button type="text" block className="side-nav-item active" icon={<PlayCircleOutlined />}>
                        Play Now
                    </Button>
                    <Button type="text" block className="side-nav-item" icon={<TeamOutlined />} onClick={() => navigate('/friends')}>
                        Social
                    </Button>
                    <Tooltip title={isGuest ? 'Register to unlock' : ''} placement="right">
                        <Button type="text" block className="side-nav-item" icon={<ShoppingOutlined />}
                            disabled={isGuest} onClick={() => navigate('/store')}>
                            Market
                        </Button>
                    </Tooltip>
                    <Tooltip title={isGuest ? 'Register to unlock' : ''} placement="right">
                        <Button type="text" block className="side-nav-item" icon={<SkinOutlined />}
                            disabled={isGuest} onClick={() => navigate('/inventory')}>
                            Gear
                        </Button>
                    </Tooltip>
                </nav>

                <div className="sidebar-footer">
                    <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout} className="logout-link">
                        Exit Game
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lobby-main">
                <header className="main-header">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Find a game or player..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="search-bar"
                        size="large"
                        allowClear
                    />

                    <div className="top-actions">
                        <Button icon={<NumberOutlined />} size="large" onClick={() => {
                            setShowJoinCode(true);
                            setJoinCodeError('');
                            setJoinCode('');
                        }}>
                            Join Code
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} size="large"
                            onClick={() => { setShowCreate(true); setShowSinglePlayer(false); }}
                            style={{ fontWeight: 700 }}
                        >
                            New Table
                        </Button>
                    </div>
                </header>

                <div className="lobby-sections-grid">
                    {/* Mode Cards */}
                    <section className="modes-row">
                        <div className="mode-hero bots glass-effect" onClick={() => setShowSinglePlayer(true)}>
                            <div className="mode-icon"><RobotOutlined style={{ fontSize: 32 }} /></div>
                            <div className="mode-text">
                                <h3>Training Grounds</h3>
                                <p>Sharpen your skills against advanced AI bots</p>
                            </div>
                            <RightOutlined className="arrow" />
                        </div>
                        <div className="mode-hero ranked premium-gradient">
                            <div className="mode-icon"><TrophyOutlined style={{ fontSize: 32 }} /></div>
                            <div className="mode-text">
                                <h3>Ranked Match</h3>
                                <p>Compete for Glory and climb the Leaderboards</p>
                            </div>
                            <Tag className="soon">Soon</Tag>
                        </div>
                    </section>

                    {/* Room Grid */}
                    <section className="rooms-grid-container">
                        <div className="grid-header">
                            <h2>Active Tables</h2>
                            <Badge count={`${filteredRooms.length} online`} style={{ backgroundColor: 'rgba(212,169,98,0.15)', color: '#d4a962' }} />
                        </div>

                        {filteredRooms.length === 0 ? (
                            <div className="empty-state glass-effect">
                                <Empty description="No tables found" />
                                <Button type="link" onClick={() => setShowCreate(true)}>Host a new game</Button>
                            </div>
                        ) : (
                            <div className="rooms-grid">
                                {filteredRooms.map(room => (
                                    <Card key={room.id} className="room-item" bordered={false}
                                        style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20 }}>
                                        <div className="room-meta">
                                            <Tag color={room.gameMode === 'Normal' ? 'green' : room.gameMode === 'All Fives' ? 'orange' : 'red'}>
                                                {room.gameMode}
                                            </Tag>
                                            <Tag color="orange" style={{ fontWeight: 'bold' }}>🪙 {room.entryFee || 20}</Tag>
                                            <span className="rm-id">#{room.id.slice(0, 5)}</span>
                                        </div>
                                        <div className="room-title-text">
                                            {room.teamMode === 'Free For All' ? 'FFA Classic' : 'Tactical 2v2'}
                                        </div>
                                        <div className="room-stats">
                                            <Tag icon={<TeamOutlined />}>{room.playerCount}/4</Tag>
                                            <Tag icon={<ClockCircleOutlined />}>{room.turnTimer}s</Tag>
                                            <Tag icon={<TrophyOutlined />}>{room.matchFormat === 'Score' ? room.targetScore : room.matchFormat}</Tag>
                                        </div>
                                        <Button
                                            type="primary" block
                                            onClick={() => {
                                                if (!room.isSinglePlayer && (user?.coins || 0) < (room.entryFee || 20)) {
                                                    Modal.error({ title: "Not Enough Coins", content: `You need at least ${room.entryFee || 20} coins to join this room.` });
                                                    return;
                                                }
                                                handleJoinPublic(room.id);
                                            }}
                                            disabled={room.playerCount >= 4}
                                            style={{ marginTop: 12 }}
                                        >
                                            {room.playerCount >= 4 ? 'Table Full' : 'Sit Down'}
                                        </Button>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Create / Single Player Modal */}
            <Modal
                open={showCreate || showSinglePlayer}
                onCancel={() => { setShowCreate(false); setShowSinglePlayer(false); }}
                title={showCreate ? 'Set Up New Table' : 'Single Player Config'}
                footer={[
                    <Button key="cancel" onClick={() => { setShowCreate(false); setShowSinglePlayer(false); }}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={showCreate ? handleCreateRoom : handleStartSinglePlayer} style={{ fontWeight: 700 }}>
                        {showCreate ? 'Host Table' : 'Start Training'}
                    </Button>
                ]}
                centered
                width={560}
            >
                <div className="settings-form-grid">
                    {showCreate ? (
                        <>
                            <div className="form-group">
                                <label>Privacy</label>
                                <Select value={settings.roomType} onChange={v => setSettings({ ...settings, roomType: v })}
                                    options={[{ value: 'Public', label: 'Public' }, { value: 'Private', label: 'Private' }]} />
                            </div>
                            {settings.roomType === 'Private' && (
                                <div className="form-group animate-fade-in">
                                    <label>Room Code (Min 4 chars)</label>
                                    <Input
                                        placeholder="Enter secret code..."
                                        maxLength={12}
                                        value={settings.inviteCode}
                                        onChange={e => setSettings({ ...settings, inviteCode: e.target.value.toUpperCase() })}
                                        style={{ fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold' }}
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Team Strategy</label>
                                <Select value={settings.teamMode} onChange={v => setSettings({ ...settings, teamMode: v })}
                                    options={[{ value: 'Free For All', label: 'Individual (FFA)' }, { value: 'Team Mode (2 vs 2)', label: 'Partnership (2v2)' }]} />
                            </div>
                            <div className="form-group">
                                <label>Entry Fee (Coins)</label>
                                <InputNumber
                                    min={20} step={10} style={{ width: '100%' }}
                                    value={settings.entryFee}
                                    onChange={v => setSettings({ ...settings, entryFee: v || 20 })}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>AI Intelligence</label>
                                <Select value={spSettings.botDifficulty} onChange={v => setSpSettings({ ...spSettings, botDifficulty: v })}
                                    options={[{ value: 'easy', label: 'Beginner' }, { value: 'normal', label: 'Skilled' }, { value: 'hard', label: 'Grandmaster' }]} />
                            </div>
                            <div className="form-group">
                                <label>Opponents</label>
                                <Select value={spSettings.botCount} onChange={v => setSpSettings({ ...spSettings, botCount: v })}
                                    options={[{ value: 1, label: '1 Player (1v1)' }, { value: 3, label: '3 Players (1v3)' }]} />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Rule Variation</label>
                        <Select
                            value={showCreate ? settings.gameMode : spSettings.gameMode}
                            onChange={v => showCreate ? setSettings({ ...settings, gameMode: v }) : setSpSettings({ ...spSettings, gameMode: v })}
                            options={[{ value: 'Normal', label: 'Normal' }, { value: 'All Fives', label: 'All Fives' }, { value: 'Blocking Mode', label: 'Blocking Mode' }]}
                        />
                    </div>

                    <div className="form-group">
                        <label>Turn Timer: {showCreate ? settings.turnTimer : spSettings.turnTimer}s</label>
                        <Slider min={10} max={60} step={5}
                            value={showCreate ? settings.turnTimer : spSettings.turnTimer}
                            onChange={v => showCreate ? setSettings({ ...settings, turnTimer: v }) : setSpSettings({ ...spSettings, turnTimer: v })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Goal</label>
                        <Select
                            value={showCreate ? settings.matchFormat : spSettings.matchFormat}
                            onChange={v => showCreate ? setSettings({ ...settings, matchFormat: v }) : setSpSettings({ ...spSettings, matchFormat: v })}
                            options={[{ value: 'Score', label: 'Score' }, { value: 'Best of 1', label: 'Best of 1' }, { value: 'Best of 3', label: 'Best of 3' }, { value: 'Best of 5', label: 'Best of 5' }]}
                        />
                    </div>

                    {(showCreate ? settings.matchFormat === 'Score' : spSettings.matchFormat === 'Score') && (
                        <div className="form-group">
                            <label>Target Points</label>
                            <InputNumber
                                min={10} step={10} style={{ width: '100%' }}
                                value={showCreate ? settings.targetScore : spSettings.targetScore}
                                onChange={v => showCreate ? setSettings({ ...settings, targetScore: v || 100 }) : setSpSettings({ ...spSettings, targetScore: v || 100 })}
                            />
                        </div>
                    )}
                </div>
            </Modal>

            {/* Join Code Modal */}
            <Modal
                open={showJoinCode}
                onCancel={() => setShowJoinCode(false)}
                title="Join Private Game"
                centered
                width={440}
                footer={[
                    <Button key="cancel" onClick={() => setShowJoinCode(false)}>Cancel</Button>,
                    <Button key="join" type="primary" onClick={handleJoinByCode} disabled={joinCode.trim().length < 4}
                        style={{ fontWeight: 700 }}>
                        Join Game
                    </Button>
                ]}
            >
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Enter the 6-character invite code shared by the host.
                </p>
                <Input
                    size="large"
                    maxLength={6}
                    placeholder="ABCDEF"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    autoFocus
                    style={{ textAlign: 'center', fontSize: '1.8rem', fontFamily: 'monospace', letterSpacing: '0.35em', fontWeight: 800 }}
                />
                {joinCodeError && <p style={{ color: '#f87171', marginTop: 8, fontWeight: 600 }}>{joinCodeError}</p>}
            </Modal>
        </div>
    );
}
