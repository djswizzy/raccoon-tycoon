import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGame } from '../store.js'

interface RoomData {
  players: Array<{ id: string; name: string; index: number }>
  gameState: any
  status: 'waiting' | 'playing'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const roomCode = req.query.roomCode as string
  if (!roomCode) {
    return res.status(400).json({ error: 'Missing room code' })
  }

  const row = getGame(roomCode)
  if (!row) {
    return res.status(404).json({ error: 'Room not found' })
  }

  const roomData = row.state as RoomData
  const playerId = req.query.playerId as string | undefined

  // Verify player is in room
  if (playerId && !roomData.players.find(p => p.id === playerId)) {
    return res.status(403).json({ error: 'Player not in room' })
  }

  return res.status(200).json({
    players: roomData.players.map(p => ({ name: p.name, index: p.index })),
    status: roomData.status,
    gameState: roomData.gameState,
  })
}
