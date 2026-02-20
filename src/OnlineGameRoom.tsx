import { useState, useEffect, useRef, useCallback } from 'react'
import type { GameState } from './types'
import type { GameAction } from './gameLogic'
import type { LogEntry } from './GameLog'
import { GameBoard } from './GameBoard'
import { GameOver } from './GameOver'
import { API_BASE, API_HEADERS, safeJson, withNgrokRetry } from './api'

type Props = {
  roomCode: string
  playerId: string
  playerIndex: number
  initialState: GameState
  onLeave: () => void
}

export function OnlineGameRoom({
  roomCode,
  playerId,
  playerIndex,
  initialState,
  onLeave,
}: Props) {
  const [state, setState] = useState<GameState>(initialState)
  const [serverLogEntries, setServerLogEntries] = useState<LogEntry[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const pollingRef = useRef<number | null>(null)
  const roomCodeRef = useRef(roomCode)
  const playerIdRef = useRef(playerId)
  roomCodeRef.current = roomCode
  playerIdRef.current = playerId

  const dispatch = useCallback(
    async (action: GameAction, applyFirst?: GameAction) => {
      const { type, ...payload } = action as unknown as Record<string, unknown>
      const applyFirstPayload = applyFirst
        ? (() => {
            const { type: tf, ...pf } = applyFirst as unknown as Record<string, unknown>
            return { type: tf, payload: pf }
          })()
        : undefined

      try {
        const code = String(roomCodeRef.current || '').toUpperCase().trim()
        await withNgrokRetry(async () => {
          const res = await fetch(`${API_BASE}/api/room/${code}/action`, {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({
              playerId: playerIdRef.current,
              type,
              payload,
              applyFirst: applyFirstPayload,
            }),
          })
          if (!res.ok) {
            const data = await safeJson<{ error?: string }>(res)
            console.error('Action failed:', data.error)
            return
          }
          const data = await safeJson<{ gameState?: GameState; gameLog?: LogEntry[] }>(res)
          if (data.gameState != null) setState(data.gameState)
          if (Array.isArray(data.gameLog)) setServerLogEntries(data.gameLog)
        })
      } catch (err) {
        console.error('Action error:', err)
      }
    },
    [roomCode, playerId]
  )

  useEffect(() => {
    let mounted = true

    async function pollGameState() {
      const code = String(roomCodeRef.current || '').toUpperCase().trim()
      const pid = String(playerIdRef.current || '').trim()
      if (!code || !pid) return
      try {
        setPollError(null)
        const res = await fetch(
          `${API_BASE}/api/room/${code}?playerId=${encodeURIComponent(pid)}&_=${Date.now()}`,
          { cache: 'no-store', headers: { ...API_HEADERS, Pragma: 'no-cache', 'Cache-Control': 'no-cache' } }
        )
        if (!res.ok) {
          if (mounted) {
            if (res.status === 404) setPollError('Room not found — server may have restarted. Leave and rejoin.')
            else if (res.status === 403) setPollError('Not in room (403)')
            else setPollError(`Sync failed: ${res.status}`)
          }
          return
        }
        const data = await safeJson<{ status?: string; gameState?: GameState; gameLog?: LogEntry[] }>(res)
        if (!mounted) return
        if (data.status === 'playing' && data.gameState) {
          setState(data.gameState)
          setLastSyncAt(Date.now())
        }
        if (Array.isArray(data.gameLog)) {
          setServerLogEntries(data.gameLog)
        }
      } catch (e) {
        const msg = (e as Error).message || String(e)
        const friendly = msg.includes('fetch') || msg.includes('NetworkError')
          ? 'Connection problem — retrying…'
          : msg.slice(0, 40)
        if (mounted) setPollError(friendly)
      }
    }

    pollGameState()
    const interval = setInterval(pollGameState, 400)
    pollingRef.current = interval as unknown as number

    return () => {
      mounted = false
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [roomCode, playerId])

  if (state.phase === 'gameover') {
    return <GameOver state={state} onReset={onLeave} />
  }

  return (
    <>
      <div className="online-sync-bar" style={{ padding: '4px 8px', fontSize: 12, background: pollError ? '#4a1c1c' : lastSyncAt != null ? '#1c2e1c' : '#2a2a2a', color: '#ccc' }}>
        {pollError ? `⚠ ${pollError}` : lastSyncAt != null ? `✓ Synced ${Math.round((Date.now() - lastSyncAt) / 1000)}s ago` : 'Syncing…'}
      </div>
      <GameBoard
        state={state}
        setState={setState}
        dispatch={dispatch}
        playerIndex={playerIndex}
        serverLogEntries={serverLogEntries}
      />
    </>
  )
}
