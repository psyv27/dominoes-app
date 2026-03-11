// BoardLayout.tsx
import React, { useMemo } from 'react';
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
    
    // Calculates the absolute positions of all dominoes to form a snake.
    // X, Y coordinate system where (0,0) is center.
    const layout = useMemo(() => {
        if (board.length === 0) return { items: [], minX: 0, maxX: 0, minY: 0, maxY: 0, leftEndPos: null, rightEndPos: null };

        const items: any[] = [];
        const BONE_W = 80;  // Standard long dimension (visual width when horizontal)
        const BONE_H = 40;  // Standard short dimension (visual height when horizontal)
        const GAP = 4;      // Small gap between tiles
        const ROW_GAP = 90; // Vertical distance between rows
        const LIMIT_X = 500; // Fixed horizontal limit for stability

        // We find the center tile index to grow from for stability.
        const centerIndex = Math.floor(board.length / 2);
        
        let minX = 0, maxX = 0, minY = 0, maxY = 0;

        // --- 1. Layout Right side from Center ---
        let cx = 0, cy = 0;
        let dirX = 1; 
        let dirY = 0;
        let isRightSnakeTurned = false;

        for (let i = centerIndex; i < board.length; i++) {
            const b = board[i];
            const isDouble = b.left === b.right;
            
            // Turning logic for Right end
            if (!isRightSnakeTurned && cx > LIMIT_X) {
                isRightSnakeTurned = true;
                // Transition Down
                const currentStep = isDouble ? BONE_H : BONE_W;
                // Adjust position to "elbow"
                cx += (currentStep / 2) + GAP;
                items.push({ bone: b, x: cx, y: cy + (ROW_GAP / 4), rot: 90, isDouble, index: i });
                cx -= (currentStep / 2); // Center of gravity shift
                cy += (ROW_GAP / 2);
                dirX = -1; // Now go left along bottom row
                continue;
            }

            // Standard placement
            const rot = dirX !== 0 ? (isDouble ? 90 : 0) : (isDouble ? 0 : 90);
            items.push({ bone: b, x: cx, y: cy, rot, isDouble, index: i });
            
            const step = (dirX !== 0) 
                ? (isDouble ? BONE_H : BONE_W) 
                : (isDouble ? BONE_W : BONE_H);
            
            cx += (step + GAP) * dirX;
        }

        const rightEndPos = { x: cx, y: cy };

        // --- 2. Layout Left side from Center ---
        cx = 0; 
        cy = 0;
        dirX = -1;
        let isLeftSnakeTurned = false;

        // Backtrack the center tile's width
        const centerTile = board[centerIndex];
        const centerStep = (centerTile.left === centerTile.right) ? BONE_H : BONE_W;
        cx -= (centerStep + GAP);

        for (let i = centerIndex - 1; i >= 0; i--) {
            const b = board[i];
            const isDouble = b.left === b.right;

            // Turning logic for Left end
            if (!isLeftSnakeTurned && cx < -LIMIT_X) {
                isLeftSnakeTurned = true;
                // Transition Up
                const currentStep = isDouble ? BONE_H : BONE_W;
                cx -= (currentStep / 2) + GAP;
                items.push({ bone: b, x: cx, y: cy - (ROW_GAP / 4), rot: 90, isDouble, index: i });
                cx += (currentStep / 2);
                cy -= (ROW_GAP / 2);
                dirX = 1; // Now go right along top row
                continue;
            }

            const rot = dirX !== 0 ? (isDouble ? 90 : 0) : (isDouble ? 0 : 90);
            items.push({ bone: b, x: cx, y: cy, rot, isDouble, index: i });
            
            const step = (dirX !== 0) 
                ? (isDouble ? BONE_H : BONE_W) 
                : (isDouble ? BONE_W : BONE_H);
            
            cx += (step + GAP) * dirX;
        }

        const leftEndPos = { x: cx, y: cy };

        // Calculate bounds
        items.forEach(it => {
            if(it.x < minX) minX = it.x;
            if(it.x > maxX) maxX = it.x;
            if(it.y < minY) minY = it.y;
            if(it.y > maxY) maxY = it.y;
        });

        items.sort((a, b) => a.index - b.index);

        return { items, minX, maxX, minY, maxY, leftEndPos, rightEndPos };

    }, [board]);

    if (board.length === 0) {
        return (
            <div className="empty-board" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                {isMyTurn ? 'Play a bone to start! Drag it here.' : 'Waiting for move...'}
            </div>
        );
    }

    // Check if the selected bone is playable on left or right
    let canLeft = false;
    let canRight = false;

    if (selectedBone && board.length > 0) {
        const leftValue = board[0].left;
        const rightValue = board[board.length - 1].right;
        canLeft = selectedBone.left === leftValue || selectedBone.right === leftValue;
        canRight = selectedBone.left === rightValue || selectedBone.right === rightValue;
    }

    // Calculate dynamic wrapper scale to fit the snake
    const boardWidth = (layout.maxX - layout.minX) + 200;
    const boardHeight = (layout.maxY - layout.minY) + 200;
    
    return (
        <div className="board-absolute-container">
            <div 
                className="board-zoomer"
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    // Stable center offset based on fixed max dimensions rather than dynamic bounds
                    // This prevents the board from jumping around as it grows
                    transform: `translate(-50%, -50%) scale(0.9)`
                }}
            >
                {layout.items.map((it, idx) => (
                    <div 
                        key={`b-${idx}`} 
                        className="abs-bone"
                        style={{
                            position: 'absolute',
                            left: `${it.x}px`,
                            top: `${it.y}px`,
                            transform: `translate(-50%, -50%) rotate(${it.rot}deg)`
                        }}
                    >
                        <Domino bone={it.bone} isHorizontal={true} />
                    </div>
                ))}

                {/* Drop Zones */}
                {isMyTurn && selectedBone && canLeft && layout.leftEndPos && (
                    <div 
                        className="abs-drop-zone"
                        style={{
                            left: `${layout.leftEndPos.x}px`,
                            top: `${layout.leftEndPos.y}px`,
                            transform: `translate(-50%, -50%)`
                        }}
                        onClick={onPlayLeft}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={onDropLeft}
                    >
                        Put Left
                    </div>
                )}
                {isMyTurn && selectedBone && canRight && layout.rightEndPos && (
                    <div 
                        className="abs-drop-zone"
                        style={{
                            left: `${layout.rightEndPos.x}px`,
                            top: `${layout.rightEndPos.y}px`,
                            transform: `translate(-50%, -50%)`
                        }}
                        onClick={onPlayRight}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={onDropRight}
                    >
                        Put Right
                    </div>
                )}
            </div>
        </div>
    );
}
