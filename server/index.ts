import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'
import { randomBytes } from 'crypto'
import type { GameState } from '../lib/types'
import {
  initGame,
  applyGameAction,
  formatActionMessage,
  type GameAction,
} from '../lib/gameLogic'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5174,http://localhost:5173,http://127.0.0.1:5174,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function shortCode() {
  return randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
}

function makePlayerId() {
  return randomBytes(12).toString('hex')
}

interface LogEntry {
  id: string
  playerIndex: number
  message: string
  timestamp: number
}

interface RoomPlayer {
  id: string
  name: string
  index: number
}

interface Room {
  players: RoomPlayer[]
  gameState: GameState | null
  gameLog: LogEntry[]
  status: 'waiting' | 'playing'
}

const rooms = new Map<string, Room>()

function getOrCreateRoom(roomCode: string): Room {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, { players: [], gameState: null, gameLog: [], status: 'waiting' })
  }
  return rooms.get(roomCode)!
}

function pushLogEntry(room: Room, playerIndex: number, type: string, payload: Record<string, unknown>, stateBefore: GameState, stateAfter: GameState) {
  const message = formatActionMessage({ type, ...payload }, stateAfter, stateBefore)
  room.gameLog.push({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    playerIndex,
    message,
    timestamp: Date.now(),
  })
}

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  const origin = req.headers.origin
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allow)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning, User-Agent')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }
  next()
})

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Game API', docs: 'Use the app at your Vercel URL; this is the API only.' })
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

app.get('/api/room/:roomCode', (req, res) => {
  const roomCode = (req.params.roomCode || '').toUpperCase().trim()
  if (!roomCode) {
    res.status(400).json({ error: 'Missing room code' })
    return
  }
  const room = rooms.get(roomCode)
  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  const playerId = req.query.playerId as string | undefined
  if (playerId && !room.players.some((p) => p.id === playerId)) {
    res.status(403).json({ error: 'Player not in room' })
    return
  }
  res.json({
    players: room.players.map((p) => ({ name: p.name, index: p.index })),
    status: room.status,
    gameState: room.gameState,
    gameLog: room.gameLog ?? [],
  })
})

app.post('/api/room/:roomCode/start', (req, res) => {
  const roomCode = (req.params.roomCode || '').toUpperCase().trim()
  const { playerId } = req.body || {}
  if (!roomCode || !playerId) {
    res.status(400).json({ error: 'Missing room code or player ID' })
    return
  }
  const room = rooms.get(roomCode)
  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  if (room.status !== 'waiting') {
    res.status(400).json({ error: 'Game already started' })
    return
  }
  const host = room.players.find((p) => p.id === playerId)
  if (!host || host.index !== 0) {
    res.status(403).json({ error: 'Only host can start' })
    return
  }
  if (room.players.length < 2) {
    res.status(400).json({ error: 'Need at least 2 players' })
    return
  }
  const names = [...room.players].sort((a, b) => a.index - b.index).map((p) => p.name)
  room.gameState = initGame(room.players.length, names)
  room.gameLog = []
  room.status = 'playing'
  res.json(room.gameState)
})

app.post('/api/room/:roomCode/action', (req, res) => {
  const roomCode = (req.params.roomCode || '').toUpperCase().trim()
  const { playerId, type, payload, applyFirst } = req.body || {}
  if (!roomCode || !playerId || !type) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  const room = rooms.get(roomCode)
  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  if (room.status !== 'playing' || !room.gameState) {
    res.status(400).json({ error: 'Game not started' })
    return
  }
  const player = room.players.find((p) => p.id === playerId)
  if (!player) {
    res.status(403).json({ error: 'Player not found in room' })
    return
  }
  if (room.gameState.currentPlayerIndex !== player.index) {
    res.status(403).json({ error: 'Not your turn' })
    return
  }
  try {
    const action: GameAction = { type, ...payload } as GameAction
    let nextState = room.gameState
    if (applyFirst && applyFirst.type) {
      const firstAction: GameAction = { type: applyFirst.type, ...applyFirst.payload } as GameAction
      nextState = applyGameAction(nextState, firstAction)
      if (firstAction.type !== 'endTurn' && firstAction.type !== 'placeBid' && firstAction.type !== 'passAuction') {
        pushLogEntry(room, player.index, firstAction.type, applyFirst.payload || {}, room.gameState, nextState)
      }
    }
    const stateBeforeMain = nextState
    nextState = applyGameAction(nextState, action)
    if (action.type !== 'endTurn' && action.type !== 'placeBid' && action.type !== 'passAuction') {
      pushLogEntry(room, player.index, action.type, payload || {}, stateBeforeMain, nextState)
    }
    const auctionResult = nextState.lastAuctionResult
    if (auctionResult) {
      const winnerName = nextState.players[auctionResult.winnerIndex]?.name ?? 'Player'
      room.gameLog.push({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        playerIndex: auctionResult.winnerIndex,
        message: `${winnerName} won ${auctionResult.railroadName} for $${auctionResult.amount}`,
        timestamp: Date.now(),
      })
      const { lastAuctionResult: _, ...rest } = nextState
      nextState = rest as GameState
    }
    room.gameState = nextState
    res.json({ gameState: nextState, gameLog: room.gameLog })
  } catch (e) {
    res.status(400).json({ error: (e as Error)?.message || 'Action failed' })
  }
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS },
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
    room.gameLog = []
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
      try {
        const action: GameAction = { type, ...payload } as GameAction
        let next = room.gameState
        if (applyFirst?.type) {
          next = applyGameAction(next, { type: applyFirst.type, ...applyFirst.payload } as GameAction)
        }
        next = applyGameAction(next, action)
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
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
})
