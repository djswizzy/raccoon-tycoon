import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGame } from '../store';

/**
 * GET /api/games/[id]
 * Returns current game state (for initial load and polling).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gameId = req.query.id as string;
  if (!gameId) {
    return res.status(400).json({ error: 'Missing game id' });
  }

  const row = getGame(gameId);
  if (!row) {
    return res.status(404).json({ error: 'Game not found' });
  }

  return res.status(200).json(row.state);
}
