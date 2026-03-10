import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Domino from './components/Domino';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('gameState', (state) => setGameState(state));
    socket.on('moveError', (err) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    });
    socket.on('error', (err) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('gameState');
      socket.off('moveError');
      socket.off('error');
    };
  }, []);

  const joinGame = () => {
    socket.emit('joinGame');
    setJoined(true);
  };

  const startGame = () => {
    socket.emit('startGame');
  };

  const playBone = (bone, end) => {
    socket.emit('playBone', { bone, end });
  };

  const drawBone = () => {
    socket.emit('drawBone');
  };

  if (!joined) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <h1>Dominoes Master</h1>
          <p>Join a real-time multiplayer domino match.</p>
          <button onClick={joinGame} className="primary-btn">Join Game</button>
        </div>
      </div>
    );
  }

  if (!gameState || gameState.state === 'waiting') {
    return (
      <div className="waiting-screen">
        <div className="waiting-card">
          <h2>Waiting for players...</h2>
          <p>You have joined the lobby.</p>
          <button onClick={startGame} className="primary-btn">Start Game</button>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.turn === socket.id;

  return (
    <div className="game-container">
      <header className="game-header">
        <h2>{isMyTurn ? "Your Turn!" : "Waiting for opponent..."}</h2>
        <div className="deck-info">
          Deck: {gameState.deckCount} bones
        </div>
        {gameState.deckCount > 0 && isMyTurn && (
          <button className="secondary-btn" onClick={drawBone}>Draw Bone</button>
        )}
      </header>

      {error && <div className="error-toast">{error}</div>}

      <div className="opponents">
        {Object.entries(gameState.opponents).map(([id, count]) => (
          <div key={id} className="opponent-card">
            <span>Opponent</span>
            <span className="bone-count">{count} bones</span>
          </div>
        ))}
      </div>

      <div className="board">
        <div className="board-scroll">
          {gameState.board.length === 0 ? (
            <div className="empty-board">Play your first domino here!</div>
          ) : (
            gameState.board.map((bone, idx) => (
              <div key={idx} className="board-bone">
                <Domino bone={bone} isHorizontal />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="player-hand">
        <h3>Your Hand</h3>
        <div className="hand-container">
          {gameState.hand.map((bone, idx) => (
            <div key={idx} className="hand-bone-wrapper">
              <Domino
                bone={bone}
                isInteractive={isMyTurn}
                onClick={() => {
                  if (isMyTurn) {
                    if (gameState.board.length === 0) {
                      playBone(bone, 'right');
                    } else {
                      // Prompt user where to play if multiple choices
                      const leftEnd = gameState.board[0].left;
                      const rightEnd = gameState.board[gameState.board.length - 1].right;

                      const canLeft = bone.left === leftEnd || bone.right === leftEnd;
                      const canRight = bone.left === rightEnd || bone.right === rightEnd;

                      if (canLeft && canRight && leftEnd !== rightEnd) {
                        const side = window.confirm("Play on left? (Cancel for right)") ? 'left' : 'right';
                        playBone(bone, side);
                      } else if (canLeft) {
                        playBone(bone, 'left');
                      } else if (canRight) {
                        playBone(bone, 'right');
                      } else {
                        playBone(bone, 'left'); // let server reject
                      }
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
