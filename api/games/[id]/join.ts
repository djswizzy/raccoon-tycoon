import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGame, addPlayerToken } from '../../store.js';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * POST /api/games/[id]/join
 * Body: { name: string }
 * Returns: { playerToken }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gameId = req.query.id as string;
  const { name = 'Player' } = (req.body || {}) as { name?: string };

  if (!gameId) {
    return res.status(400).json({ error: 'Missing game id' });
  }

  const row = getGame(gameId);
  if (!row) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const state = row.state as { players: { name: string }[] };
  const nextIndex = state.players.findIndex((p: { name: string }) => p.name === 'Waiting');
  if (nextIndex === -1) {
    return res.status(400).json({ error: 'Game is full' });
  }

  state.players[nextIndex].name = name;
  const playerToken = randomId();
  addPlayerToken(gameId, playerToken);

  return res.status(200).json({ playerToken, playerIndex: nextIndex });
}
