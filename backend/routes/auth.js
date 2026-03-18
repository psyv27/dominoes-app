const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const nodemailer = require('nodemailer');

const router = express.Router();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp) {
    try {
        await transporter.sendMail({
            from: '"Dominoes Master" <no-reply@dominoesmaster.com>',
            to: email, // list of receivers
            subject: 'Your Verification Code', // Subject line
            text: `Your verification code is: ${otp}\nIt will expire in 10 minutes.` // plain text body
        });
        console.log(`[Email Sent] OTP to ${email}: ${otp}`);
    } catch (err) {
        console.error('Failed to send OTP email:', err);
    }
}

router.post('/register', async (req, res) => {
    const { email, username, password, nickname } = req.body;

    if (!email || !username || !password || !nickname) {
        return res.status(400).json({ error: 'Email, username, password, and nickname are required' });
    }

    try {
        // Check if username or email exists
        const userCheck = await db.query('SELECT id FROM Users WHERE username = $1 OR email = $2', [username, email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already taken' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = generateOTP();

        // Use MS SQL Server syntax to add minutes to current time
        const result = await db.query(
            "INSERT INTO Users (email, username, password_hash, nickname, is_verified, otp_code, otp_expiry) VALUES ($1, $2, $3, $4, 0, $5, DATEADD(minute, 10, GETDATE())) RETURNING id",
            [email, username, hashedPassword, nickname, otp]
        );

        await sendOTPEmail(email, otp);

        res.status(202).json({ status: 'pending_verification', email });
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

        if (user.is_verified === false) {
            const otp = generateOTP();
            await db.query(
                "UPDATE Users SET otp_code = $1, otp_expiry = DATEADD(minute, 10, GETDATE()) WHERE id = $2",
                [otp, user.id]
            );
            await sendOTPEmail(user.email, otp);
            return res.status(403).json({ error: 'pending_verification', email: user.email });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
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

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    try {
        const verifyResult = await db.query(
            "SELECT id FROM Users WHERE email = $1 AND otp_code = $2 AND otp_expiry > GETDATE()",
            [email, otp]
        );

        if (verifyResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const updateResult = await db.query(
            "UPDATE Users SET is_verified = 1, otp_code = NULL, otp_expiry = NULL WHERE email = $1 RETURNING id, username, email, nickname, avatar, xp, rank_level, total_wins, total_games",
            [email]
        );

        const updatedUser = updateResult.rows[0];
        const token = jwt.sign({ id: updatedUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const result = await db.query('SELECT id FROM Users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const otp = generateOTP();
            await db.query(
                "UPDATE Users SET otp_code = $1, otp_expiry = DATEADD(minute, 10, GETDATE()) WHERE email = $2",
                [otp, email]
            );
            await sendOTPEmail(email, otp);
        }
        res.json({ success: true, message: 'If an account exists, an OTP was sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    try {
        const verifyResult = await db.query(
            "SELECT id FROM Users WHERE email = $1 AND otp_code = $2 AND otp_expiry > GETDATE()",
            [email, otp]
        );

        if (verifyResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query(
            "UPDATE Users SET password_hash = $1, otp_code = NULL, otp_expiry = NULL WHERE email = $2",
            [hashedPassword, email]
        );

        res.json({ success: true, message: 'Password updated successfully' });
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

// ==========================================
// VIRTUAL ECONOMY & GUEST ENDPOINTS
// ==========================================
router.post('/guest', async (req, res) => {
    const { device_id, nickname } = req.body;
    if (!device_id) return res.status(400).json({ error: 'Device ID required' });

    try {
        const check = await db.query('SELECT * FROM Users WHERE device_id = $1', [device_id]);
        if (check.rows.length > 0) {
            const user = check.rows[0];
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.json({ token, user });
        }

        const username = 'guest_' + Math.random().toString(36).substring(2, 9);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(device_id, salt); // Just use device id as pass

        const result = await db.query(
            'INSERT INTO Users (username, password_hash, nickname, is_guest, device_id, coins) VALUES ($1, $2, $3, 1, $4, 50) RETURNING *',
            [username, hashedPassword, nickname || username, device_id]
        );

        const newUser = result.rows[0];
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: newUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/rewards/daily', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userCheck = await db.query('SELECT last_daily_reward FROM Users WHERE id = $1', [decoded.id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const lastReward = userCheck.rows[0].last_daily_reward;
        if (lastReward) {
            const hoursSince = (new Date() - new Date(lastReward)) / (1000 * 60 * 60);
            // Allow if >= 24h
            if (hoursSince < 24) return res.status(400).json({ error: 'Daily reward not ready' });
        }

        const result = await db.query(
            "UPDATE Users SET coins = coins + 100, last_daily_reward = GETDATE() WHERE id = $1 RETURNING coins",
            [decoded.id]
        );
        res.json({ success: true, coins: result.rows[0].coins });
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.post('/rewards/ad', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userCheck = await db.query('SELECT is_guest, coins FROM Users WHERE id = $1', [decoded.id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = userCheck.rows[0];
        if (user.is_guest) return res.status(403).json({ error: 'Guests cannot claim ad rewards' });
        if (user.coins >= 20) return res.status(400).json({ error: 'Coins must be less than 20 to claim an ad reward' });

        const result = await db.query("UPDATE Users SET coins = coins + 50 WHERE id = $1 RETURNING coins", [decoded.id]);
        res.json({ success: true, coins: result.rows[0].coins });
    } catch(err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
