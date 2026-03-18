/**
 * ScoreCalculator — Pure-logic module for all scoring computations.
 *
 * Responsibilities:
 *   • All Fives mode open-end scoring
 *   • Round-end winner pip scoring (FFA and 2v2)
 *   • Blocked-game winner determination
 */

class ScoreCalculator {

    // ─── All Fives (In-Round Scoring) ───────────────────────────

    /**
     * Calculate points earned this turn in "All Fives" mode.
     * Points are scored when the sum of open ends is a multiple of 5.
     *
     * @param {{ left: number, right: number }[]} board  The board after the tile is placed
     * @returns {number}  Points scored (0 if not a multiple of 5)
     */
    calculateAllFivesPoints(board) {
        if (board.length === 0) return 0;

        let sum = 0;
        const leftBone = board[0];
        const rightBone = board[board.length - 1];

        if (board.length === 1) {
            // Single tile: both pips count
            sum = leftBone.left + leftBone.right;
        } else {
            // Left end: if double, count both pips; otherwise just the exposed pip
            sum += (leftBone.left === leftBone.right)
                ? leftBone.left * 2
                : leftBone.left;
            // Right end: same logic
            sum += (rightBone.left === rightBone.right)
                ? rightBone.right * 2
                : rightBone.right;
        }

        return (sum % 5 === 0) ? sum : 0;
    }

    // ─── Round-End Scoring ──────────────────────────────────────

    /**
     * Calculate the score a winner earns from opponents' remaining pips.
     *
     * FFA:  winner gets all other players' pip totals.
     * 2v2:  winner gets both opponents' pip totals (partner excluded).
     *
     * @param {string} winnerId
     * @param {Object<string, { hand: { left: number, right: number }[] }>} players
     * @param {string[]} playerOrder
     * @param {string} teamMode  'Free For All' or '2v2'
     * @returns {number}
     */
    calculateWinnerScore(winnerId, players, playerOrder, teamMode) {
        let score = 0;

        if (teamMode === '2v2' && playerOrder.length === 4) {
            const winnerIndex = playerOrder.indexOf(winnerId);
            // Opponents sit at +1 and +3 positions
            const oppIndices = [(winnerIndex + 1) % 4, (winnerIndex + 3) % 4];

            for (const idx of oppIndices) {
                const oppId = playerOrder[idx];
                for (const b of players[oppId].hand) {
                    score += b.left + b.right;
                }
            }
        } else {
            // FFA: sum pips from every other player
            for (const id of playerOrder) {
                if (id !== winnerId) {
                    for (const b of players[id].hand) {
                        score += b.left + b.right;
                    }
                }
            }
        }

        return score;
    }

    // ─── Blocked Game Winner ────────────────────────────────────

    /**
     * Determine the winner of a blocked game and calculate all pip totals.
     *
     * FFA:  lowest individual pip total wins.
     * 2v2:  lowest team total wins; tie goes to lastPlayerToMove.
     *
     * @param {Object<string, { hand: { left: number, right: number }[] }>} players
     * @param {string[]} playerOrder
     * @param {string} teamMode
     * @param {string|null} lastPlayerToMove
     * @returns {{ totals: Object<string, number>, blockedWinner: string, winningTeam?: number }}
     */
    calculateBlockedWinner(players, playerOrder, teamMode, lastPlayerToMove) {
        // Individual pip totals
        const totals = {};
        for (const id of playerOrder) {
            let total = 0;
            for (const b of players[id].hand) {
                total += b.left + b.right;
            }
            totals[id] = total;
        }

        let blockedWinner = null;
        let winningTeam = null;

        if (teamMode === '2v2' && playerOrder.length === 4) {
            const team1Total = totals[playerOrder[0]] + totals[playerOrder[2]];
            const team2Total = totals[playerOrder[1]] + totals[playerOrder[3]];

            if (team1Total < team2Total) {
                winningTeam = 1;
                blockedWinner = totals[playerOrder[0]] <= totals[playerOrder[2]]
                    ? playerOrder[0] : playerOrder[2];
            } else if (team2Total < team1Total) {
                winningTeam = 2;
                blockedWinner = totals[playerOrder[1]] <= totals[playerOrder[3]]
                    ? playerOrder[1] : playerOrder[3];
            } else {
                // Tie → last player to move wins
                blockedWinner = lastPlayerToMove || playerOrder[0];
                const wIdx = playerOrder.indexOf(blockedWinner);
                winningTeam = (wIdx % 2 === 0) ? 1 : 2;
            }
        } else {
            // FFA: lowest pip total
            let lowestTotal = Infinity;
            for (const id of playerOrder) {
                if (totals[id] < lowestTotal) {
                    lowestTotal = totals[id];
                    blockedWinner = id;
                }
            }
        }

        return { totals, blockedWinner, winningTeam };
    }
}

module.exports = ScoreCalculator;
