import React, { useMemo, useState, useRef, useEffect } from 'react';
import Domino from './Domino';

interface BoardLayoutProps {
    board: any[];
    selectedBone: any;
    isMyTurn: boolean;
    onPlayLeft: () => void;
    onPlayRight: () => void;
    onDropLeft: (e: React.DragEvent) => void;
    onDropRight: (e: React.DragEvent) => void;
}

export default function BoardLayout({ board, selectedBone, isMyTurn, onPlayLeft, onPlayRight, onDropLeft, onDropRight }: BoardLayoutProps) {
    
    // --- Camera State ---
    const [zoom, setZoom] = useState(0.75);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastPan = useRef({ x: 0, y: 0 });
    
    // --- Mobile Responsive Dimensions ---
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY * -0.001;
        setZoom(prev => Math.min(Math.max(0.25, prev + delta), 2.5));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('.abs-bone') || (e.target as HTMLElement).closest('.abs-drop-zone')) return;
        isDragging.current = true;
        lastPan.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        setPan(prev => ({
            x: prev.x + (e.clientX - lastPan.current.x),
            y: prev.y + (e.clientY - lastPan.current.y)
        }));
        lastPan.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    };

    // --- Bi-Directional Stable Tracking ---
    const prevBoard = useRef<any[]>([]);
    const [rootOffset, setRootOffset] = useState(0);
    const [newTileIdx, setNewTileIdx] = useState<number | null>(null);

    useEffect(() => {
        const cur = board;
        const prev = prevBoard.current;

        if (cur.length === 0) {
            setRootOffset(0);
            setNewTileIdx(null);
        } else if (prev.length > 0 && cur.length > prev.length) {
            // Determine if tile was added to left or right
            const oldFirst = prev[0];
            const newSecond = cur[1];
            
            // Heuristic: If old board[0] matches new board[1], it was added to the left.
            const addedLeft = oldFirst && newSecond && oldFirst.left === newSecond.left && oldFirst.right === newSecond.right;
            
            if (addedLeft) {
                setRootOffset(r => r + (cur.length - prev.length));
                setNewTileIdx(0);
            } else {
                setNewTileIdx(cur.length - 1);
            }
            
            const timer = setTimeout(() => setNewTileIdx(null), 600);
            prevBoard.current = [...cur];
            return () => clearTimeout(timer);
        } else if (cur.length === 1) {
            setRootOffset(0);
            setNewTileIdx(0);
            const timer = setTimeout(() => setNewTileIdx(null), 600);
            prevBoard.current = [...cur];
            return () => clearTimeout(timer);
        }
        
        prevBoard.current = [...cur];
    }, [board]);

    /*
     * BI-DIRECTIONAL STABLE LAYOUT ALGORITHM
     * 1. The tile at `rootOffset` is permanently locked at (0,0).
     * 2. The Right path is built from `rootOffset + 1` to `N - 1`, snaking DOWN.
     * 3. The Left path is built from `rootOffset - 1` down to `0`, snaking UP.
     * 4. This guarantees existing tiles NEVER move relative to the center when new ones are added to either end.
     */
    const layout = useMemo(() => {
        if (board.length === 0) return { items: [], leftEndPos: null, rightEndPos: null, centerX: 0, centerY: 0 };

        const items: any[] = [];
        const BONE_W = isMobile ? 88 : 110;
        const BONE_H = isMobile ? 40 : 50;
        const GAP = isMobile ? 4 : 8;
        const ROW_GAP = isMobile ? 120 : 150; 
        const LIMIT = isMobile ? (window.innerWidth / 2) - BONE_W : 550;

        const actualRoot = Math.min(rootOffset, board.length - 1);
        const rootBone = board[actualRoot];
        if (!rootBone) return { items: [], centerX: 0, centerY: 0 };

        const rootIsDouble = rootBone.left === rootBone.right;
        
        // Locked Anchor
        items.push({ bone: rootBone, x: 0, y: 0, rot: 0, isHorizontal: !rootIsDouble, index: actualRoot });

        const rootChainW = rootIsDouble ? BONE_H : BONE_W;

        // --- RIGHT PATH (snaking DOWN + RIGHT) ---
        let cx = rootChainW / 2;
        let cy = 0;
        let dirX = 1;

        for (let i = actualRoot + 1; i < board.length; i++) {
            const b = board[i];
            const isDouble = b.left === b.right;
            const myChainW = isDouble ? BONE_H : BONE_W;

            const needsTurn = (dirX === 1 && cx > LIMIT) || (dirX === -1 && cx < -LIMIT);

            if (needsTurn) {
                // Turn DOWN
                cx += (GAP + BONE_H / 2) * dirX;
                cy += ROW_GAP / 2; 
                const isHoriz = isDouble ? true : false;
                items.push({ bone: b, x: cx, y: cy, rot: dirX === 1 ? 0 : 180, isHorizontal: isHoriz, index: i });
                
                cy += ROW_GAP / 2; 
                dirX *= -1; 
            } else {
                const myHalf = myChainW / 2;
                cx += (GAP + myHalf) * dirX;
                const isHoriz = isDouble ? false : true;
                items.push({ bone: b, x: cx, y: cy, rot: dirX === 1 ? 0 : 180, isHorizontal: isHoriz, index: i });
                cx += myHalf * dirX;
            }
        }

        // --- LEFT PATH (snaking UP + LEFT) ---
        cx = -rootChainW / 2;
        cy = 0;
        dirX = -1;

        for (let i = actualRoot - 1; i >= 0; i--) {
            const b = board[i];
            const isDouble = b.left === b.right;
            const myChainW = isDouble ? BONE_H : BONE_W;

            const needsTurn = (dirX === -1 && cx < -LIMIT) || (dirX === 1 && cx > LIMIT);

            if (needsTurn) {
                // Turn UP
                cx += (GAP + BONE_H / 2) * dirX;
                cy -= ROW_GAP / 2; 
                const isHoriz = isDouble ? true : false;
                items.push({ bone: b, x: cx, y: cy, rot: dirX === -1 ? 0 : 180, isHorizontal: isHoriz, index: i });
                
                cy -= ROW_GAP / 2; 
                dirX *= -1; 
            } else {
                const myHalf = myChainW / 2;
                cx += (GAP + myHalf) * dirX;
                const isHoriz = isDouble ? false : true;
                items.push({ bone: b, x: cx, y: cy, rot: dirX === -1 ? 0 : 180, isHorizontal: isHoriz, index: i });
                cx += myHalf * dirX;
            }
        }

        // Auto-Center Calculation
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        items.forEach(it => {
            if (it.x < minX) minX = it.x;
            if (it.x > maxX) maxX = it.x;
            if (it.y < minY) minY = it.y;
            if (it.y > maxY) maxY = it.y;
        });
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        return { items, centerX, centerY };
    }, [board, rootOffset, isMobile]);

    if (board.length === 0) {
        return (
            <div className="empty-board board-area" style={{ zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                    {isMyTurn ? '🎲 Play a bone to start!' : '⏳ Waiting for move...'}
                </span>
            </div>
        );
    }

    let canLeft = false, canRight = false;
    if (selectedBone && board.length > 0) {
        const lv = board[0].left, rv = board[board.length - 1].right;
        canLeft = selectedBone.left === lv || selectedBone.right === lv;
        canRight = selectedBone.left === rv || selectedBone.right === rv;
    }

    return (
        <div 
            className="board-absolute-container board-area"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ cursor: isDragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
            <div className="board-zoomer" style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: `translate(calc(-50% + ${pan.x - layout.centerX * zoom}px), calc(-50% + ${pan.y - layout.centerY * zoom}px)) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging.current ? 'none' : 'transform 0.15s ease-out'
            }}>
                {layout.items.map((it) => {
                    const isLeftTarget = isMyTurn && selectedBone && canLeft && it.index === 0;
                    const isRightTarget = isMyTurn && selectedBone && canRight && it.index === board.length - 1;
                    const isTarget = isLeftTarget || isRightTarget;

                    return (
                        <div 
                            key={`b-${it.bone.left}-${it.bone.right}-${it.index}`} 
                            className={`abs-bone${it.index === newTileIdx ? ' bone-new' : ''} ${isTarget ? 'drop-target-glow' : ''}`}
                            onClick={() => {
                                if (isLeftTarget) onPlayLeft();
                                if (isRightTarget) onPlayRight();
                            }}
                            onDragOver={isTarget ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
                            onDrop={isTarget ? (isLeftTarget ? onDropLeft : onDropRight) : undefined}
                            style={{
                                position: 'absolute',
                                left: `${it.x}px`, top: `${it.y}px`,
                                transform: `translate(-50%, -50%) rotate(${it.rot}deg)`,
                                '--rot': `${it.rot}deg`
                            } as React.CSSProperties}
                        >
                            <Domino bone={it.bone} isHorizontal={it.isHorizontal} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
