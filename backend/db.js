const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

let users = [];
let friendRequests = []; // { id, fromId, toId, status: 'pending'|'accepted'|'rejected', createdAt }
let blockedUsers = [];   // { blockerId, blockedId }
let bannedWords = [];    // ['word1', 'word2', ...]
let predefinedMessages = ['👋 Hello!', '👍 Nice win!', '😅 Oops!', '⏱️ Hurry up!', '👏 Bravo!', '😎 Too easy!'];

// Load data on startup
if (fs.existsSync(dbPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (data.users) users = data.users;
        if (data.friendRequests) friendRequests = data.friendRequests;
        if (data.blockedUsers) blockedUsers = data.blockedUsers;
        if (data.bannedWords) bannedWords = data.bannedWords;
        if (data.predefinedMessages) predefinedMessages = data.predefinedMessages;
    } catch (err) {
        console.error('Failed to load db.json', err);
    }
}

function saveData() {
    const data = { users, friendRequests, blockedUsers, bannedWords, predefinedMessages };
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  // Direct access for admin/friends routes
  users,
  friendRequests,
  blockedUsers,
  bannedWords,
  predefinedMessages,

  query: async (text, params) => {
    if (text.includes('INSERT INTO Users')) {
      const newUser = {
        id: uuidv4(),
        username: params[0],
        password_hash: params[1],
        nickname: params[2],
        avatar: null,
        xp: 0,
        rank_level: 1,
        total_wins: 0,
        total_games: 0
      };
      users.push(newUser);
      saveData();
      return { rows: [newUser] };
    }
    
    if (text.includes('SELECT * FROM Users WHERE username = $1') || text.includes('SELECT id FROM Users WHERE username = $1')) {
      const user = users.find(u => u.username === params[0]);
      return { rows: user ? [user] : [] };
    }

    if (text.includes('WHERE id = $1')) {
      const user = users.find(u => u.id === params[0]);
      return { rows: user ? [user] : [] };
    }

    if (text.includes('UPDATE Users')) {
      const id = params[params.length - 1];
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        if (text.includes('nickname = $1, password_hash = $2, avatar = $3')) {
          users[userIndex].nickname = params[0] || users[userIndex].nickname;
          users[userIndex].password_hash = params[1] || users[userIndex].password_hash;
          users[userIndex].avatar = params[2] || users[userIndex].avatar;
        } else if (text.includes('nickname = $1, avatar = $2')) {
          users[userIndex].nickname = params[0] || users[userIndex].nickname;
          users[userIndex].avatar = params[1] || users[userIndex].avatar;
        }
        saveData();
        return { rows: [users[userIndex]] };
      }
      return { rows: [] };
    }
    
    return { rows: [] };
  },

  // ---- FRIENDS HELPERS ----
  sendFriendRequest(fromId, toId) {
    // Check if already friends or pending
    const existing = friendRequests.find(r =>
      (r.fromId === fromId && r.toId === toId) ||
      (r.fromId === toId && r.toId === fromId)
    );
    if (existing) return { error: 'Request already exists', existing };

    // Check if blocked
    const isBlocked = blockedUsers.some(b =>
      (b.blockerId === fromId && b.blockedId === toId) ||
      (b.blockerId === toId && b.blockedId === fromId)
    );
    if (isBlocked) return { error: 'Cannot send request to blocked user' };

    const req = { id: uuidv4(), fromId, toId, status: 'pending', createdAt: new Date() };
    friendRequests.push(req);
    saveData();
    return { success: true, request: req };
  },

  acceptFriendRequest(requestId) {
    const req = friendRequests.find(r => r.id === requestId);
    if (!req) return { error: 'Request not found' };
    req.status = 'accepted';
    saveData();
    return { success: true, request: req };
  },

  rejectFriendRequest(requestId) {
    const idx = friendRequests.findIndex(r => r.id === requestId);
    if (idx === -1) return { error: 'Request not found' };
    friendRequests.splice(idx, 1);
    saveData();
    return { success: true };
  },

  removeFriend(userId1, userId2) {
    const idx = friendRequests.findIndex(r =>
      r.status === 'accepted' &&
      ((r.fromId === userId1 && r.toId === userId2) || (r.fromId === userId2 && r.toId === userId1))
    );
    if (idx === -1) return { error: 'Not friends' };
    friendRequests.splice(idx, 1);
    saveData();
    return { success: true };
  },

  getFriends(userId) {
    return friendRequests
      .filter(r => r.status === 'accepted' && (r.fromId === userId || r.toId === userId))
      .map(r => {
        const friendId = r.fromId === userId ? r.toId : r.fromId;
        const friend = users.find(u => u.id === friendId);
        return friend ? { id: friend.id, username: friend.username, nickname: friend.nickname, avatar: friend.avatar } : null;
      })
      .filter(Boolean);
  },

  getPendingRequests(userId) {
    return friendRequests
      .filter(r => r.status === 'pending' && r.toId === userId)
      .map(r => {
        const from = users.find(u => u.id === r.fromId);
        return { id: r.id, fromId: r.fromId, fromNickname: from?.nickname, fromUsername: from?.username, createdAt: r.createdAt };
      });
  },

  getSentRequests(userId) {
    return friendRequests
      .filter(r => r.status === 'pending' && r.fromId === userId)
      .map(r => {
        const to = users.find(u => u.id === r.toId);
        return { id: r.id, toId: r.toId, toNickname: to?.nickname, toUsername: to?.username, createdAt: r.createdAt };
      });
  },

  // ---- BLOCK HELPERS ----
  blockUser(blockerId, blockedId) {
    const existing = blockedUsers.find(b => b.blockerId === blockerId && b.blockedId === blockedId);
    if (existing) return { error: 'Already blocked' };
    blockedUsers.push({ blockerId, blockedId });
    // Remove any friendship
    const friendIdx = friendRequests.findIndex(r =>
      (r.fromId === blockerId && r.toId === blockedId) || (r.fromId === blockedId && r.toId === blockerId)
    );
    if (friendIdx !== -1) friendRequests.splice(friendIdx, 1);
    saveData();
    return { success: true };
  },

  unblockUser(blockerId, blockedId) {
    const idx = blockedUsers.findIndex(b => b.blockerId === blockerId && b.blockedId === blockedId);
    if (idx === -1) return { error: 'Not blocked' };
    blockedUsers.splice(idx, 1);
    saveData();
    return { success: true };
  },

  getBlockedByUser(userId) {
    return blockedUsers
      .filter(b => b.blockerId === userId)
      .map(b => {
        const blocked = users.find(u => u.id === b.blockedId);
        return blocked ? { id: blocked.id, username: blocked.username, nickname: blocked.nickname } : null;
      })
      .filter(Boolean);
  },

  // ---- WORD FILTER ----
  filterMessage(text) {
    if (!text || bannedWords.length === 0) return text;
    let filtered = text;
    for (const word of bannedWords) {
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
    return filtered;
  }
};
