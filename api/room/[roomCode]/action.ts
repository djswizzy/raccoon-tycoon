import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGame, setGameState } from '../../store.js'
import type { GameState, Commodity } from '../../../lib/types.js'
import {
  actionProduction,
  actionSell,
  actionDiscard,
  actionBuyBuilding,
  actionUpgradeBBuilding,
  actionSetActiveBpBuilding,
  actionBuyTown,
  startAuction,
  placeBid,
  passAuction,
  actionEndTurn,
  formatActionMessage,
} from '../../../lib/gameLogic.js'

interface LogEntry {
  id: string
  playerIndex: number
  message: string
  timestamp: number
}

interface RoomData {
  players: Array<{ id: string; name: string; index: number }>
  gameState: GameState | null
  gameLog: LogEntry[]
  status: 'waiting' | 'playing'
}

function pushLogEntry(roomData: RoomData, playerIndex: number, type: string, payload: Record<string, unknown>, stateBefore: GameState, stateAfter: GameState) {
  const message = formatActionMessage({ type, ...payload }, stateAfter, stateBefore)
  roomData.gameLog.push({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    playerIndex,
    message,
    timestamp: Date.now(),
  })
}

function applyAction(state: GameState, type: string, payload: Record<string, unknown>): GameState {
  switch (type) {
    case 'production':
      return actionProduction(state, payload.cardIndex as number, payload.commoditiesToTake as Commodity[] | undefined, payload.tradingFloorPurchase as { fromPlayerIndex: number; commodity: Commodity; quantity: number } | undefined)
    case 'sell':
      return actionSell(state, payload.commodity as Parameters<typeof actionSell>[1], payload.quantity as number, payload.useExportCompany as boolean | undefined)
    case 'discard':
      return actionDiscard(state, payload.commodity as Parameters<typeof actionDiscard>[1])
    case 'buyBuilding':
      return actionBuyBuilding(state, payload.buildingIndex as number)
    case 'upgradeBBuilding':
      return actionUpgradeBBuilding(state, payload.buildingId as string)
    case 'setActiveBpBuilding':
      return actionSetActiveBpBuilding(state, payload.buildingId as string)
    case 'buyTown':
      return actionBuyTown(state, payload.useSpecific as boolean, payload.commoditiesToSpend as Partial<Record<string, number>> | undefined)
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
    if (!roomData.gameLog) roomData.gameLog = []
    let nextState = roomData.gameState
    if (applyFirst) {
      const firstPayload = applyFirst.payload ?? {}
      const stateAfterFirst = applyAction(nextState, applyFirst.type, firstPayload)
      if (applyFirst.type !== 'endTurn' && applyFirst.type !== 'placeBid' && applyFirst.type !== 'passAuction') {
        pushLogEntry(roomData, player.index, applyFirst.type, firstPayload, nextState, stateAfterFirst)
      }
      nextState = stateAfterFirst
    }
    const stateBeforeMain = nextState
    const mainPayload = payload ?? {}
    nextState = applyAction(nextState, type, mainPayload)
    if (type !== 'endTurn' && type !== 'placeBid' && type !== 'passAuction') {
      pushLogEntry(roomData, player.index, type, mainPayload, stateBeforeMain, nextState)
    }
    // Log auction result as soon as auction completes (placeBid or passAuction resolved it)
    const auctionResult = nextState.lastAuctionResult
    if (auctionResult) {
      const winnerName = nextState.players[auctionResult.winnerIndex]?.name ?? 'Player'
      roomData.gameLog.push({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        playerIndex: auctionResult.winnerIndex,
        message: `${winnerName} won ${auctionResult.railroadName} for $${auctionResult.amount}`,
        timestamp: Date.now(),
      })
      delete (nextState as unknown as Record<string, unknown>).lastAuctionResult
    }
    roomData.gameState = nextState
    setGameState(roomCode, roomData)
    return res.status(200).json({ gameState: nextState, gameLog: roomData.gameLog })
  } catch (e) {
    return res.status(400).json({ error: (e as Error)?.message || 'Action failed' })
  }
}
