import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'
import { randomBytes } from 'crypto'
import type { GameState } from '../src/types'
import { initGame } from '../src/gameLogic'
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
} from '../src/gameLogic'

const PORT = 3001
const APP_ORIGIN = 'http://localhost:5174'

function shortCode() {
  return randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
}

function makePlayerId() {
  return randomBytes(12).toString('hex')
}

interface RoomPlayer {
  id: string
  name: string
  index: number
}

interface Room {
  players: RoomPlayer[]
  gameState: GameState | null
  status: 'waiting' | 'playing'
}

const rooms = new Map<string, Room>()

function getOrCreateRoom(roomCode: string): Room {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, { players: [], gameState: null, status: 'waiting' })
  }
  return rooms.get(roomCode)!
}

const app = express()
app.use(express.json())
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', APP_ORIGIN)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }
  next()
})

app.post('/api/room/create', (req, res) => {
  const { playerName } = req.body
  const name = (playerName || 'Player 1').trim().slice(0, 20) || 'Player 1'
  const roomCode = shortCode()
  const playerId = makePlayerId()
  const room = getOrCreateRoom(roomCode)
  room.players.push({ id: playerId, name, index: 0 })
  res.json({ roomCode, playerId, playerIndex: 0 })
})

app.post('/api/room/join', (req, res) => {
  const { roomCode, playerName } = req.body
  const code = String(roomCode || '').toUpperCase().trim()
  const name = (playerName || 'Player').trim().slice(0, 20) || 'Player'
  if (!code || code.length !== 6) {
    res.status(400).json({ error: 'Invalid room code' })
    return
  }
  const room = getOrCreateRoom(code)
  if (room.status === 'playing') {
    res.status(400).json({ error: 'Game already started' })
    return
  }
  if (room.players.length >= 5) {
    res.status(400).json({ error: 'Room is full' })
    return
  }
  const playerIndex = room.players.length
  const playerId = makePlayerId()
  room.players.push({ id: playerId, name, index: playerIndex })
  res.json({ roomCode: code, playerId, playerIndex })
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: [APP_ORIGIN, 'http://127.0.0.1:5174', 'http://localhost:5173', 'http://127.0.0.1:5173'] },
})

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getOrCreateRoom(roomCode)
    const player = room.players.find((p) => p.id === playerId)
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' })
      return
    }
    socket.join(roomCode)
    ;(socket as any).roomCode = roomCode
    ;(socket as any).playerId = playerId
    socket.emit('joined', { roomCode, playerIndex: player.index })
    io.to(roomCode).emit('room-update', {
      players: room.players.map((p) => ({ name: p.name, index: p.index })),
      status: room.status,
      gameState: room.gameState,
    })
  })

  socket.on('start-game', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getOrCreateRoom(roomCode)
    if (room.status !== 'waiting') return
    const host = room.players.find((p) => p.id === playerId)
    if (!host || host.index !== 0) {
      socket.emit('error', { message: 'Only host can start' })
      return
    }
    const names = [...room.players].sort((a, b) => a.index - b.index).map((p) => p.name)
    room.gameState = initGame(room.players.length, names)
    room.status = 'playing'
    io.to(roomCode).emit('game-state', room.gameState)
  })

  socket.on(
    'action',
    ({
      roomCode,
      playerId,
      type,
      payload,
      applyFirst,
    }: {
      roomCode: string
      playerId: string
      type: string
      payload: Record<string, unknown>
      applyFirst?: { type: string; payload: Record<string, unknown> }
    }) => {
      const room = getOrCreateRoom(roomCode)
      if (room.status !== 'playing' || !room.gameState) return
      const player = room.players.find((p) => p.id === playerId)
      if (!player) return
      if (room.gameState.currentPlayerIndex !== player.index) {
        socket.emit('error', { message: 'Not your turn' })
        return
      }

      const apply = (s: GameState, t: string, p: Record<string, unknown>): GameState => {
        switch (t) {
          case 'production':
            return actionProduction(s, p.cardIndex as number, p.commoditiesToTake as string[] | undefined)
          case 'sell':
            return actionSell(s, p.commodity as Parameters<typeof actionSell>[1], p.quantity as number)
          case 'discard':
            return actionDiscard(s, p.commodity as Parameters<typeof actionDiscard>[1])
          case 'buyBuilding':
            return actionBuyBuilding(s, p.buildingIndex as number)
          case 'buyTown':
            return actionBuyTown(s, p.useSpecific as boolean)
          case 'startAuction':
            return startAuction(s, p.railroadIndex as number)
          case 'placeBid':
            return placeBid(s, p.amount as number)
          case 'passAuction':
            return passAuction(s)
          case 'endTurn':
            return actionEndTurn(s)
          default:
            return s
        }
      }

      try {
        let next = room.gameState
        if (applyFirst) {
          next = apply(next, applyFirst.type, applyFirst.payload)
        }
        next = apply(next, type, payload)
        room.gameState = next
        io.to(roomCode).emit('game-state', next)
      } catch (e) {
        socket.emit('error', { message: (e as Error)?.message || 'Action failed' })
      }
    }
  )
})

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
