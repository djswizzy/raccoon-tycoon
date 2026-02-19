import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setGame } from '../store.js'
import type { GameState } from '../../lib/types.js'

function shortCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function makePlayerId() {
  return Math.random().toString(36).slice(2, 14)
}

interface RoomData {
  players: Array<{ id: string; name: string; index: number }>
  gameState: GameState | null
  status: 'waiting' | 'playing'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { playerName } = (req.body || {}) as { playerName?: string }
  const name = (playerName || 'Player 1').trim().slice(0, 20) || 'Player 1'
  const roomCode = shortCode()
  const playerId = makePlayerId()

  const roomData: RoomData = {
    players: [{ id: playerId, name, index: 0 }],
    gameState: null,
    status: 'waiting',
  }

  // Store player tokens separately - playerId is the token
  setGame(roomCode, roomData, [playerId])

  return res.status(200).json({ roomCode, playerId, playerIndex: 0 })
}
