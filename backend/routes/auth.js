const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, password, nickname } = req.body;

    if (!username || !password || !nickname) {
        return res.status(400).json({ error: 'Username, password, and nickname are required' });
    }

    try {
        // Check if username exists
        const userCheck = await db.query('SELECT id FROM Users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO Users (username, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname, avatar, xp, rank_level',
            [username, hashedPassword, nickname]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                xp: user.xp,
                rank_level: user.rank_level,
                total_wins: user.total_wins,
                total_games: user.total_games
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await db.query('SELECT id, username, nickname, avatar, xp, rank_level, total_wins, total_games FROM Users WHERE id = $1', [decoded.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.put('/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const { nickname, password, avatar } = req.body;

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userCheck = await db.query('SELECT * FROM Users WHERE id = $1', [decoded.id]);
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userCheck.rows[0];
        let result;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            result = await db.query(
                'UPDATE Users SET nickname = $1, password_hash = $2, avatar = $3 WHERE id = $4 RETURNING id, username, nickname, avatar, xp, rank_level, total_wins, total_games',
                [nickname || user.nickname, hashedPassword, avatar || user.avatar, decoded.id]
            );
        } else {
            result = await db.query(
                'UPDATE Users SET nickname = $1, avatar = $2 WHERE id = $3 RETURNING id, username, nickname, avatar, xp, rank_level, total_wins, total_games',
                [nickname || user.nickname, avatar || user.avatar, decoded.id]
            );
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error / Invalid token' });
    }
});

// ==========================================
// FRIENDS & BLOCK SYSTEM ENDPOINTS
// ==========================================

// Search users by exact username
router.get('/search', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.json([]);
    const result = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.json([]);
    const u = result.rows[0];
    res.json([{ id: u.id, username: u.username, nickname: u.nickname, avatar: u.avatar }]);
});

// Get user's social data (friends, requests, blocked)
router.get('/social', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        res.json({
            friends: db.getFriends(userId),
            pendingRequests: db.getPendingRequests(userId),
            sentRequests: db.getSentRequests(userId),
            blocked: db.getBlockedByUser(userId)
        });
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Send Friend Request
router.post('/friend-request', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { toId } = req.body;
        if (!toId || toId === decoded.id) return res.status(400).json({ error: 'Invalid target' });
        
        const result = db.sendFriendRequest(decoded.id, toId);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Accept Friend Request
router.post('/friend-request/:id/accept', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const result = db.acceptFriendRequest(req.params.id);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Reject/Cancel Friend Request or Remove Friend
router.delete('/friend-request/:id', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const result = db.rejectFriendRequest(req.params.id);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Remove Friend (by user ID)
router.delete('/friends/:id', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = db.removeFriend(decoded.id, req.params.id);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Block User
router.post('/block', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { blockedId } = req.body;
        if (!blockedId || blockedId === decoded.id) return res.status(400).json({ error: 'Invalid target' });
        
        const result = db.blockUser(decoded.id, blockedId);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Unblock User
router.delete('/block/:id', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = db.unblockUser(decoded.id, req.params.id);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
