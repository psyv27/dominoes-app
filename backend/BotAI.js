/**
 * BotAI — Domino bot with Easy / Normal / Hard difficulty
 * 
 * Easy:   Random valid move
 * Normal: Prefer high-value tiles, avoid getting stuck
 * Hard:   Track opponent passes, block opponents, reduce hand value
 */

class BotAI {
    constructor(difficulty = 'normal') {
        this.difficulty = difficulty; // 'easy', 'normal', 'hard'
        this.opponentPassedNumbers = {}; // playerId -> [numbers they passed on]
    }

    /**
     * Track when an opponent passes — used for Hard strategy
     */
    recordPass(playerId, openEnds) {
        if (!this.opponentPassedNumbers[playerId]) {
            this.opponentPassedNumbers[playerId] = [];
        }
        this.opponentPassedNumbers[playerId].push(...openEnds);
    }

    /**
     * Choose a move given the game state
     * @returns { bone, end } or null if no valid move
     */
    chooseMove(hand, board, allScores, playerOrder, botId) {
        if (board.length === 0) {
            // First move — play highest double, or highest tile
            return this._firstMove(hand);
        }

        const leftEnd = board[0].left;
        const rightEnd = board[board.length - 1].right;

        const validMoves = this._getValidMoves(hand, leftEnd, rightEnd);
        if (validMoves.length === 0) return null;

        switch (this.difficulty) {
            case 'easy':
                return this._easyStrategy(validMoves);
            case 'hard':
                return this._hardStrategy(validMoves, hand, leftEnd, rightEnd, playerOrder, botId);
            case 'normal':
            default:
                return this._normalStrategy(validMoves, hand);
        }
    }

    _getValidMoves(hand, leftEnd, rightEnd) {
        const moves = [];
        for (const bone of hand) {
            // Can play on left end?
            if (bone.left === leftEnd || bone.right === leftEnd) {
                moves.push({ bone, end: 'left' });
            }
            // Can play on right end?
            if (bone.left === rightEnd || bone.right === rightEnd) {
                // Avoid duplicate if both ends are the same number
                if (leftEnd !== rightEnd || !(bone.left === leftEnd || bone.right === leftEnd)) {
                    moves.push({ bone, end: 'right' });
                } else if (leftEnd === rightEnd) {
                    moves.push({ bone, end: 'right' });
                }
            }
        }
        // Deduplicate: same bone appearing twice for both ends
        const seen = new Set();
        return moves.filter(m => {
            const key = `${m.bone.left}-${m.bone.right}-${m.end}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    _firstMove(hand) {
        // Play highest double first
        let bestDouble = null;
        let bestTile = null;
        let bestValue = -1;

        for (const bone of hand) {
            const value = bone.left + bone.right;
            if (bone.left === bone.right && value > bestValue) {
                bestDouble = bone;
                bestValue = value;
            }
        }

        if (bestDouble) {
            return { bone: bestDouble, end: 'right' };
        }

        // No double — play highest value tile
        bestValue = -1;
        for (const bone of hand) {
            const value = bone.left + bone.right;
            if (value > bestValue) {
                bestTile = bone;
                bestValue = value;
            }
        }

        return { bone: bestTile, end: 'right' };
    }

    /**
     * EASY: Pick a random valid move
     */
    _easyStrategy(validMoves) {
        const idx = Math.floor(Math.random() * validMoves.length);
        return validMoves[idx];
    }

    /**
     * NORMAL: Prefer high-value tiles (reduce hand value early)
     * Play doubles when possible (harder to play later)
     */
    _normalStrategy(validMoves, hand) {
        // Sort by tile value descending
        const scored = validMoves.map(m => ({
            ...m,
            value: m.bone.left + m.bone.right,
            isDouble: m.bone.left === m.bone.right
        }));

        // Prefer doubles (they're harder to play)
        scored.sort((a, b) => {
            if (a.isDouble && !b.isDouble) return -1;
            if (!a.isDouble && b.isDouble) return 1;
            return b.value - a.value; // Higher value first
        });

        return scored[0];
    }

    /**
     * HARD: Defensive + Offensive strategy
     * 1. Track opponent passed numbers — try to force those ends
     * 2. Maintain number diversity in hand
     * 3. Play high-value tiles first to reduce risk
     * 4. Block opponents by setting ends to numbers they've passed on
     */
    _hardStrategy(validMoves, hand, leftEnd, rightEnd, playerOrder, botId) {
        const scored = validMoves.map(m => {
            let score = 0;
            const boneValue = m.bone.left + m.bone.right;
            const isDouble = m.bone.left === m.bone.right;

            // 1. High value tiles get priority (defensive — reduce hand value)
            score += boneValue * 2;

            // 2. Doubles get priority (harder to play later)
            if (isDouble) score += 15;

            // 3. Does this move create an end that opponents have passed on? (offensive)
            const playedNumber = m.end === 'left' 
                ? (m.bone.right === leftEnd ? m.bone.left : m.bone.right)
                : (m.bone.left === rightEnd ? m.bone.right : m.bone.left);
            
            for (const pid of playerOrder) {
                if (pid === botId) continue;
                const passed = this.opponentPassedNumbers[pid] || [];
                if (passed.includes(playedNumber)) {
                    score += 20; // Big bonus for blocking opponent
                }
            }

            // 4. Maintain diversity — prefer playing numbers we have many of
            const numberCounts = {};
            for (const b of hand) {
                numberCounts[b.left] = (numberCounts[b.left] || 0) + 1;
                numberCounts[b.right] = (numberCounts[b.right] || 0) + 1;
            }

            // Prefer to keep diverse numbers
            const otherEnd = m.end === 'left' ? rightEnd : leftEnd;
            const keptNumbers = hand.filter(b => 
                !(b.left === m.bone.left && b.right === m.bone.right)
            );
            const canStillPlay = keptNumbers.some(b =>
                b.left === otherEnd || b.right === otherEnd ||
                b.left === playedNumber || b.right === playedNumber
            );
            if (canStillPlay) score += 5;

            return { ...m, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0];
    }
}

module.exports = BotAI;
