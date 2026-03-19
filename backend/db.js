const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let poolPromise;

function getConfig() {
  return {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 60000),
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 60000),
    options: {
      encrypt: (process.env.DB_ENCRYPT || 'true') === 'true',
      trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE || 'false') === 'true'
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

function validateConfig(config) {
  const missing = ['server', 'database', 'user', 'password'].filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  }
}

async function getPool() {
  if (!poolPromise) {
    const config = getConfig();
    validateConfig(config);
    poolPromise = sql.connect(config);
  }

  return poolPromise;
}

function replaceParameters(queryText) {
  return queryText.replace(/\$(\d+)/g, (_, index) => `@p${index}`);
}

function applyReturningClause(queryText) {
  const returningMatch = queryText.match(/\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i);
  if (!returningMatch) {
    return queryText;
  }

  const columns = returningMatch[1]
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);

  const outputClause = ` OUTPUT ${columns.map((column) => `INSERTED.${column}`).join(', ')}`;
  const withoutReturning = queryText.replace(/\s+RETURNING\s+[\s\S]+?\s*;?\s*$/i, '');

  if (/^\s*INSERT\b/i.test(withoutReturning)) {
    return withoutReturning.replace(/\bVALUES\b/i, `${outputClause} VALUES`);
  }

  if (/^\s*UPDATE\b/i.test(withoutReturning)) {
    return withoutReturning.replace(/\bWHERE\b/i, `${outputClause} WHERE`);
  }

  return withoutReturning;
}

function translateQuery(queryText) {
  return applyReturningClause(replaceParameters(queryText));
}

// ── In-Memory Data Stores ────────────────────────────────────────
// These are referenced by admin.js, auth.js, and index.js.
// In production, migrate these to persistent DB tables.

const users = [];
const friendRequests = [];
const blockedUsers = [];
const bannedWords = [];
const predefinedMessages = ['Good game!', 'Nice move!', 'Let\'s play!', 'GG!'];
const customStickers = []; // Stores { id, name, url, isHidden, allowedUsers: [] }

// ── Chat Filtering ──────────────────────────────────────────────

/**
 * Replace banned words in a message with asterisks.
 * @param {string} msg
 * @returns {string}
 */
function filterMessage(msg) {
  if (!msg || typeof msg !== 'string') return msg;
  let filtered = msg;
  for (const word of bannedWords) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  }
  return filtered;
}

// ── Social / Friends Helpers ────────────────────────────────────

function getFriends(userId) {
  return friendRequests
    .filter(r => r.status === 'accepted' && (r.fromId === userId || r.toId === userId))
    .map(r => {
      const friendId = r.fromId === userId ? r.toId : r.fromId;
      const friend = users.find(u => u.id === friendId);
      return friend ? { id: friend.id, username: friend.username, nickname: friend.nickname, avatar: friend.avatar } : null;
    })
    .filter(Boolean);
}

function getPendingRequests(userId) {
  return friendRequests.filter(r => r.toId === userId && r.status === 'pending');
}

function getSentRequests(userId) {
  return friendRequests.filter(r => r.fromId === userId && r.status === 'pending');
}

function getBlockedByUser(userId) {
  return blockedUsers.filter(b => b.blockerId === userId);
}

function sendFriendRequest(fromId, toId) {
  const exists = friendRequests.find(r =>
    (r.fromId === fromId && r.toId === toId) || (r.fromId === toId && r.toId === fromId)
  );
  if (exists) return { error: 'Request already exists' };
  const blocked = blockedUsers.find(b =>
    (b.blockerId === toId && b.blockedId === fromId)
  );
  if (blocked) return { error: 'You are blocked by this user' };
  const req = { id: `fr-${Date.now()}`, fromId, toId, status: 'pending' };
  friendRequests.push(req);
  return { success: true, request: req };
}

function acceptFriendRequest(requestId) {
  const req = friendRequests.find(r => r.id === requestId);
  if (!req) return { error: 'Request not found' };
  req.status = 'accepted';
  return { success: true };
}

function rejectFriendRequest(requestId) {
  const idx = friendRequests.findIndex(r => r.id === requestId);
  if (idx === -1) return { error: 'Request not found' };
  friendRequests.splice(idx, 1);
  return { success: true };
}

function removeFriend(userId, friendId) {
  const idx = friendRequests.findIndex(r =>
    r.status === 'accepted' &&
    ((r.fromId === userId && r.toId === friendId) || (r.fromId === friendId && r.toId === userId))
  );
  if (idx === -1) return { error: 'Friend not found' };
  friendRequests.splice(idx, 1);
  return { success: true };
}

function blockUser(blockerId, blockedId) {
  const exists = blockedUsers.find(b => b.blockerId === blockerId && b.blockedId === blockedId);
  if (exists) return { error: 'Already blocked' };
  blockedUsers.push({ blockerId, blockedId });
  // Remove any friendship
  removeFriend(blockerId, blockedId);
  return { success: true };
}

function unblockUser(blockerId, blockedId) {
  const idx = blockedUsers.findIndex(b => b.blockerId === blockerId && b.blockedId === blockedId);
  if (idx === -1) return { error: 'Not blocked' };
  blockedUsers.splice(idx, 1);
  return { success: true };
}

// ── Exports ─────────────────────────────────────────────────────

module.exports = {
  query: async (text, params = []) => {
    const pool = await getPool();
    const request = pool.request();

    params.forEach((value, index) => {
      request.input(`p${index + 1}`, value);
    });

    const result = await request.query(translateQuery(text));
    return { rows: result.recordset || [] };
  },
  sql,
  // In-memory stores
  users,
  friendRequests,
  blockedUsers,
  bannedWords,
  predefinedMessages,
  customStickers,
  // Helpers
  filterMessage,
  getFriends,
  getPendingRequests,
  getSentRequests,
  getBlockedByUser,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockUser,
  unblockUser
};
