const express = require('express');
const db = require('../db');

const router = express.Router();

// ADMIN: Get all users
router.get('/users', (req, res) => {
    // Return all users (strip password hashes)
    const allUsers = db.users.map(u => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        avatar: u.avatar,
        rank_level: u.rank_level
    }));
    res.json(allUsers);
});

// ADMIN: Delete user
router.delete('/users/:id', (req, res) => {
    const userId = req.params.id;
    const idx = db.users.findIndex(u => u.id === userId);
    
    if (idx === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    db.users.splice(idx, 1);
    
    // Also remove their friendships and blocks
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

module.exports = router;
