const { v4: uuidv4 } = require('uuid');

const users = [];

module.exports = {
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
        // Very basic simple mock for UPDATE fields based on params
        if (text.includes('nickname = $1, password_hash = $2, avatar = $3')) {
          users[userIndex].nickname = params[0] || users[userIndex].nickname;
          users[userIndex].password_hash = params[1] || users[userIndex].password_hash;
          users[userIndex].avatar = params[2] || users[userIndex].avatar;
        } else if (text.includes('nickname = $1, avatar = $2')) {
          users[userIndex].nickname = params[0] || users[userIndex].nickname;
          users[userIndex].avatar = params[1] || users[userIndex].avatar;
        }
        return { rows: [users[userIndex]] };
      }
      return { rows: [] };
    }
    
    return { rows: [] };
  }
};
