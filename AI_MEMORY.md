# Dominoes App - AI Memory & Context File

## Project Overview
This project is a real-time multiplayer Dominoes **web application**. It is designed to run in any modern browser and is fully responsive across desktop, tablet, and phone screen sizes.

## Architecture & Stack
- **Backend:** Node.js, Express, Socket.io
  - Located in the `/backend` directory.
  - Core game logic (`game.js`) handles deck generation, shuffling, valid moves, turn management, scoring (Normal, All Fives, Blocking), team modes, and win conditions.
  - `RoomManager.js` manages dynamic rooms, player connections, and game instances.
  - `routes/auth.js` handles JWT-based registration, login, and session management.
  - `init_db.js` creates PostgreSQL tables (Users, GameHistory, PlayerGameStats).
  - `db.js` provides the PostgreSQL connection pool via `pg`.
  - Server entry point (`index.js`) manages WebSocket connections, player lobbies, room events (create, join, leave, kick, team switch, chat), and broadcasts game state updates.
- **Frontend:** React, TypeScript, Vite, Socket.io-client, Vanilla CSS
  - Located in the `/frontend` directory.
  - Uses modern UI/UX design with glassmorphism, responsive grid layouts, CSS animations, and dark mode.
  - Custom React component for Dominoes (`Domino.tsx` & `Domino.css`) using solely CSS to draw dots dynamically.
  - Responsive design with CSS media queries for desktop (>1024px), tablet (768-1024px), and phone (<768px) breakpoints.
  - All components are TypeScript (`.tsx`): Auth, Lobby, Room, Gameplay, Store, Inventory.

## Database
- **PostgreSQL via Supabase**
- Connection string stored in `backend/.env` as `DATABASE_URL`
- Host: `db.loqdkjhrnlgyxbsvasdv.supabase.co` (may need IPv4 pooler URL if DNS fails)
- Tables: `users`, `game_history`, `player_game_stats`
- **Note:** DNS resolution may fail locally; run the SQL from `init_db.js` manually in Supabase SQL Editor if needed.

## Current State & Features Implemented
1. **Authentication:** JWT-based login/registration for authorized users, guest play mode.
2. **Lobby System:** Public rooms list, private room join by custom password (minimum 4 chars), room creation with custom settings.
3. **Room System:** Host controls (start game, kick players), team picking (Team 1 / Team 2), chat.
4. **Game Modes:** Normal, All Fives (multiples of 5 scoring), Blocking Mode.
5. **Team Modes:** Free For All, Team Mode (2 vs 2).
6. **Target Score:** Fully customizable by room host.
7. **Drag and Drop:** Players can drag dominos from their hand to left/right drop zones on the board, with click fallback.
8. **Real-time Multiplayer:** Full Socket.io sync for all game actions, board updates, scoring, and chat.
9. **XP & Ranking:** Authorized users earn XP per game, ranks increase automatically based on XP thresholds.
10. **Store:** Free cosmetic skins (6 domino skins, 6 table backgrounds). Guests cannot access.
11. **Inventory:** Players can equip owned skins. Equipped skins persist via localStorage. Guests blocked.
12. **Responsive Web Design:** All pages adapt to desktop, tablet, and phone screen sizes.
13. **Opponent Tracking:** Shows opponent bone counts and active turn indicator.
14. **Round & Match End Screens:** Animated modals showing scores and winners.
15. **Admin & Moderation:** Admin dashboard for user ban/deletion, chat word filtering, custom UI stickers (Base64 uploads w/ permissions).

## File Structure
```
dominoes-app/
├── backend/
│   ├── index.js          # Server entry point + socket events
│   ├── game.js           # Domino game logic (modes, scoring, turns)
│   ├── RoomManager.js    # Room lifecycle management
│   ├── db.js             # PostgreSQL connection pool
│   ├── init_db.js        # Database migration script
│   ├── routes/auth.js    # Auth API routes
│   ├── .env              # DATABASE_URL, PORT, JWT_SECRET
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx           # Router (Auth, Lobby, Room, Store, Inventory)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx    # User state management
│   │   │   └── SocketContext.tsx  # Socket.io connection
│   │   ├── components/
│   │   │   ├── Domino.tsx        # Domino bone component
│   │   │   └── Domino.css
│   │   └── pages/
│   │       ├── Auth.tsx / Auth.css
│   │       ├── Lobby.tsx / Lobby.css
│   │       ├── Room.tsx / Room.css
│   │       ├── Gameplay.tsx / Gameplay.css
│   │       ├── Store.tsx / Store.css
│   │       └── Inventory.tsx / Inventory.css
│   ├── index.html
│   ├── tsconfig.json
│   └── package.json
└── AI_MEMORY.md
```

## Socket Events (Backend)
- `connection`, `disconnect`
- `getRooms`, `roomsUpdated`
- `createRoom`, `joinRoom`, `leaveRoom`, `roomJoined`, `roomUpdated`
- `kickPlayer`, `kicked`
- `switchTeam`
- `chatMessage`
- `startGame`, `gameStarted`
- `playBone`, `drawBone`, `nextRound`
- `gameState`, `moveError`, `roundEnd`, `matchOver`

## Note to AIs
When working on this project:
- **CSS**: We use vanilla CSS and prefer modern, premium aesthetics (dark mode, glass effects). Not relying on Tailwind.
- **TypeScript**: Frontend uses TypeScript (.tsx). Use `as any` casts for socket/auth contexts if strict typing causes issues.
- **WebSockets**: Ensure `socket.emit` and `socket.on` listeners are properly cleaned up in React `useEffect` hooks to prevent memory leaks.
- **Testing**: Start the backend (`node index.js`) and frontend (`npm run dev`) simultaneously on different ports (usually 5000 and 5173).
- **Database**: The Supabase connection may fail with ENOENT if DNS can't resolve the host. Use `init_db.js` SQL manually in Supabase SQL Editor as fallback.
- **Store/Inventory**: Skin data is stored in `localStorage`. Guests are blocked from Store and Inventory pages.
