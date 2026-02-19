import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGame, setGameState } from '../../store'
import { initGame } from '../../../src/gameLogic'

interface RoomData {
  players: Array<{ id: string; name: string; index: number }>
  gameState: any
  status: 'waiting' | 'playing'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const roomCode = req.query.roomCode as string
  const { playerId } = (req.body || {}) as { playerId?: string }

  if (!roomCode || !playerId) {
    return res.status(400).json({ error: 'Missing room code or player ID' })
  }

  const row = getGame(roomCode)
  if (!row) {
    return res.status(404).json({ error: 'Room not found' })
  }

  const roomData = row.state as RoomData
  if (roomData.status !== 'waiting') {
    return res.status(400).json({ error: 'Game already started' })
  }

  const host = roomData.players.find(p => p.id === playerId)
  if (!host || host.index !== 0) {
    return res.status(403).json({ error: 'Only host can start' })
  }

  if (roomData.players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players' })
  }

  const names = [...roomData.players].sort((a, b) => a.index - b.index).map(p => p.name)
  roomData.gameState = initGame(roomData.players.length, names)
  roomData.status = 'playing'
  setGameState(roomCode, roomData)

  return res.status(200).json(roomData.gameState)
}
