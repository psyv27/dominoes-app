import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Domino from '../components/Domino';
import { Trophy, SkipForward, LogOut, ArrowLeft } from 'lucide-react';
import './Gameplay.css';

export default function Gameplay({ room }: any) {
    const { socket } = useSocket() as any;
    const { user } = useAuth() as any;
    const navigate = useNavigate();
    
    const [gameState, setGameState] = useState<any>(room.gameState || null);
    const [roundOverData, setRoundOverData] = useState<any>(null);
    const [matchOverData, setMatchOverData] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [turnPopup, setTurnPopup] = useState(false);
    const [blockedPopup, setBlockedPopup] = useState(false);
    const [drawingBone, setDrawingBone] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerTotal, setTimerTotal] = useState(10);
    const prevTurnRef = useRef<string|null>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('gameState', (state: any) => {
            setGameState(state);
            setRoundOverData(null);

            // Show turn popup when turn changes
            if (state.turn !== prevTurnRef.current) {
                prevTurnRef.current = state.turn;
                setTurnPopup(true);
                setTimeout(() => setTurnPopup(false), 1800);
            }
        });

        socket.on('roundEnd', (data: any) => setRoundOverData(data));
        socket.on('matchOver', (data: any) => setMatchOverData(data));
        socket.on('moveError', () => {});
        
        // When a bone is drawn from boneyard
        socket.on('boneDrawn', (data: any) => {
            setDrawingBone(false);
            // If drawn bone is not playable, player needs to keep drawing
        });

        // When a player passes (shown to that player)
        socket.on('playerPassed', () => {
            setBlockedPopup(true);
            setTimeout(() => setBlockedPopup(false), 1200);
        });

        // Turn timer events
        socket.on('turnTimerStart', (data: any) => {
            setTimerSeconds(data.secondsLeft);
            setTimerTotal(data.secondsLeft);
        });

        socket.on('turnTimerTick', (data: any) => {
            setTimerSeconds(data.secondsLeft);
        });

        socket.on('playerAutoAction', (data: any) => {
            // Another player was auto-passed (timeout or bot pass)
        });

        return () => {
            socket.off('gameState');
            socket.off('moveError');
            socket.off('roundEnd');
            socket.off('matchOver');
            socket.off('boneDrawn');
            socket.off('playerPassed');
            socket.off('turnTimerStart');
            socket.off('turnTimerTick');
            socket.off('playerAutoAction');
        };
    }, [socket]);

    // Auto-detect when current player is blocked (no valid moves & deck empty)
    useEffect(() => {
        if (!gameState || !socket) return;
        if (gameState.turn !== socket.id) return;

        const board = gameState.board;
        const hand = gameState.hand;

        if (board.length === 0) return; // first move — always playable

        const leftEnd = board[0].left;
        const rightEnd = board[board.length - 1].right;

        const hasValidMove = hand.some((bone: any) =>
            bone.left === leftEnd || bone.right === leftEnd ||
            bone.left === rightEnd || bone.right === rightEnd
        );

        if (!hasValidMove && gameState.deckCount === 0) {
            // Player is blocked — show popup and auto-pass after delay
            setBlockedPopup(true);
            setTimeout(() => {
                setBlockedPopup(false);
                socket.emit('drawBone', room.id); // this will pass the turn
            }, 1500);
        }
    }, [gameState, socket, room.id]);

    const smartPlayBone = (bone: any) => {
        if (!gameState || !socket) return;
        if (gameState.board.length === 0) {
            socket.emit('playBone', { roomId: room.id, bone, end: 'right' });
            return;
        }
        const leftEnd = gameState.board[0].left;
        const rightEnd = gameState.board[gameState.board.length - 1].right;
        const canLeft = bone.left === leftEnd || bone.right === leftEnd;
        const canRight = bone.left === rightEnd || bone.right === rightEnd;
        if (canLeft && canRight && leftEnd !== rightEnd) {
            socket.emit('playBone', { roomId: room.id, bone, end: 'right' });
        } else if (canRight) {
            socket.emit('playBone', { roomId: room.id, bone, end: 'right' });
        } else if (canLeft) {
            socket.emit('playBone', { roomId: room.id, bone, end: 'left' });
        }
    };

    const drawBone = () => { setDrawingBone(true); socket.emit('drawBone', room.id); };
    const nextRound = () => socket.emit('nextRound', room.id);
    const handleLeaveGame = () => { socket.emit('leaveRoom'); navigate('/lobby'); };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        try { smartPlayBone(JSON.parse(e.dataTransfer.getData('text/plain'))); } catch {}
    };
    const handleDragStart = (e: React.DragEvent, bone: any) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(bone));
    };

    // Match Over
    if (matchOverData) {
        return (
            <div className="game-overlay">
                <div className="end-card match-end">
                    <Trophy size={56} className="trophy-icon" />
                    <h2>Match Over!</h2>
                    <h3>Winner: {room.players[matchOverData.winner]?.nickname}</h3>
                    <div className="final-scores">
                        {Object.entries(matchOverData.scores).map(([id, score]: any) => (
                            <div key={id} className="f-score">
                                <span>{room.players[id]?.nickname}</span>
                                <span>{score} pts</span>
                            </div>
                        ))}
                    </div>
                    <button className="primary-btn mt-4" onClick={() => navigate('/lobby')}>Return to Lobby</button>
                </div>
            </div>
        );
    }

    if (!gameState) return <div className="game-loading">Loading game state...</div>;

    const isMyTurn = gameState.turn === socket.id;
    const opponents = Object.entries(gameState.opponents) as [string, number][];
    const turnPlayerNick = isMyTurn ? 'You' : room.players[gameState.turn]?.nickname || '???';

    const seatPositions = ['seat-top', 'seat-left', 'seat-right'];

    return (
        <div className="gameplay-container">
            {/* Round Over */}
            {roundOverData && (
                <div className="game-overlay">
                    <div className="end-card round-end">
                        <h2>Round Ended</h2>
                        <p className="end-reason">{roundOverData.reason}</p>
                        <h3>Winner: {room.players[roundOverData.winner]?.nickname || 'None'}</h3>
                        <div className="current-scores">
                            <h4>Scoreboard</h4>
                            {Object.entries(roundOverData.scores).map(([id, score]: any) => (
                                <div key={id} className="c-score">
                                    <span>{room.players[id]?.nickname}</span>
                                    <span>{score} / {room.targetScore}</span>
                                </div>
                            ))}
                        </div>
                        {room.hostId === socket.id ? (
                            <button className="primary-btn mt-4" onClick={nextRound}>Start Next Round</button>
                        ) : (
                            <p className="waiting-host">Waiting for Host...</p>
                        )}
                    </div>
                </div>
            )}

            {/* Turn popup */}
            {turnPopup && (
                <div className={`turn-popup ${isMyTurn ? 'turn-popup-you' : ''}`}>
                    <div className="turn-popup-inner">
                        <div className="turn-popup-avatar">{turnPlayerNick.charAt(0).toUpperCase()}</div>
                        <span>{isMyTurn ? "Your Turn!" : `${turnPlayerNick}'s Turn`}</span>
                    </div>
                </div>
            )}

            {/* Blocked popup */}
            {blockedPopup && (
                <div className="blocked-popup">
                    <div className="blocked-popup-inner">
                        <span className="blocked-icon">🚫</span>
                        <span>Blocked! No valid moves. Passing turn...</span>
                    </div>
                </div>
            )}

            {/* Minimal header — no turn text */}
            <header className="game-header">
                <button className="leave-game-btn" onClick={handleLeaveGame} title="Leave Game">
                    <ArrowLeft size={18} />
                </button>
                <div className="gh-center-info">
                    <span className="mode-badge">{room.gameMode}</span>
                    <span className="deck-pill">🂠 {gameState.deckCount}</span>
                    <span className="target-pill">🏆 {room.targetScore}</span>
                </div>
                <div className="gh-actions">
                    {gameState.deckCount > 0 && isMyTurn && (
                        <button className="action-btn draw-btn" onClick={drawBone}>Draw</button>
                    )}
                    {isMyTurn && gameState.deckCount === 0 && (
                        <button className="action-btn pass-btn" onClick={drawBone}>
                            <SkipForward size={14}/> Pass
                        </button>
                    )}
                </div>
            </header>

            {/* TABLE with players around */}
            <div className="table-wrapper">
                {/* Opponent seats */}
                {opponents.map(([id, count], idx) => {
                    const player = room.players[id];
                    const isTurn = gameState.turn === id;
                    const pos = seatPositions[idx] || 'seat-top';
                    const colors = ['#26a5c9', '#e8a030', '#9c5ec4'];
                    const color = colors[idx % 3];
                    return (
                        <div key={id} className={`player-seat ${pos} ${isTurn ? 'is-active-turn' : ''}`}>
                            <div className="seat-avatar-wrap">
                                {isTurn && timerSeconds > 0 && (
                                    <svg className="timer-ring" viewBox="0 0 44 44">
                                        <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                        <circle cx="22" cy="22" r="19" fill="none"
                                            stroke={timerSeconds <= 3 ? '#e74c3c' : timerSeconds <= 5 ? '#e67e22' : '#27ae60'}
                                            strokeWidth="3"
                                            strokeDasharray={`${(timerSeconds / timerTotal) * 119.38} 119.38`}
                                            strokeLinecap="round"
                                            transform="rotate(-90 22 22)"
                                            style={{ transition: 'stroke-dasharray 0.9s linear' }}
                                        />
                                    </svg>
                                )}
                                <div className="seat-avatar" style={{ background: color }}>
                                    {player?.nickname?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                {isTurn && timerSeconds > 0 && (
                                    <span className="timer-text">{timerSeconds}</span>
                                )}
                            </div>
                            <div className="seat-meta">
                                <span className="seat-name">{player?.nickname}{player?.isBot ? ' 🤖' : ''}</span>
                                <span className="seat-detail">{count} · {gameState.scores[id] || 0}pts</span>
                            </div>
                            {isTurn && <div className="seat-turn-glow"></div>}
                        </div>
                    );
                })}

                {/* Board */}
                <div 
                    className={`board-area ${dragOver ? 'board-drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="board-scroll">
                        {gameState.board.length === 0 ? (
                            <div className="empty-board">
                                {isMyTurn ? 'Play a bone to start!' : 'Waiting...'}
                            </div>
                        ) : (
                            gameState.board.map((bone: any, idx: number) => (
                                <div key={idx} className="board-bone">
                                    <Domino bone={bone} isHorizontal />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* You — bottom */}
                <div className={`player-seat seat-bottom ${isMyTurn ? 'is-active-turn' : ''}`}>
                    <div className="seat-avatar-wrap">
                        {isMyTurn && timerSeconds > 0 && (
                            <svg className="timer-ring" viewBox="0 0 44 44">
                                <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                <circle cx="22" cy="22" r="19" fill="none"
                                    stroke={timerSeconds <= 3 ? '#e74c3c' : timerSeconds <= 5 ? '#e67e22' : '#27ae60'}
                                    strokeWidth="3"
                                    strokeDasharray={`${(timerSeconds / timerTotal) * 119.38} 119.38`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 22 22)"
                                    style={{ transition: 'stroke-dasharray 0.9s linear' }}
                                />
                            </svg>
                        )}
                        <div className="seat-avatar" style={{ background: '#e05080' }}>
                            {(user?.nickname || 'Y').charAt(0).toUpperCase()}
                        </div>
                        {isMyTurn && timerSeconds > 0 && (
                            <span className="timer-text">{timerSeconds}</span>
                        )}
                    </div>
                    <div className="seat-meta">
                        <span className="seat-name">You</span>
                        <span className="seat-detail">{gameState.hand.length} · {gameState.scores[socket.id] || 0}pts</span>
                    </div>
                    {isMyTurn && <div className="seat-turn-glow"></div>}
                </div>
            </div>

            {/* Hand */}
            <div className="player-area">
                <div className={`hand-tray ${isMyTurn ? 'hand-active' : ''}`}>
                    {gameState.hand.map((bone: any, idx: number) => (
                        <div 
                            key={idx} 
                            className={`hand-bone-wrapper ${isMyTurn ? 'draggable' : ''}`}
                            draggable={isMyTurn}
                            onDragStart={(e) => handleDragStart(e, bone)}
                        >
                            <Domino
                                bone={bone}
                                isInteractive={isMyTurn}
                                onClick={() => { if (isMyTurn) smartPlayBone(bone); }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
