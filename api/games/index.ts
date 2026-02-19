import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGame, setGame } from '../store.js';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * POST /api/games
 * Body: { numPlayers: number, playerName: string }
 * Returns: { gameId, playerToken }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { numPlayers = 3, playerName = 'Player 1' } = (req.body || {}) as {
    numPlayers?: number;
    playerName?: string;
  };

  const gameId = randomId();
  const playerToken = randomId();

  // TODO: Replace with real initGame from your game logic and persist state.
  // Example: const state = initGame(numPlayers, [playerName, ...Array(numPlayers - 1).fill('Waiting')]);
  const state = {
    phase: 'playing',
    players: Array.from({ length: numPlayers }, (_, i) => ({
      id: `player-${i}`,
      name: i === 0 ? playerName : 'Waiting',
      money: 10,
      commodities: {},
      hand: [],
      railroads: [],
      towns: [],
      buildings: [],
    })),
    currentPlayerIndex: 0,
    roundStartIndex: 0,
    market: { wheat: 1, wood: 1, iron: 2, coal: 2, goods: 3, luxury: 3 },
    numPlayers,
  };

  setGame(gameId, state, [playerToken]);

  return res.status(200).json({ gameId, playerToken });
}
