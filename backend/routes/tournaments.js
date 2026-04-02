const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/tournaments
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Tournaments WHERE status = $1 ORDER BY start_time ASC', ['upcoming']);
        res.json(result.rows || []);
    } catch (err) {
        console.error("Tournaments fetch error:", err.message);
        res.json([]);
    }
});

// POST /api/tournaments/join
router.post('/join', async (req, res) => {
    const { userId, tournamentId } = req.body;
    if (!userId || !tournamentId) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const tResult = await db.query('SELECT entry_fee FROM Tournaments WHERE id = $1', [tournamentId]);
        if (tResult.rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
        
        const fee = tResult.rows[0].entry_fee;

        const uResult = await db.query('SELECT coins FROM Users WHERE id = $1', [userId]);
        const user = uResult.rows[0];
        if (!user || user.coins < fee) return res.status(400).json({ error: 'Not enough coins to join' });

        // Deduct fee and enroll
        await db.query('UPDATE Users SET coins = coins - $1 WHERE id = $2', [fee, userId]);
        await db.query('INSERT INTO TournamentParticipants (tournament_id, user_id) VALUES ($1, $2)', [tournamentId, userId]);

        res.json({ success: true, newBalance: user.coins - fee });
    } catch (err) {
        if (err.message.includes('UNIQUE') || err.message.includes('Violation of PRIMARY KEY')) {
            return res.status(400).json({ error: 'Already joined' });
        }
        console.error("Join tournament error:", err);
        res.status(500).json({ error: 'Failed to join tournament' });
    }
});


// GET /tournaments/all - All tournaments (admin view, all statuses)
router.get('/all', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Tournaments ORDER BY start_time DESC');
        res.json(result.rows || []);
    } catch (err) {
        console.error("All tournaments fetch error:", err.message);
        res.json([]);
    }
});

// POST /tournaments - Create tournament (admin)
router.post('/', async (req, res) => {
    const { title, image_url, entry_fee, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    try {
        const result = await db.query(
            `INSERT INTO Tournaments (title, image_url, entry_fee, status, start_time) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, image_url || '', entry_fee || 0, status || 'upcoming', new Date().toISOString()]
        );
        res.json({ success: true, tournament: result.rows[0] });
    } catch (err) {
        console.error("Tournament creation error:", err.message);
        res.status(500).json({ error: 'Failed to create tournament' });
    }
});

// DELETE /tournaments/:id - Delete tournament (admin)
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM Tournaments WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Tournament delete error:", err.message);
        res.status(500).json({ error: 'Failed to delete tournament' });
    }
});

module.exports = router;
