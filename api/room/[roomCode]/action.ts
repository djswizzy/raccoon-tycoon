import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGame, setGameState } from '../../store.js'
import type { GameState } from '../../../lib/types.js'
import {
  actionProduction,
  actionSell,
  actionDiscard,
  actionBuyBuilding,
  actionBuyTown,
  startAuction,
  placeBid,
  passAuction,
  actionEndTurn,
} from '../../../lib/gameLogic.js'

interface RoomData {
  players: Array<{ id: string; name: string; index: number }>
  gameState: GameState | null
  status: 'waiting' | 'playing'
}

function applyAction(state: GameState, type: string, payload: Record<string, unknown>): GameState {
  switch (type) {
    case 'production':
      return actionProduction(state, payload.cardIndex as number, payload.commoditiesToTake as string[] | undefined)
    case 'sell':
      return actionSell(state, payload.commodity as Parameters<typeof actionSell>[1], payload.quantity as number)
    case 'discard':
      return actionDiscard(state, payload.commodity as Parameters<typeof actionDiscard>[1])
    case 'buyBuilding':
      return actionBuyBuilding(state, payload.buildingIndex as number)
    case 'buyTown':
      return actionBuyTown(state, payload.useSpecific as boolean)
    case 'startAuction':
      return startAuction(state, payload.railroadIndex as number)
    case 'placeBid':
      return placeBid(state, payload.amount as number)
    case 'passAuction':
      return passAuction(state)
    case 'endTurn':
      return actionEndTurn(state)
    default:
      throw new Error(`Unknown action type: ${type}`)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const roomCode = req.query.roomCode as string
  const { playerId, type, payload, applyFirst } = (req.body || {}) as {
    playerId?: string
    type?: string
    payload?: Record<string, unknown>
    applyFirst?: { type: string; payload: Record<string, unknown> }
  }

  if (!roomCode || !playerId || !type) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const row = getGame(roomCode)
  if (!row) {
    return res.status(404).json({ error: 'Room not found' })
  }

  const roomData = row.state as RoomData
  if (roomData.status !== 'playing' || !roomData.gameState) {
    return res.status(400).json({ error: 'Game not started' })
  }

  const player = roomData.players.find(p => p.id === playerId)
  if (!player) {
    return res.status(403).json({ error: 'Player not found in room' })
  }

  if (roomData.gameState.currentPlayerIndex !== player.index) {
    return res.status(403).json({ error: 'Not your turn' })
  }

  try {
    let nextState = roomData.gameState
    if (applyFirst) {
      nextState = applyAction(nextState, applyFirst.type, applyFirst.payload)
    }
    nextState = applyAction(nextState, type, payload)
    roomData.gameState = nextState
    setGameState(roomCode, roomData)
    return res.status(200).json(nextState)
  } catch (e) {
    return res.status(400).json({ error: (e as Error)?.message || 'Action failed' })
  }
}
