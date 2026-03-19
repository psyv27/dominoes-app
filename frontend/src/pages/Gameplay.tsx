import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Domino from '../components/Domino';
import { TrophyOutlined, StepForwardOutlined, LogoutOutlined, LeftOutlined, SmileOutlined, MessageOutlined } from '@ant-design/icons';
import { Button, Tooltip, Avatar, Badge, Tag, Popconfirm } from 'antd';
import BoardLayout from '../components/BoardLayout';
import './Gameplay.css';

const ALL_SKINS: Record<string, { name: string; type: string; preview: string; color?: string; bg?: string }> = {
    classic: { name: 'Classic White', type: 'domino', preview: '#ffffff', color: '#000' },
    midnight: { name: 'Midnight Blue', type: 'domino', preview: '#1a237e', color: '#90caf9' },
    emerald: { name: 'Emerald Green', type: 'domino', preview: '#1b5e20', color: '#a5d6a7' },
    crimson: { name: 'Crimson Red', type: 'domino', preview: '#b71c1c', color: '#ef9a9a' },
    gold: { name: 'Royal Gold', type: 'domino', preview: '#f9a825', color: '#000' },
    purple: { name: 'Deep Purple', type: 'domino', preview: '#4a148c', color: '#ce93d8' },
    dark: { name: 'Slate Blue', type: 'table', preview: '', bg: '#344555' },
    felt: { name: 'Casino Felt', type: 'table', preview: '', bg: '#2b4f36' },
    ocean: { name: 'Deep Ocean', type: 'table', preview: '', bg: '#1c2e42' },
    sunset: { name: 'Sunset Amber', type: 'table', preview: '', bg: '#42281c' },
    royal: { name: 'Royal Velvet', type: 'table', preview: '', bg: '#281c42' },
    galaxy: { name: 'Galaxy', type: 'table', preview: '', bg: '#1c1c28' },
};

export default function Gameplay({ room }: any) {
    const { socket } = useSocket() as any;
    const { user } = useAuth() as any;
    const navigate = useNavigate();

    const [gameState, setGameState] = useState<any>(room.gameState || null);
    const [roundOverData, setRoundOverData] = useState<any>(null);
    const [matchOverData, setMatchOverData] = useState<any>(null);
    const [activeEmojis, setActiveEmojis] = useState<{ [id: string]: string }>({});
    const [showEmojiMenu, setShowEmojiMenu] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [turnPopup, setTurnPopup] = useState(false);
    const [blockedPopup, setBlockedPopup] = useState(false);
    const [mustDrawPopup, setMustDrawPopup] = useState(false);
    const [drawingBone, setDrawingBone] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerTotal, setTimerTotal] = useState(10);
    const [misdealPopup, setMisdealPopup] = useState<string | null>(null);
    const [quickMsgs, setQuickMsgs] = useState<string[]>([]);
    const [selectedBone, setSelectedBone] = useState<any>(null); // NEW: Track selected bone for drop zones
    const [activeStickers, setActiveStickers] = useState<{ [id: string]: { id: string, url?: string } }>({});
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [customStickers, setCustomStickers] = useState<any[]>([]);
    const STICKERS = ['happy', 'angry', 'shocked', 'sad', 'laughing', 'cool', 'winking'];
    const prevTurnRef = useRef<string | null>(null);
    const misdealShownRef = useRef(false);

    // ── Dealing Phase State ──────────────────────────────────────
    const [dealPhase, setDealPhase] = useState<'none' | 'dealing' | 'misdeal' | 'complete'>('none');
    const [dealDeck, setDealDeck] = useState<any[]>([]);           // 28 face-down tiles
    const [dealtTiles, setDealtTiles] = useState<Set<number>>(new Set()); // indices being dealt
    const [dealingToPlayer, setDealingToPlayer] = useState<string | null>(null);
    const [misdealRevealData, setMisdealRevealData] = useState<any>(null);

    useEffect(() => {
        // Fetch custom quick messages from admin panel
        fetch('http://localhost:5001/api/predefined-messages')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) setQuickMsgs(data);
                else setQuickMsgs(['Good luck!', 'Bravo!', 'Thanks!', 'Oops!', '😂', '😡', '🔥', '🤔']);
            })
            .catch(() => setQuickMsgs(['Good luck!', 'Bravo!', 'Thanks!', 'Oops!', '😂', '😡', '🔥', '🤔']));
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('gameState', (state: any) => {
            setGameState(state);
            if (state.state === 'playing') {
                setRoundOverData(null);
                setMatchOverData(null);
            }

            // Show misdeal popup once when game starts with re-deals
            if (state.misdealCount > 0 && !misdealShownRef.current) {
                misdealShownRef.current = true;
                setMisdealPopup(`Misdeal detected! Re-dealt ${state.misdealCount} time${state.misdealCount > 1 ? 's' : ''}.`);
                setTimeout(() => setMisdealPopup(null), 3500);
            }

            // Show turn popup when turn changes
            if (state.turn !== prevTurnRef.current) {
                prevTurnRef.current = state.turn;
                setTurnPopup(true);
                setTimeout(() => setTurnPopup(false), 1800);
            }
        });

        socket.on('roundEnd', (data: any) => setRoundOverData(data));
        socket.on('matchOver', (data: any) => setMatchOverData(data));
        socket.on('moveError', () => { });

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

        socket.on('roomDestroyed', (msg: string) => {
            alert(msg || 'Host has left. Room closed.');
            navigate('/lobby');
        });

        socket.on('matchAborted', (msg: string) => {
            alert(msg || 'Player disconnected. Match aborted.');
            if (room?.id) {
                navigate(`/room/${room.id}`);
            } else {
                navigate('/lobby');
            }
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

        socket.on('emojiReceived', (data: any) => {
            setActiveEmojis(prev => ({ ...prev, [data.senderId]: data.emoji }));
            setTimeout(() => {
                setActiveEmojis(prev => {
                    const next = { ...prev };
                    delete next[data.senderId];
                    return next;
                });
            }, 3000);
        });

        socket.on('stickerReceived', (data: any) => {
            setActiveStickers(prev => ({ ...prev, [data.senderId]: { id: data.stickerId, url: data.stickerUrl } }));
            setTimeout(() => {
                setActiveStickers(prev => {
                    const next = { ...prev };
                    delete next[data.senderId];
                    return next;
                });
            }, 4000); // stickers last a bit longer
        });

        // ── Dealing Phase Events ─────────────────────────────────
        socket.on('dealPhaseStart', (data: any) => {
            setDealPhase('dealing');
            setDealDeck(data.fullDeck);
            setDealtTiles(new Set());
            setMisdealRevealData(null);
            setGameState(null); // clear previous game state during deal
        });

        socket.on('dealTile', (data: any) => {
            setDealtTiles(prev => new Set([...prev, data.tileIndex]));
            setDealingToPlayer(data.toPlayer);
            setTimeout(() => setDealingToPlayer(null), 150);
        });

        socket.on('misdealReveal', (data: any) => {
            setDealPhase('misdeal');
            setMisdealRevealData(data);
        });

        socket.on('dealComplete', () => {
            setDealPhase('complete');
            // After boneyard formation animation, switch to normal play
            setTimeout(() => setDealPhase('none'), 1500);
        });

        return () => {
            socket.off('gameState');
            socket.off('moveError');
            socket.off('roundEnd');
            socket.off('matchOver');
            socket.off('boneDrawn');
            socket.off('playerPassed');
            socket.off('roomDestroyed');
            socket.off('matchAborted');
            socket.off('turnTimerStart');
            socket.off('turnTimerTick');
            socket.off('playerAutoAction');
            socket.off('emojiReceived');
            socket.off('stickerReceived');
            socket.off('availableStickers');
            socket.off('dealPhaseStart');
            socket.off('dealTile');
            socket.off('misdealReveal');
            socket.off('dealComplete');
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        socket.on('availableStickers', (stickers: any[]) => {
            setCustomStickers(stickers);
        });
        socket.emit('getAvailableStickers');
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

        if (!hasValidMove) {
            if (gameState.deckCount === 0) {
                // Player is blocked — show popup and auto-pass after delay
                setBlockedPopup(true);
                setTimeout(() => {
                    setBlockedPopup(false);
                    socket.emit('drawBone', room.id); // this will pass the turn
                }, 1500);
            } else {
                setMustDrawPopup(true);
            }
        } else {
            setMustDrawPopup(false);
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

        if (!canLeft && !canRight) return; // Prevent playing unplayable bone

        if (canLeft && canRight && leftEnd !== rightEnd) {
            socket.emit('playBone', { roomId: room.id, bone, end: 'right' });
        } else if (canRight) {
            socket.emit('playBone', { roomId: room.id, bone, end: 'right' });
        } else if (canLeft) {
            socket.emit('playBone', { roomId: room.id, bone, end: 'left' });
        }
    };

    const drawBone = (boneyardIndex?: number) => {
        setDrawingBone(true);
        if (typeof boneyardIndex === 'number') {
            socket.emit('drawBone', { roomId: room.id, boneyardIndex });
        } else {
            socket.emit('drawBone', room.id);
        }
    };
    const nextRound = () => socket.emit('nextRound', room.id);
    const handleLeaveGame = () => { socket.emit('leaveRoom'); navigate('/lobby'); };

    const handleSendSticker = (stickerId: string) => {
        if (socket && room) {
            socket.emit('sendSticker', { roomId: room.id, stickerId, senderId: socket.id });
            setShowStickerPicker(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, bone: any) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(bone));
        setSelectedBone(bone);
    };

    const handleBoneSelect = (bone: any) => {
        if (!isMyTurn) return;
        // Toggle off if already selected
        if (selectedBone && selectedBone.left === bone.left && selectedBone.right === bone.right) {
            setSelectedBone(null);
            return;
        }

        // Check if playable
        if (gameState.board.length === 0) {
            // Can play anywhere
            socket.emit('playBone', { roomId: room.id, bone, end: 'right' });
            setSelectedBone(null);
            return;
        }

        const leftEnd = gameState.board[0].left;
        const rightEnd = gameState.board[gameState.board.length - 1].right;
        const canLeft = bone.left === leftEnd || bone.right === leftEnd;
        const canRight = bone.left === rightEnd || bone.right === rightEnd;

        if (!canLeft && !canRight) return;

        // Show the highlighted drop zones so the user can manually click or drop it
        setSelectedBone(bone);
    };

    const handlePlayLeft = () => {
        if (selectedBone) socket.emit('playBone', { roomId: room.id, bone: selectedBone, end: 'left' });
        setSelectedBone(null);
    };

    const handlePlayRight = () => {
        if (selectedBone) socket.emit('playBone', { roomId: room.id, bone: selectedBone, end: 'right' });
        setSelectedBone(null);
    };

    const handleDropLeft = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        try {
            const bone = JSON.parse(e.dataTransfer.getData('text/plain'));
            socket.emit('playBone', { roomId: room.id, bone, end: 'left' });
        } catch { }
        setSelectedBone(null);
    };

    const handleDropRight = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        try {
            const bone = JSON.parse(e.dataTransfer.getData('text/plain'));
            socket.emit('playBone', { roomId: room.id, bone, end: 'right' });
        } catch { }
        setSelectedBone(null);
    };

    const sendEmoji = (emoji: string) => {
        socket.emit('sendEmoji', { roomId: room.id, emoji, senderId: socket.id });
        setShowEmojiMenu(false);
    };

    // Match Over
    if (matchOverData) {
        return (
            <div className="game-overlay">
                <div className="end-card match-end">
                    <TrophyOutlined style={{ fontSize: 56, color: '#f9a825', marginBottom: '1rem' }} />
                    <h2>Match Over!</h2>
                    <h3>Winner: {room.players[matchOverData.winner]?.nickname || matchOverData.winner || 'Unknown'}</h3>
                    <div className="final-scores">
                        {Object.keys(room.players).map((id: string) => {
                            const score = matchOverData.scores[id] || 0;
                            return (
                                <div key={id} className={`f-score ${id === matchOverData.winner ? 'f-winner' : 'f-loser'}`}>
                                    <span>
                                        {id === matchOverData.winner ? '🏆 ' : '💀 '}
                                        {room.players[id]?.nickname}
                                        <span style={{ fontSize: '0.7rem', marginLeft: '5px', opacity: 0.7 }}>
                                            ({id === matchOverData.winner ? 'Winner' : 'Loser'})
                                        </span>
                                    </span>
                                    <span>{score} {matchOverData.formatWins ? 'wins' : 'pts'}</span>
                                </div>
                            );
                        })}
                    </div>
                    <button className="primary-btn mt-4" onClick={handleLeaveGame}>Return to Lobby</button>
                </div>
            </div>
        );
    }

    // Show dealing overlay during deal phase (before gameState arrives)
    if (dealPhase === 'dealing' || dealPhase === 'misdeal' || dealPhase === 'complete') {
        return (
            <div className="gameplay-container">
                <div className="table-wrapper" style={{ background: 'radial-gradient(circle, #111118, #050508)' }}>
                    {/* Dealing Phase Overlay */}
                    {dealPhase === 'dealing' && (
                        <div className="deal-overlay">
                            <h2 className="deal-title">Dealing Tiles...</h2>
                            <div className="deal-table-grid">
                                {dealDeck.map((tile: any, idx: number) => {
                                    const isTaken = dealtTiles.has(tile.index);
                                    const isBeingDealt = dealingToPlayer && isTaken;
                                    return (
                                        <div
                                            key={idx}
                                            className={`deal-tile ${isTaken ? 'deal-tile-taken' : ''} ${isBeingDealt ? 'deal-tile-flash' : ''}`}
                                        >
                                            <Domino bone={tile} faceDown skinColor="#1f2937" />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="deal-progress">
                                <div className="deal-progress-bar" style={{ width: `${(dealtTiles.size / dealDeck.length) * 100}%` }}></div>
                            </div>
                            <p className="deal-counter">{dealtTiles.size} / {dealDeck.length} tiles dealt</p>
                        </div>
                    )}

                    {/* Misdeal Reveal Overlay */}
                    {dealPhase === 'misdeal' && misdealRevealData && (
                        <div className="misdeal-overlay">
                            <div className="misdeal-card glass-effect">
                                <h2 className="misdeal-title">🔄 Misdeal Detected!</h2>
                                <p className="misdeal-reason">{misdealRevealData.reason}</p>
                                <p className="misdeal-subtitle">Invalid hand revealed:</p>
                                <div className="misdeal-hand-reveal">
                                    {misdealRevealData.hand.map((bone: any, idx: number) => (
                                        <div key={idx} className="misdeal-tile-reveal" style={{ animationDelay: `${idx * 0.1}s` }}>
                                            <Domino bone={bone} />
                                        </div>
                                    ))}
                                </div>
                                <p className="misdeal-reshuffling">Reshuffling &amp; re-dealing...</p>
                            </div>
                        </div>
                    )}

                    {/* Deal Complete — brief transition */}
                    {dealPhase === 'complete' && (
                        <div className="deal-overlay deal-complete-overlay">
                            <h2 className="deal-title deal-complete-title">Let's Play! 🎲</h2>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!gameState) return (
        <div className="game-loading">
            <div className="loading-spinner"></div>
            <span>Preparing the table...</span>
        </div>
    );

    const isMyTurn = gameState.turn === socket.id;
    const opponents = Object.entries(gameState.opponents) as [string, number][];
    const turnPlayerNick = isMyTurn ? 'You' : room.players[gameState.turn]?.nickname || '???';
    const boneyard: any[] = gameState.boneyard || [];

    // Determine if player needs to draw (no valid moves + deck > 0)
    const needsToDraw = (() => {
        if (!isMyTurn || gameState.board.length === 0) return false;
        const leftEnd = gameState.board[0].left;
        const rightEnd = gameState.board[gameState.board.length - 1].right;
        const hasValidMove = gameState.hand.some((bone: any) =>
            bone.left === leftEnd || bone.right === leftEnd ||
            bone.left === rightEnd || bone.right === rightEnd
        );
        return !hasValidMove && gameState.deckCount > 0;
    })();

    const seatPositions = ['seat-top', 'seat-left', 'seat-right'];

    // Resolve personal cosmetics (fallback to local if user undefined in room)
    const myPlayerInfo = room.players[socket.id] || { equippedSkins: { domino: 'classic', table: 'dark' } };
    const mySkins = myPlayerInfo.equippedSkins || { domino: 'classic', table: 'dark' };
    const tableSkin = ALL_SKINS[mySkins.table] || ALL_SKINS['dark'];
    const myDominoSkin = ALL_SKINS[mySkins.domino] || ALL_SKINS['classic'];

    return (
        <div className="gameplay-container">
            {/* Round Over */}
            {roundOverData && (
                <div className="game-overlay">
                    <div className="end-card round-end">
                        <h2>Round Ended</h2>
                        <p className="end-reason">{roundOverData.reason}</p>
                        <h3>Winner: {room.players[roundOverData.winner]?.nickname || roundOverData.winner || 'None'}</h3>
                        <div className="current-scores">
                            <h4>{roundOverData.roundWins ? 'Wins' : 'Points'}</h4>
                            {Object.keys(room.players).map((id: string) => {
                                const statsSrc = roundOverData.roundWins || roundOverData.scores;
                                const score = statsSrc[id] || 0;
                                return (
                                    <div key={id} className={`c-score ${id === roundOverData.winner ? 'c-winner' : 'c-loser'}`}>
                                        <div className="c-score-info">
                                            <span>
                                                {id === roundOverData.winner ? '🏆 ' : '💀 '}
                                                {room.players[id]?.nickname}
                                                <span style={{ fontSize: '0.7rem', marginLeft: '5px', opacity: 0.7 }}>
                                                    ({id === roundOverData.winner ? 'Winner' : 'Loser'})
                                                </span>
                                            </span>
                                            {room.matchFormat === 'Score' ? (
                                                <span>{score} / {room.targetScore}</span>
                                            ) : (
                                                <span>{score}</span>
                                            )}
                                        </div>

                                        {/* Revealed tiles for this player */}
                                        {roundOverData.allHands && roundOverData.allHands[id] && roundOverData.allHands[id].length > 0 && (
                                            <div className="revealed-tiles">
                                                {roundOverData.allHands[id].map((bone: any, bIdx: number) => (
                                                    <div key={bIdx} className="revealed-bone-mini">
                                                        <Domino bone={bone} isHorizontal={false} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {roundOverData.allHands && (!roundOverData.allHands[id] || roundOverData.allHands[id].length === 0) && (
                                            <div className="no-tiles-left">Domino!</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {room.hostId === socket.id ? (
                            <button className="primary-btn mt-4" onClick={nextRound}>Start Next Round</button>
                        ) : (
                            <p className="waiting-host">Waiting for Host...</p>
                        )}
                        <button className="primary-btn mt-2" style={{ background: '#e74c3c' }} onClick={handleLeaveGame}>Back to Lobby</button>
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

            {/* Must Draw popup */}
            {mustDrawPopup && isMyTurn && (
                <div className="blocked-popup" style={{ background: 'rgba(230, 126, 34, 0.95)' }}>
                    <div className="blocked-popup-inner" style={{ background: 'transparent', boxShadow: 'none' }}>
                        <span className="blocked-icon">⚠️</span>
                        <span>No playable bones! Draw from boneyard.</span>
                    </div>
                </div>
            )}

            {/* Misdeal popup */}
            {misdealPopup && (
                <div className="blocked-popup" style={{ background: 'rgba(155, 89, 182, 0.95)' }}>
                    <div className="blocked-popup-inner" style={{ background: 'transparent', boxShadow: 'none' }}>
                        <span className="blocked-icon">🔄</span>
                        <span>{misdealPopup}</span>
                    </div>
                </div>
            )}

            {/* Minimal header — no turn text */}
            <header className="game-header">
                <Button type="text" danger icon={<LeftOutlined />} onClick={handleLeaveGame} title="Leave Game" />
                <div className="gh-center-info">
                    <span className="mode-badge">{room.gameMode}</span>
                    <span className="deck-pill">🂠 {gameState.deckCount}</span>
                    <span className="target-pill">
                        🏆 {room.matchFormat === 'Score' ? room.targetScore : room.matchFormat}
                    </span>
                </div>
                <div className="gh-actions">
                    {isMyTurn && gameState.deckCount === 0 && (
                        <Button danger type="primary" shape="round" icon={<StepForwardOutlined />} onClick={() => drawBone()} style={{ fontWeight: 700, padding: '0 24px', height: 44 }}>
                            Pass Turn
                        </Button>
                    )}
                </div>
            </header>

            {/* TABLE with players around */}
            <div className="table-wrapper" style={{ background: tableSkin.bg || 'radial-gradient(circle, #111118, #050508)' }}>
                {/* Opponent seats */}
                {opponents.map(([id, count], idx) => {
                    const player = room.players[id];
                    const isTurn = gameState.turn === id;
                    const pos = seatPositions[idx] || 'seat-top';
                    const colors = ['#26a5c9', '#e8a030', '#9c5ec4'];
                    const color = colors[idx % 3];

                    const oppSkinData = player?.equippedSkins?.domino ? ALL_SKINS[player.equippedSkins.domino] : ALL_SKINS['classic'];
                    return (
                        <div key={id} className={`player-seat ${pos} ${isTurn ? 'is-active-turn' : ''}`}>
                            {activeEmojis[id] && <div className={`emoji-bubble ${id === socket.id ? 'user-bubble' : ''}`}>{activeEmojis[id]}</div>}
                            {activeStickers[id] && (
                                <div className={`sticker-bubble ${id === socket.id ? 'user-sticker' : ''}`}>
                                    <img src={activeStickers[id].url || `/stickers/${activeStickers[id].id}.png`} alt="sticker" />
                                </div>
                            )}
                            <div className="seat-avatar-wrap">
                                {isTurn && timerSeconds > 0 && (
                                    <svg className="timer-ring" viewBox="0 0 54 54">
                                        <circle cx="27" cy="27" r="23" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                        <circle cx="27" cy="27" r="23" fill="none"
                                            stroke={timerSeconds <= 3 ? 'var(--danger)' : timerSeconds <= 5 ? 'var(--accent)' : 'var(--primary)'}
                                            strokeWidth="4"
                                            strokeDasharray={`${(timerSeconds / timerTotal) * 144.5} 144.5`}
                                            strokeLinecap="round"
                                            transform="rotate(-90 27 27)"
                                            style={{ transition: 'stroke-dasharray 0.9s linear' }}
                                        />
                                    </svg>
                                )}
                                <div className="avatar-circle-main" style={{ background: color }}>
                                    {player?.nickname?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                {isTurn && timerSeconds > 0 && (
                                    <span className="timer-text-pill">{timerSeconds}s</span>
                                )}
                            </div>
                            <div className="seat-meta">
                                <span className="seat-name">{player?.nickname}{player?.isBot ? ' 🤖' : ''}</span>
                                <span className="seat-detail">
                                    {room.matchFormat === 'Score' ? `${gameState.scores[id] || 0}pts` : `${roundOverData?.roundWins?.[id] || 0} wins`}
                                </span>
                            </div>

                            {/* Opponent Hand Display */}
                            <div className={`opponent-hand opp-hand-${idx}`}>
                                {Array.from({ length: count }).map((_, i) => (
                                    <div key={i} className="opp-bone-wrap">
                                        <Domino
                                            bone={{ left: 0, right: 0 }}
                                            faceDown
                                            skinColor={player?.botColor || oppSkinData?.preview || '#1f2937'}
                                        />
                                    </div>
                                ))}
                            </div>

                            {activeEmojis[id] && (
                                <div className="emoji-bubble">{activeEmojis[id]}</div>
                            )}
                            {activeStickers[id] && (
                                <div className="sticker-bubble">
                                    <img src={activeStickers[id].url || `/stickers/${activeStickers[id].id}.png`} alt="sticker" />
                                </div>
                            )}
                            {isTurn && <div className="seat-turn-glow"></div>}
                        </div>
                    );
                })}

                {/* Board Layout (Snake Algorithm) */}
                <BoardLayout
                    board={gameState.board}
                    selectedBone={selectedBone}
                    isMyTurn={isMyTurn}
                    onPlayLeft={handlePlayLeft}
                    onPlayRight={handlePlayRight}
                    onDropLeft={handleDropLeft}
                    onDropRight={handleDropRight}
                />

                {/* You — bottom */}
                <div className={`player-seat seat-bottom ${isMyTurn ? 'is-active-turn' : ''}`}>
                    <div className="seat-avatar-wrap">
                        {isMyTurn && timerSeconds > 0 && (
                            <svg className="timer-ring" viewBox="0 0 54 54">
                                <circle cx="27" cy="27" r="23" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                <circle cx="27" cy="27" r="23" fill="none"
                                    stroke={timerSeconds <= 3 ? 'var(--danger)' : timerSeconds <= 5 ? 'var(--accent)' : 'var(--primary)'}
                                    strokeWidth="4"
                                    strokeDasharray={`${(timerSeconds / timerTotal) * 144.5} 144.5`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 27 27)"
                                    style={{ transition: 'stroke-dasharray 0.9s linear' }}
                                />
                            </svg>
                        )}
                        <div className="avatar-circle-main" style={{ background: '#6366f1' }}>
                            {(user?.nickname || 'Y').charAt(0).toUpperCase()}
                        </div>
                        {isMyTurn && timerSeconds > 0 && (
                            <span className="timer-text-pill">{timerSeconds}s</span>
                        )}
                    </div>
                    <div className="seat-meta">
                        <span className="seat-name">You</span>
                        <span className="seat-detail">
                            {room.matchFormat === 'Score' ? `${gameState.scores[socket.id] || 0}pts` : `${roundOverData?.roundWins?.[socket.id] || 0} wins`}
                        </span>
                    </div>
                    {activeEmojis[socket.id] && (
                        <div className="emoji-bubble user-bubble">{activeEmojis[socket.id]}</div>
                    )}
                    {activeStickers[socket.id] && (
                        <div className="sticker-bubble user-sticker">
                            <img src={activeStickers[socket.id].url || `/stickers/${activeStickers[socket.id].id}.png`} alt="sticker" />
                        </div>
                    )}
                    {isMyTurn && <div className="seat-turn-glow"></div>}
                </div>
            </div>

            {/* Boneyard — Expands to interactive grid when drawing */}
            {boneyard.length > 0 && needsToDraw && (
                <div className={`boneyard-section boneyard-expanded`}>
                    <p className="boneyard-instruction">🎯 Click a tile to draw from the boneyard</p>
                    <div className="boneyard-row boneyard-grid-view">
                        {boneyard.map((tile: any, idx: number) => (
                            <div
                                key={idx}
                                className={`boneyard-tile ${tile.taken ? 'boneyard-taken' : ''} ${needsToDraw && !tile.taken ? 'boneyard-clickable boneyard-pulse' : ''}`}
                                onClick={() => {
                                    if (needsToDraw && !tile.taken) {
                                        drawBone(tile.index);
                                    }
                                }}
                            >
                                <Domino bone={{ left: tile.left, right: tile.right }} faceDown skinColor="#1f2937" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hand */}
            <div className="player-area">
                <div className={`hand-tray ${isMyTurn ? 'hand-active' : ''}`}>
                    {gameState.hand.map((bone: any, idx: number) => {
                        let isPlayable = true;
                        if (gameState.board.length > 0) {
                            const leftEnd = gameState.board[0].left;
                            const rightEnd = gameState.board[gameState.board.length - 1].right;
                            isPlayable = bone.left === leftEnd || bone.right === leftEnd || bone.left === rightEnd || bone.right === rightEnd;
                        }

                        const isSelected = selectedBone && selectedBone.left === bone.left && selectedBone.right === bone.right;

                        return (
                            <div
                                key={idx}
                                className={`hand-bone-wrapper ${isMyTurn && isPlayable ? 'draggable' : ''} ${isMyTurn && !isPlayable ? 'unplayable-bone' : ''} ${isSelected ? 'selected' : ''}`}
                                draggable={isMyTurn && isPlayable}
                                onDragStart={(e) => isMyTurn && isPlayable && handleDragStart(e, bone)}
                                onDragEnd={() => setSelectedBone(null)}
                            >
                                <Domino
                                    bone={bone}
                                    isInteractive={isMyTurn && isPlayable}
                                    onClick={() => handleBoneSelect(bone)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Chat Menu */}
            <div className="quick-chat-container">
                <button
                    className="quick-chat-toggle"
                    onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiMenu(false); }}
                    title="Send Sticker"
                >
                    😊
                </button>
                <button
                    className="quick-chat-toggle"
                    onClick={() => { setShowEmojiMenu(!showEmojiMenu); setShowStickerPicker(false); }}
                    title="Quick Chat"
                >
                    💬
                </button>
                {showEmojiMenu && (
                    <div className="quick-chat-menu">
                        {quickMsgs.map((msg, i) => (
                            <button key={i} className="qc-btn" onClick={() => sendEmoji(msg)}>
                                {msg}
                            </button>
                        ))}
                    </div>
                )}
                {showStickerPicker && (
                    <div className="quick-chat-menu sticker-menu" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                        {STICKERS.map((stk) => (
                            <button key={stk} className="qc-btn sticker-btn" onClick={() => handleSendSticker(stk)} style={{ padding: '4px', background: 'transparent' }}>
                                <img src={`/stickers/${stk}.png`} alt={stk} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            </button>
                        ))}
                        {customStickers.map((stk) => (
                            <button key={stk.id} className="qc-btn sticker-btn" onClick={() => handleSendSticker(stk.id)} style={{ padding: '4px', background: 'transparent' }} title={stk.name}>
                                <img src={stk.url} alt={stk.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
