import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGame, setGameState, addPlayerToken } from '../store'

function makePlayerId() {
  return Math.random().toString(36).slice(2, 14)
}

interface RoomData {
  players: Array<{ id: string; name: string; index: number }>
  gameState: any
  status: 'waiting' | 'playing'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { roomCode, playerName } = (req.body || {}) as { roomCode?: string; playerName?: string }
  const code = String(roomCode || '').toUpperCase().trim()
  const name = (playerName || 'Player').trim().slice(0, 20) || 'Player'

  if (!code || code.length !== 6) {
    return res.status(400).json({ error: 'Invalid room code' })
  }

  const row = getGame(code)
  if (!row) {
    return res.status(404).json({ error: 'Room not found' })
  }

  const roomData = row.state as RoomData
  if (roomData.status === 'playing') {
    return res.status(400).json({ error: 'Game already started' })
  }
  if (roomData.players.length >= 5) {
    return res.status(400).json({ error: 'Room is full' })
  }

  const playerIndex = roomData.players.length
  const playerId = makePlayerId()
  roomData.players.push({ id: playerId, name, index: playerIndex })
  setGameState(code, roomData)
  addPlayerToken(code, playerId)

  return res.status(200).json({ roomCode: code, playerId, playerIndex })
}
