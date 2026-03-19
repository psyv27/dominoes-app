const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
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
    }
};

const initSql = `
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWID(),
        username NVARCHAR(255) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
        password_hash NVARCHAR(255) NULL,
        nickname NVARCHAR(255) NOT NULL,
        avatar NVARCHAR(2048) NULL,
        xp INT NOT NULL CONSTRAINT DF_Users_Xp DEFAULT 0,
        rank_level INT NOT NULL CONSTRAINT DF_Users_RankLevel DEFAULT 1,
        total_wins INT NOT NULL CONSTRAINT DF_Users_TotalWins DEFAULT 0,
        total_games INT NOT NULL CONSTRAINT DF_Users_TotalGames DEFAULT 0,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT GETDATE()
    );
END;

IF COL_LENGTH('dbo.Users', 'avatar') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD avatar NVARCHAR(2048) NULL;
END;

IF COL_LENGTH('dbo.Users', 'xp') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD xp INT NOT NULL CONSTRAINT DF_Users_Xp_Migration DEFAULT 0;
END;

IF COL_LENGTH('dbo.Users', 'rank_level') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD rank_level INT NOT NULL CONSTRAINT DF_Users_RankLevel_Migration DEFAULT 1;
END;

IF COL_LENGTH('dbo.Users', 'total_wins') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD total_wins INT NOT NULL CONSTRAINT DF_Users_TotalWins_Migration DEFAULT 0;
END;

IF COL_LENGTH('dbo.Users', 'total_games') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD total_games INT NOT NULL CONSTRAINT DF_Users_TotalGames_Migration DEFAULT 0;
END;

IF COL_LENGTH('dbo.Users', 'email') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD email NVARCHAR(255) NULL;
    ALTER TABLE dbo.Users ADD CONSTRAINT UQ_Users_Email UNIQUE(email);
END;

IF COL_LENGTH('dbo.Users', 'is_verified') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD is_verified BIT NOT NULL CONSTRAINT DF_Users_IsVerified DEFAULT 0;
END;

IF COL_LENGTH('dbo.Users', 'otp_code') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD otp_code NVARCHAR(10) NULL;
END;

IF COL_LENGTH('dbo.Users', 'otp_expiry') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD otp_expiry DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.Users', 'coins') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD coins INT NOT NULL CONSTRAINT DF_Users_Coins DEFAULT 300;
END;

IF COL_LENGTH('dbo.Users', 'games_lost') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD games_lost INT NOT NULL CONSTRAINT DF_Users_GamesLost DEFAULT 0;
END;

IF COL_LENGTH('dbo.Users', 'games_drawn') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD games_drawn INT NOT NULL CONSTRAINT DF_Users_GamesDrawn DEFAULT 0;
END;

IF COL_LENGTH('dbo.Users', 'last_daily_reward') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD last_daily_reward DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.Users', 'is_guest') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD is_guest BIT NOT NULL CONSTRAINT DF_Users_IsGuest DEFAULT 0;
END;

IF COL_LENGTH('dbo.Users', 'device_id') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD device_id NVARCHAR(255) NULL;
    ALTER TABLE dbo.Users ADD CONSTRAINT UQ_Users_DeviceID UNIQUE(device_id);
END;

IF OBJECT_ID(N'dbo.GameHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GameHistory (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GameHistory PRIMARY KEY DEFAULT NEWID(),
        room_id NVARCHAR(255) NULL,
        game_mode NVARCHAR(50) NULL,
        team_mode NVARCHAR(50) NULL,
        winner_id UNIQUEIDENTIFIER NULL,
        winning_score INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_GameHistory_CreatedAt DEFAULT GETDATE(),
        CONSTRAINT FK_GameHistory_Winner FOREIGN KEY (winner_id) REFERENCES dbo.Users(id)
    );
END;

IF OBJECT_ID(N'dbo.PlayerGameStats', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PlayerGameStats (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PlayerGameStats PRIMARY KEY DEFAULT NEWID(),
        game_id UNIQUEIDENTIFIER NULL,
        player_id UNIQUEIDENTIFIER NULL,
        score INT NULL,
        tiles_remaining INT NULL,
        is_winner BIT NULL,
        xp_earned INT NULL,
        CONSTRAINT FK_PlayerGameStats_Game FOREIGN KEY (game_id) REFERENCES dbo.GameHistory(id),
        CONSTRAINT FK_PlayerGameStats_Player FOREIGN KEY (player_id) REFERENCES dbo.Users(id)
    );
END;
`;

async function initDB() {
    let pool;

    try {
        console.log('Running init_db.js with SQL Server connection...');
        pool = await sql.connect(config);
        await pool.request().batch(initSql);
        console.log('Database tables created/migrated successfully.');
    } catch (err) {
        console.error('Error creating database tables:', err);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

initDB();
