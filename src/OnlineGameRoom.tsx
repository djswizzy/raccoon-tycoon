import { useState, useEffect, useRef, useCallback } from 'react'
import type { GameState } from './types'
import type { GameAction } from './gameLogic'
import { GameBoard } from './GameBoard'
import { GameOver } from './GameOver'

type Props = {
  roomCode: string
  playerId: string
  playerIndex: number
  initialState: GameState
  onLeave: () => void
}

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
const SOCKET_URL = API_BASE.replace(/\/api.*$/, '') || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

export function OnlineGameRoom({
  roomCode,
  playerId,
  playerIndex,
  initialState,
  onLeave,
}: Props) {
  const [state, setState] = useState<GameState>(initialState)
  const ioRef = useRef<ReturnType<typeof import('socket.io-client').io> | null>(null)

  const dispatch = useCallback(
    (action: GameAction, applyFirst?: GameAction) => {
      const { type, ...payload } = action as unknown as Record<string, unknown>
      const applyFirstPayload = applyFirst
        ? (() => {
            const { type: tf, ...pf } = applyFirst as unknown as Record<string, unknown>
            return { type: tf, payload: pf }
          })()
        : undefined
      ioRef.current?.emit('action', {
        roomCode,
        playerId,
        type,
        payload,
        applyFirst: applyFirstPayload,
      })
    },
    [roomCode, playerId]
  )

  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const sock = io(SOCKET_URL || 'http://localhost:3001')
      ioRef.current = sock
      sock.emit('join-room', { roomCode, playerId })
      sock.on('game-state', (next: GameState) => setState(next))
    })
    return () => {
      ioRef.current?.disconnect()
    }
  }, [roomCode, playerId])

  if (state.phase === 'gameover') {
    return <GameOver state={state} onReset={onLeave} />
  }

  return (
    <GameBoard
      state={state}
      setState={setState}
      dispatch={dispatch}
      playerIndex={playerIndex}
    />
  )
}
