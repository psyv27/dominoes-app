import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Avatar, Button, Tag, Input, Tooltip, Card, List } from 'antd';
import { 
    TeamOutlined, CrownOutlined, LogoutOutlined, 
    MessageOutlined, CloseOutlined, CopyOutlined, SendOutlined
} from '@ant-design/icons';
import Gameplay from './Gameplay';
import './Room.css';

export default function Room() {
    const { id } = useParams();
    const { user } = useAuth() as any;
    const { socket } = useSocket() as any;
    const navigate = useNavigate();
    const location = useLocation();

    // If room was passed via navigation state (from Lobby), use it immediately
    const passedRoom = (location.state as any)?.room || null;
    const [room, setRoom] = useState<any>(passedRoom);
    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        if (!socket) return;

        // Only emit joinRoom if room wasn't already passed (i.e. direct URL navigation)
        if (!passedRoom) {
            socket.emit('joinRoom', { roomId: id, playerDetails: user });
        }

        socket.on('roomUpdated', (updatedRoom: any) => setRoom(updatedRoom));
        socket.on('roomJoined', (joinedRoom: any) => setRoom(joinedRoom));
        socket.on('gameStarted', (startedRoom: any) => setRoom(startedRoom));
        socket.on('chatMessage', (msg: any) => setMessages(prev => [...prev, msg]));
        socket.on('kicked', (reason: string) => {
            alert(reason);
            navigate('/lobby');
        });

        return () => {
            socket.off('roomUpdated');
            socket.off('roomJoined');
            socket.off('gameStarted');
            socket.off('chatMessage');
            socket.off('kicked');
        };
    }, [id, socket, user, navigate]);

    const handleLeave = () => {
        socket.emit('leaveRoom');
        navigate('/lobby');
    };

    const handleStartGame = () => {
        socket.emit('startGame', id);
    };

    const handleSendChat = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (chatInput.trim()) {
            socket.emit('chatMessage', { 
                roomId: id, 
                message: chatInput, 
                nickname: user?.nickname || 'Guest'
            });
            setChatInput('');
        }
    };

    const handleKick = (targetSocketId: string) => {
        socket.emit('kickPlayer', { roomId: id, targetSocketId });
    };

    const handleSwitchTeam = (team: number) => {
        socket.emit('switchTeam', { roomId: id, team });
    };

    if (!room) {
        return <div className="room-loading">Loading room...</div>;
    }

    if (room.state === 'playing' || room.state === 'finished') {
        return <Gameplay room={room} />;
    }

    const isHost = room.hostId === socket.id;
    const players = Object.values(room.players) as any[];
    const isTeamMode = room.teamMode === 'Team Mode (2 vs 2)';

    return (
        <div className="room-container">
            <header className="room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <div className="room-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {room.roomType === 'Private' && room.inviteCode ? (
                        <>
                            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
                                Invite Code: <span className="invite-code-display" style={{ fontFamily: 'monospace', color: '#f9a825', letterSpacing: '0.2rem' }}>{room.inviteCode}</span>
                            </h1>
                            <Tooltip title="Copy invite code">
                                <Button 
                                    icon={<CopyOutlined />} 
                                    size="small"
                                    onClick={() => navigator.clipboard.writeText(room.inviteCode)}
                                >
                                    Copy
                                </Button>
                            </Tooltip>
                        </>
                    ) : (
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Room: <span>#{room.id.slice(0, 5)}</span></h1>
                    )}
                    <div className="room-badges" style={{ display: 'flex', gap: '0.5rem' }}>
                        <Tag color="blue">{room.gameMode}</Tag>
                        <Tag color="cyan">{room.teamMode}</Tag>
                        <Tag color="gold">
                            {room.matchFormat === 'Score' ? `First to ${room.targetScore}` : room.matchFormat}
                        </Tag>
                    </div>
                </div>
                <Button danger type="primary" icon={<LogoutOutlined />} onClick={handleLeave}>
                    Leave Room
                </Button>
            </header>

            <div className="room-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', padding: '1rem', height: 'calc(100vh - 80px)' }}>
                <Card 
                    title={<><TeamOutlined /> Players ({players.length}/4)</>} 
                    className="players-panel"
                    style={{ background: 'rgba(25, 33, 44, 0.4)', borderColor: 'var(--glass-border)', color: 'white', display: 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
                >
                    <List
                        dataSource={[...players, ...Array(Math.max(0, 4 - players.length)).fill(null)]}
                        renderItem={(p: any, i) => (
                            <List.Item 
                                key={p ? p.socketId : `empty-${i}`}
                                style={{ 
                                    background: p?.socketId === socket.id ? 'rgba(212, 169, 98, 0.15)' : 'rgba(0,0,0,0.2)',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    padding: '12px 16px',
                                    border: p?.socketId === socket.id ? '1px solid rgba(212, 169, 98, 0.3)' : '1px solid transparent'
                                }}
                            >
                                {p ? (
                                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <Avatar style={{ backgroundColor: '#d4a962', color: '#1a120b', fontWeight: 'bold' }}>
                                                {p.nickname?.charAt(0)?.toUpperCase() || '?'}
                                            </Avatar>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff' }}>
                                                    {p.nickname} {p.socketId === socket.id && <Tag color="orange" style={{ marginLeft: 8 }}>You</Tag>}
                                                </div>
                                                {isTeamMode && (
                                                    <div style={{ marginTop: 4 }}>
                                                        {p.socketId === socket.id ? (
                                                            <Button.Group>
                                                                <Button 
                                                                    size="small" 
                                                                    type={p.team === 1 ? 'primary' : 'default'}
                                                                    onClick={() => handleSwitchTeam(1)}
                                                                >Team 1</Button>
                                                                <Button 
                                                                    size="small" 
                                                                    type={p.team === 2 ? 'primary' : 'default'}
                                                                    onClick={() => handleSwitchTeam(2)}
                                                                >Team 2</Button>
                                                            </Button.Group>
                                                        ) : (
                                                            <Tag color={p.team === 1 ? 'blue' : p.team === 2 ? 'red' : 'default'}>
                                                                Team {p.team || '?'}
                                                            </Tag>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {room.hostId === p.socketId && <Tooltip title="Host"><CrownOutlined style={{ color: '#d4a962', fontSize: '1.2rem' }} /></Tooltip>}
                                            {isHost && p.socketId !== socket.id && (
                                                <Tooltip title="Kick Player">
                                                    <Button type="text" danger icon={<CloseOutlined />} onClick={() => handleKick(p.socketId)} />
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', padding: '8px 0' }}>Waiting for player...</div>
                                )}
                            </List.Item>
                        )}
                    />
                    {isHost && (
                        <div style={{ marginTop: 'auto', paddingTop: '1rem', textAlign: 'center' }}>
                            <Button 
                                type="primary" 
                                size="large" 
                                block 
                                onClick={handleStartGame}
                                disabled={players.length < 2}
                                style={{ height: '50px', fontSize: '1.2rem', fontWeight: 700 }}
                            >
                                Start Game
                            </Button>
                            {players.length < 2 && <div style={{ color: '#f87171', marginTop: 8 }}>Need at least 2 players to start.</div>}
                        </div>
                    )}
                </Card>

                <Card 
                    title={<><MessageOutlined /> Lobby Chat</>} 
                    className="chat-panel"
                    style={{ background: 'rgba(25, 33, 44, 0.4)', borderColor: 'var(--glass-border)', color: 'white', display: 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px' }}
                >
                    <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {messages.length === 0 ? (
                            <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '2rem' }}>Say hello!</div>
                        ) : (
                            messages.map((m: any, i: number) => (
                                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px' }}>
                                    <span style={{ color: '#d4a962', fontWeight: 600, marginRight: '8px' }}>{m.nickname}:</span>
                                    <span style={{ color: '#fff' }}>{m.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px' }}>
                        <Input 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Type a message..."
                            onPressEnter={() => handleSendChat()}
                        />
                        <Button type="primary" icon={<SendOutlined />} onClick={() => handleSendChat()} />
                    </form>
                </Card>
            </div>
        </div>
    );
}
