const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const initSql = `
CREATE TABLE IF NOT EXISTS Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    nickname VARCHAR(255) NOT NULL,
    xp INTEGER DEFAULT 0,
    rank_level INTEGER DEFAULT 1,
    total_wins INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS GameHistory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(255),
    game_mode VARCHAR(50),
    team_mode VARCHAR(50),
    winner_id UUID REFERENCES Users(id),
    winning_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS PlayerGameStats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES GameHistory(id),
    player_id UUID REFERENCES Users(id),
    score INTEGER,
    tiles_remaining INTEGER,
    is_winner BOOLEAN,
    xp_earned INTEGER
);
`;

async function initDB() {
  try {
    console.log('Running init_db.js with Client connection...');
    await client.connect();
    await client.query(initSql);
    console.log('Database tables created/migrated successfully.');
  } catch (err) {
    console.error('Error creating database tables:', err);
  } finally {
    await client.end();
  }
}

initDB();
