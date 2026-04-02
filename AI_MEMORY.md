# Dominoes App - AI Memory & Context File

## Project Overview
This project is a real-time multiplayer Dominoes **web application**. It is designed to run in any modern browser and is fully responsive across desktop, tablet, and phone screen sizes. The visual theme is "The Grandmaster's Lounge" — a premium dark casino-style aesthetic.

## Architecture & Stack
- **Backend:** Node.js, Express, Socket.io
  - Located in the `/backend` directory.
  - Core game logic (`game.js`) handles deck generation, shuffling, valid moves, turn management, scoring (Classic/Normal, All Fives, Block), team modes, and win conditions.
  - `RoomManager.js` manages dynamic rooms, player connections, bot injection, and game instances.
  - `BotAI.js` provides AI logic for single-player games with configurable difficulty.
  - `routes/auth.js` handles JWT-based registration, login, guest play, OTP verification, and session management.
  - `routes/admin.js` handles admin dashboard APIs (user management, banned words, stickers, store item CRUD).
  - `routes/store.js` handles public store item listing and purchase/buy transaction logic.
  - `routes/tournaments.js` handles tournament listing, creation, deletion, and join logic.
  - `engine/ScoreCalculator.js` — pure-logic module for All Fives scoring, round-end pip scoring, and blocked-game determination.
  - `engine/InputValidator.js`, `engine/MoveValidator.js`, `engine/TurnManager.js` — modular game engine components.
  - `init_db.js` creates MS SQL Server tables (Users, GameHistory, PlayerGameStats, StoreItems, UserInventory, Tournaments, TournamentParticipants).
  - `db.js` provides the MS SQL Server connection pool via `mssql` with a PostgreSQL-compatible `$1` parameter replacement wrapper.
  - Server entry point (`index.js`) manages WebSocket connections, player lobbies, room events (create, join, leave, kick, team switch, chat), bot turns, dealing animations, and broadcasts game state updates.
- **Frontend:** React, TypeScript, Vite, Socket.io-client, Tailwind CSS (with some Vanilla CSS for Gameplay)
  - Located in the `/frontend` directory.
  - Uses "Domino Orbit" design system with Tailwind CSS utility classes plus custom glass-card utilities.
  - `DashboardLayout.tsx` is the unified sidebar+header layout used across all authenticated pages (Lobby, Store, Inventory, Social, Profile, Admin, Tournament).
  - Custom React component for Dominoes (`Domino.tsx` & `Domino.css`) using solely CSS to draw dots dynamically.
  - `BoardLayout.tsx` and `DealingBoard.tsx` handle the game board rendering and dealing animation.
  - Responsive design with Tailwind responsive prefixes (md:, lg:, xl:).
  - All components are TypeScript (`.tsx`): Auth, Home, Lobby, Room, Gameplay, Store, Inventory, Profile, Friends, Tournament, Admin.

## Database
- **MS SQL Server (Azure SQL)**
- Connection config stored in `backend/.env` as `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Tables: `Users`, `GameHistory`, `PlayerGameStats`, `StoreItems`, `UserInventory`, `Tournaments`, `TournamentParticipants`
- The `db.js` wrapper converts PostgreSQL-style `$1` parameters to MSSQL `@p1` parameters and handles `RETURNING` clause conversion.

## Current State & Features Implemented
1. **Authentication:** JWT-based login/registration for authorized users, guest play mode (generates device_id-based ephemeral account).
2. **Lobby System:** Public rooms list, private room join by custom password (minimum 4 chars), room creation with custom settings.
3. **Room System:** Host controls (start game, kick players), team picking (Team 1 / Team 2), chat.
4. **Game Modes:** Classic (Normal), All Fives (multiples of 5 scoring), Block (no boneyard drawing).
5. **Team Modes:** Free For All, Team Mode (2 vs 2).
6. **Match Formats:** Score-based (first to target), Best of 1/3/5.
7. **Drag and Drop:** Players can drag dominos from their hand to left/right drop zones on the board, with click fallback.
8. **Real-time Multiplayer:** Full Socket.io sync for all game actions, board updates, scoring, chat, emojis, and custom stickers.
9. **XP & Ranking:** Authorized users earn XP per game, ranks increase automatically based on XP thresholds.
10. **Store:** Dynamic cosmetic store - items fetched from backend DB via `/store/items`. Admin can add/edit/delete items with discount percentages, limited/new/popular badges. Guests cannot access.
11. **Inventory:** Players can equip owned skins. Equipped skins persist via localStorage. Guests blocked.
12. **Responsive Web Design:** All pages adapt to desktop, tablet, and phone screen sizes.
13. **Opponent Tracking:** Shows opponent bone counts and active turn indicator.
14. **Round & Match End Screens:** Animated modals showing scores and winners with revealed tiles.
15. **Admin & Moderation:** Admin dashboard for user management, coin adjustment, chat word filtering, custom stickers, store item CRUD, tournament creation/deletion.
16. **Single Player / Bot Mode:** Play against AI bots with selectable difficulty and count.
17. **Dealing Animation:** Incremental card-dealing animation synced via `dealing_animation_complete` event.
18. **Tournaments:** Database-backed tournament system with entry fees, participant tracking, and admin management.
19. **Minimalist Casino Gameplay UI:** Floating HUD panels (Room Code, Total Pot, Game Mode), Action Log, player popovers with Win Rate/Add Friend/Block, signal strength indicators.

## File Structure
```
dominoes-app/
├── backend/
│   ├── index.js              # Server entry point + socket events
│   ├── game.js               # Domino game logic (modes, scoring, turns)
│   ├── RoomManager.js         # Room lifecycle management
│   ├── BotAI.js              # AI bot logic
│   ├── db.js                 # MS SQL Server connection pool (MSSQL)
│   ├── init_db.js            # Database migration script
│   ├── engine/
│   │   ├── ScoreCalculator.js # All Fives + round-end scoring
│   │   ├── MoveValidator.js   # Move validation logic
│   │   ├── TurnManager.js     # Turn order management
│   │   ├── InputValidator.js  # Input sanitization
│   │   └── GameStateSerializer.js # State serialization
│   ├── routes/
│   │   ├── auth.js           # Auth API routes (login, register, guest, OTP, profile)
│   │   ├── admin.js          # Admin API (users, stickers, store CRUD)
│   │   ├── store.js          # Public store API (items, buy)
│   │   └── tournaments.js    # Tournament API (list, join, create, delete)
│   ├── swagger.json          # API documentation
│   ├── .env                  # DB_SERVER, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               # Router (Auth, Home, Lobby, Room, Store, Inventory, Profile, Friends, Tournament, Admin)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx    # User state management (login, register, guest, OTP)
│   │   │   └── SocketContext.tsx  # Socket.io connection
│   │   ├── components/
│   │   │   ├── Domino.tsx        # Domino bone component
│   │   │   ├── Domino.css
│   │   │   ├── BoardLayout.tsx   # Snake-algorithm board rendering
│   │   │   ├── DealingBoard.tsx  # Dealing animation component
│   │   │   └── DashboardLayout.tsx # Unified sidebar/header layout
│   │   └── pages/
│   │       ├── Auth.tsx          # Login/Register/OTP
│   │       ├── Home.tsx          # Landing page
│   │       ├── Lobby.tsx         # Game lobby (create/join rooms)
│   │       ├── Room.tsx          # Pre-game room (teams, chat, start)
│   │       ├── Gameplay.tsx      # In-game UI (+ Gameplay.css)
│   │       ├── Store.tsx         # Cosmetic store (+ Store.css)
│   │       ├── Inventory.tsx     # Equipped skins
│   │       ├── Profile.tsx       # User profile
│   │       ├── Friends.tsx       # Social/Friends page
│   │       ├── Tournament.tsx    # Tournament listing
│   │       └── Admin.tsx         # Admin dashboard
│   ├── index.html
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── docs/
│   └── tasks_agents_breakdown.md
└── AI_MEMORY.md
```

## Socket Events (Backend)
- `connection`, `disconnect`
- `getRooms`, `roomsUpdated`
- `createRoom`, `createSinglePlayer`, `joinRoom`, `joinByCode`, `leaveRoom`, `roomJoined`, `roomUpdated`
- `kickPlayer`, `kicked`
- `switchTeam`
- `chatMessage`, `sendEmoji`, `emojiReceived`, `sendSticker`, `stickerReceived`
- `startGame`, `gameStarted`
- `dealPhaseStart`, `misdealReveal`, `dealComplete`, `dealing_animation_complete`
- `drawPhaseStart`, `drawBone`, `boneDrawn`
- `playBone`, `nextRound`
- `gameState`, `moveError`, `roundEnd`, `matchOver`
- `turnTimerStart`, `turnTimerTick`, `playerAutoAction`
- `playerPassed`, `roomDestroyed`, `matchAborted`

## Note to AIs
When working on this project:
- **CSS**: The Gameplay page uses vanilla CSS (`Gameplay.css`). All other dashboard pages use Tailwind CSS utility classes with the "Domino Orbit" design system.
- **TypeScript**: Frontend uses TypeScript (.tsx). Use `as any` casts for socket/auth contexts if strict typing causes issues.
- **Layout**: ALL authenticated pages MUST be wrapped in `<DashboardLayout>` component to maintain the unified sidebar. The Gameplay screen is the ONLY exception — it renders fullscreen without the layout.
- **WebSockets**: Ensure `socket.emit` and `socket.on` listeners are properly cleaned up in React `useEffect` return functions to prevent memory leaks.
- **Testing**: Start the backend (`npm run start` in /backend) and frontend (`npm run dev` in /frontend) simultaneously. Backend runs on port 5001, frontend on port 3000.
- **Database**: MS SQL Server (Azure SQL). Run `node init_db.js` to create/migrate tables. The `db.js` wrapper translates PostgreSQL-style `$1` parameters to MSSQL format automatically.
- **Store/Inventory**: Store items come from the DB via `/store/items` API. Equipped skin IDs persist in `localStorage`. Guests are blocked from Store and Inventory pages.
- **Game Modes Logic**: 
  - **Classic (Normal)**: Standard draw-game rules. Draw from boneyard when blocked.
  - **Block**: NO drawing from boneyard. Player passes if blocked. Game ends when all players are blocked.
  - **All Fives**: Score points when open ends sum to a multiple of 5. Doubles count both pips on the exposed end.
