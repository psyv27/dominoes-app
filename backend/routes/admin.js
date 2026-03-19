const express = require('express');
const db = require('../db');

const router = express.Router();

// ADMIN: Get all users
router.get('/users', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, username, nickname, avatar, rank_level, coins, games_played, games_won, games_lost, games_drawn FROM Users'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ADMIN: Delete user
router.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        // Just delete from DB, cascading or manual cleanup as needed
        await db.query('DELETE FROM Users WHERE id = $1', [userId]);
        
        // Also remove their friendships from memory store
        for (let i = db.friendRequests.length - 1; i >= 0; i--) {
            if (db.friendRequests[i].fromId === userId || db.friendRequests[i].toId === userId) {
                db.friendRequests.splice(i, 1);
            }
        }
        for (let i = db.blockedUsers.length - 1; i >= 0; i--) {
            if (db.blockedUsers[i].blockerId === userId || db.blockedUsers[i].blockedId === userId) {
                db.blockedUsers.splice(i, 1);
            }
        }
    
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ADMIN: Adjust user coins
router.put('/users/:id/coins', async (req, res) => {
    const userId = req.params.id;
    const { amount } = req.body;
    if (typeof amount !== 'number') return res.status(400).json({ error: 'Amount must be a number' });

    try {
        const result = await db.query(
            'UPDATE Users SET coins = coins + $1 WHERE id = $2 RETURNING id, coins',
            [amount, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update coins' });
    }
});

// ADMIN: Get banned words
router.get('/banned-words', (req, res) => {
    res.json(db.bannedWords);
});

// ADMIN: Add banned word
router.post('/banned-words', (req, res) => {
    const { word } = req.body;
    if (!word || typeof word !== 'string') return res.status(400).json({ error: 'Invalid word' });
    
    const wordLower = word.toLowerCase().trim();
    if (!db.bannedWords.includes(wordLower)) {
        db.bannedWords.push(wordLower);
    }
    res.json({ success: true, words: db.bannedWords });
});

// ADMIN: Remove banned word
router.delete('/banned-words/:word', (req, res) => {
    const word = req.params.word.toLowerCase();
    const idx = db.bannedWords.indexOf(word);
    if (idx !== -1) {
        db.bannedWords.splice(idx, 1);
    }
    res.json({ success: true, words: db.bannedWords });
});

// ADMIN: Get predefined messages
router.get('/predefined-messages', (req, res) => {
    res.json(db.predefinedMessages);
});

// ADMIN: Add predefined message
router.post('/predefined-messages', (req, res) => {
    const { msg } = req.body;
    if (!msg || typeof msg !== 'string') return res.status(400).json({ error: 'Invalid message' });
    
    const cleanMsg = msg.trim();
    if (!db.predefinedMessages.includes(cleanMsg)) {
        db.predefinedMessages.push(cleanMsg);
    }
    res.json({ success: true, messages: db.predefinedMessages });
});

// ADMIN: Remove predefined message
router.delete('/predefined-messages/:msg', (req, res) => {
    const msg = req.params.msg;
    const idx = db.predefinedMessages.indexOf(msg);
    if (idx !== -1) {
        db.predefinedMessages.splice(idx, 1);
    }
    res.json({ success: true, messages: db.predefinedMessages });
});

// ── CUSTOM STICKERS ──

// ADMIN: Get all custom stickers
router.get('/stickers', (req, res) => {
    res.json(db.customStickers);
});

// ADMIN: Add new custom sticker
router.post('/stickers', (req, res) => {
    const { name, url, isHidden, allowedUsers } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and image URL (base64) are required' });

    const newSticker = {
        id: `stk_${Date.now()}`,
        name: name.trim(),
        url: url, // expecting data URI base64
        isHidden: !!isHidden,
        allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : []
    };

    db.customStickers.push(newSticker);
    res.json({ success: true, sticker: newSticker });
});

// ADMIN: Update sticker permissions
router.put('/stickers/:id', (req, res) => {
    const stickerId = req.params.id;
    const { name, isHidden, allowedUsers } = req.body;

    const sticker = db.customStickers.find(s => s.id === stickerId);
    if (!sticker) return res.status(404).json({ error: 'Sticker not found' });

    if (name !== undefined) sticker.name = name.trim();
    if (isHidden !== undefined) sticker.isHidden = !!isHidden;
    if (Array.isArray(allowedUsers)) sticker.allowedUsers = allowedUsers;

    res.json({ success: true, sticker });
});

// ADMIN: Delete sticker
router.delete('/stickers/:id', (req, res) => {
    const stickerId = req.params.id;
    const idx = db.customStickers.findIndex(s => s.id === stickerId);
    if (idx === -1) return res.status(404).json({ error: 'Sticker not found' });

    db.customStickers.splice(idx, 1);
    res.json({ success: true });
});

module.exports = router;
