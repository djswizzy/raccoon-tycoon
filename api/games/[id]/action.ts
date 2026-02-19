import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGame, setGameState } from '../../store';

/**
 * POST /api/games/[id]/action
 * Body: { playerToken: string, action: string, payload?: object }
 * Returns: new game state (or 400 if invalid).
 *
 * Actions: 'production' | 'sell' | 'startAuction' | 'placeBid' | 'passAuction'
 *          | 'buyBuilding' | 'buyTown' | 'discard'
 *
 * TODO: Import your real game logic (initGame, actionProduction, actionSell, etc.)
 * and validate playerToken matches current player, then apply the action and persist.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gameId = req.query.id as string;
  const { playerToken, action, payload } = (req.body || {}) as {
    playerToken?: string;
    action?: string;
    payload?: unknown;
  };

  if (!gameId || !playerToken || !action) {
    return res.status(400).json({ error: 'Missing gameId, playerToken, or action' });
  }

  const row = getGame(gameId);
  if (!row) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // TODO: Map playerToken to player index (e.g. row.playerTokens.indexOf(playerToken))
  // and ensure it's that player's turn. Then call the right action, e.g.:
  // let newState = row.state;
  // if (action === 'production') newState = actionProduction(newState, payload.cardIndex, payload.commoditiesToTake);
  // else if (action === 'sell') newState = actionSell(newState, payload.commodity, payload.quantity);
  // ... etc.
  // setGameState(gameId, newState);
  // return res.status(200).json(newState);

  return res.status(501).json({
    error: 'Not implemented: wire api to your game logic (see docs/MULTIPLAYER_VERCEL.md)',
    received: { action, payload },
  });
}
