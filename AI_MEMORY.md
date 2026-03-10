# Dominoes App - AI Memory & Context File

## Project Overview
This project is a real-time multiplayer Dominoes game. It is designed to work on both the Web and as a Mobile App (via Android PWA).

## Architecture & Stack
- **Backend:** Node.js, Express, Socket.io
  - Located in the `/backend` directory.
  - Core game logic (`game.js`) handles deck generation, shuffling, valid moves, turn management, and win conditions.
  - Server entry point (`index.js`) manages WebSocket connections, player lobbies, and broadcasts game state updates.
- **Frontend:** React, Vite, Socket.io-client, Vanilla CSS
  - Located in the `/frontend` directory.
  - Uses modern UI/UX design with glassmorphism, responsive grid layouts, and CSS animations.
  - Custom React component for Dominoes (`Domino.jsx` & `Domino.css`) using solely CSS to draw dots dynamically based on bone values.
  - Configured with `vite-plugin-pwa` for Android installation (Progressive Web App).

## Current State & Features Implemented
1. **Multiplayer Sync:** Two or more players can join a lobby, and state is synchronized in real-time.
2. **Game Rules:** Validates placement of dominoes on the left or right ends of the board.
3. **Turn-based Locking:** Players can only play or draw on their turn.
4. **Drawing Mechanism:** If a player has no valid moves, they can draw from the boneyard. If the boneyard empty, turn passes.
5. **Opponent Tracking:** Shows the number of bones opponents have left.

## Future Development Ideas / Next Steps
- Implementing specific rules sets (like "All Fives" scoring or "Draw" dominoes ending rules).
- Adding animations for dealing bones.
- Creating persistent user accounts and leaderboards (via MongoDB or PostgreSQL).
- Expanding the PWA into a true native wrapper (e.g., Capacitor) if required for App Store deployment.

## Note to AIs
When working on this project:
- *CSS*: We use vanilla CSS and prefer modern, premium aesthetics (dark mode, glass effects). Not relying on Tailwind right now.
- *WebSockets*: Ensure `socket.emit` and `socket.on` listeners are properly cleaned up in React `useEffect` hooks to prevent memory leaks.
- *Testing*: Start the backend (`node index.js`) and frontend (`npm run dev`) simultaneously on different ports (usually 3001 and 5173/5174).
