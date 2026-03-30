import { useState, useEffect, useRef, useCallback } from 'react';
import Domino from './Domino';
import './DealingBoard.css';

interface DealOrder {
    tileIndex: number;
    toPlayer: string;
    dealStep: number;
}

interface DealingBoardProps {
    fullDeck: { left: number; right: number; index: number }[];
    dealOrder: DealOrder[];
    playerOrder: string[];
    localPlayerId: string;
    onComplete: () => void;
}

/* ─── Player seat positions (% of viewport) ─── */
const SEAT_POSITIONS: Record<string, { x: number; y: number }> = {
    top:    { x: 50, y: 8 },
    left:   { x: 8,  y: 50 },
    right:  { x: 92, y: 50 },
    bottom: { x: 50, y: 88 },
};

function getSeatKey(playerIndex: number, totalPlayers: number): string {
    // Local player is always "bottom", opponents fill top → left → right
    const seatMap: Record<number, string[]> = {
        2: ['top'],
        3: ['top', 'left'],
        4: ['top', 'left', 'right'],
    };
    const slots = seatMap[totalPlayers] || ['top'];
    return slots[playerIndex] || 'top';
}

/* ─── Tile state machine ─── */
type TilePhase = 'spawning' | 'idle' | 'lifting' | 'flying' | 'landed';

interface TileState {
    phase: TilePhase;
    targetX: number;
    targetY: number;
    isLocal: boolean;
    flipped: boolean;
}

export default function DealingBoard({
    fullDeck,
    dealOrder,
    playerOrder,
    localPlayerId,
    onComplete,
}: DealingBoardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const completedRef = useRef(false);

    // Build a map: playerOrder index → seat position (vw/vh percentages)
    const playerSeats = useRef<Record<string, { x: number; y: number }>>({});

    useEffect(() => {
        const localIdx = playerOrder.indexOf(localPlayerId);
        const seats: Record<string, { x: number; y: number }> = {};
        seats[localPlayerId] = SEAT_POSITIONS.bottom;

        let oppIdx = 0;
        playerOrder.forEach((pid, i) => {
            if (pid === localPlayerId) return;
            const key = getSeatKey(oppIdx, playerOrder.length);
            seats[pid] = SEAT_POSITIONS[key];
            oppIdx++;
        });

        playerSeats.current = seats;
    }, [playerOrder, localPlayerId]);

    /* ─── Ring geometry ─── */
    const RING_RADIUS = 160;
    const ringPositions = fullDeck.map((_, i) => {
        const angle = (i / fullDeck.length) * Math.PI * 2 - Math.PI / 2;
        return {
            x: Math.cos(angle) * RING_RADIUS,
            y: Math.sin(angle) * RING_RADIUS,
        };
    });

    /* ─── Tile states ─── */
    const [tileStates, setTileStates] = useState<Record<number, TileState>>(() => {
        const initial: Record<number, TileState> = {};
        fullDeck.forEach((tile) => {
            initial[tile.index] = {
                phase: 'spawning',
                targetX: 0,
                targetY: 0,
                isLocal: false,
                flipped: false,
            };
        });
        return initial;
    });

    /* ─── Phase 0: Spawn tiles into the ring with stagger ─── */
    useEffect(() => {
        fullDeck.forEach((tile, i) => {
            setTimeout(() => {
                setTileStates(prev => ({
                    ...prev,
                    [tile.index]: { ...prev[tile.index], phase: 'idle' },
                }));
            }, 30 + i * 25); // rapid stagger spawn
        });
    }, []);

    /* ─── Compute fly target in px relative to the ring center ─── */
    const getFlyTarget = useCallback((playerId: string): { x: number; y: number } => {
        const seat = playerSeats.current[playerId] || SEAT_POSITIONS.top;
        // Convert vw/vh to px offset from center of viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const targetPx = {
            x: (seat.x / 100) * vw - vw / 2,
            y: (seat.y / 100) * vh - vh / 2,
        };
        return targetPx;
    }, []);

    /* ─── Phase 1-3: Staggered overlapping dealing ─── */
    useEffect(() => {
        if (!dealOrder || dealOrder.length === 0) return;

        const STAGGER_MS = 280; // overlap interval — tile N+1 starts before tile N finishes
        const LIFT_DURATION = 160;
        const FLY_DELAY = LIFT_DURATION;

        dealOrder.forEach((deal, i) => {
            const startTime = 900 + i * STAGGER_MS; // 900ms initial wait for ring spawn

            // Lift
            setTimeout(() => {
                setTileStates(prev => ({
                    ...prev,
                    [deal.tileIndex]: {
                        ...prev[deal.tileIndex],
                        phase: 'lifting',
                        isLocal: deal.toPlayer === localPlayerId,
                    },
                }));
            }, startTime);

            // Fly
            setTimeout(() => {
                const target = getFlyTarget(deal.toPlayer);
                setTileStates(prev => ({
                    ...prev,
                    [deal.tileIndex]: {
                        ...prev[deal.tileIndex],
                        phase: 'flying',
                        targetX: target.x,
                        targetY: target.y,
                    },
                }));
            }, startTime + FLY_DELAY);

            // Land + optional flip
            setTimeout(() => {
                setTileStates(prev => ({
                    ...prev,
                    [deal.tileIndex]: {
                        ...prev[deal.tileIndex],
                        phase: 'landed',
                        flipped: deal.toPlayer === localPlayerId,
                    },
                }));
            }, startTime + FLY_DELAY + 550);
        });

        // Signal completion after last tile
        const totalDuration = 900 + dealOrder.length * STAGGER_MS + LIFT_DURATION + 550 + 400;
        setTimeout(() => {
            if (!completedRef.current) {
                completedRef.current = true;
                onComplete();
            }
        }, totalDuration);
    }, [dealOrder, localPlayerId, getFlyTarget, onComplete]);

    /* ─── Render ─── */
    return (
        <div className="deal-arena" ref={containerRef}>
            <div className="deal-ring">
                {fullDeck.map((tile, i) => {
                    const state = tileStates[tile.index];
                    if (!state) return null;

                    const ringPos = ringPositions[i];

                    // Compute the transform based on phase
                    let transformStr: string;
                    switch (state.phase) {
                        case 'spawning':
                            transformStr = `translate(-50%, -50%) translate(0px, 0px) scale(0.3)`;
                            break;
                        case 'idle':
                        case 'lifting':
                            transformStr = `translate(-50%, -50%) translate(${ringPos.x}px, ${ringPos.y}px)`;
                            break;
                        case 'flying':
                            transformStr = `translate(-50%, -50%) translate(${state.targetX}px, ${state.targetY}px)`;
                            break;
                        case 'landed':
                            transformStr = `translate(-50%, -50%) translate(${state.targetX}px, ${state.targetY}px)`;
                            break;
                        default:
                            transformStr = `translate(-50%, -50%)`;
                    }

                    const phaseClass = state.phase;
                    const flipClass = state.flipped ? 'flip-reveal' : '';

                    return (
                        <div
                            key={tile.index}
                            className={`deal-ring-tile ${phaseClass} ${flipClass}`}
                            style={{ transform: transformStr }}
                        >
                            <div className="deal-tile-inner">
                                {/* Back (face-down) — always visible unless flipped */}
                                <div className="deal-tile-face">
                                    <Domino bone={tile} faceDown skinColor="#1f2937" />
                                </div>
                                {/* Front (face-up) — only for local player after flip */}
                                <div className="deal-tile-back">
                                    <Domino bone={tile} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Player seat targets (subtle indicators) */}
            {playerOrder.map((pid, i) => {
                const seat = playerSeats.current[pid];
                if (!seat) return null;
                return (
                    <div
                        key={pid}
                        className="deal-player-target"
                        style={{
                            left: `${seat.x}%`,
                            top: `${seat.y}%`,
                        }}
                    >
                        {pid === localPlayerId ? 'You' : `P${i + 1}`}
                    </div>
                );
            })}

            <div className="deal-status">Dealing tiles...</div>
        </div>
    );
}
