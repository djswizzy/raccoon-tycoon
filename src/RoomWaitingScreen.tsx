import { useState, useEffect, useRef } from 'react'
import type { GameState } from './types'

type Props = {
  roomCode: string
  playerId: string
  playerIndex: number
  isHost: boolean
  onGameStart: (state: GameState, roomCode: string, playerId: string, playerIndex: number) => void
  onBack: () => void
}

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

export function RoomWaitingScreen({
  roomCode,
  playerId,
  playerIndex,
  isHost,
  onGameStart,
  onBack,
}: Props) {
  const [players, setPlayers] = useState<{ name: string; index: number }[]>([])
  const [error, setError] = useState('')
  const pollingRef = useRef<number | null>(null)

  useEffect(() => {
    let mounted = true

    async function pollRoom() {
      try {
        const res = await fetch(`${API_BASE}/api/room/${roomCode}?playerId=${playerId}`)
        if (!res.ok) {
          const text = await res.text()
          let msg = 'Failed to fetch room status'
          try {
            const data = JSON.parse(text)
            if (data?.error) msg = data.error
            else if (res.status === 404) msg = 'Room not found. Check the code or create a new room.'
            else if (res.status === 403) msg = 'Not in this room.'
            else msg = `${msg} (${res.status})`
          } catch {
            if (res.status === 404) msg = 'Room not found. Check the code or create a new room.'
            else msg = `${msg} (${res.status})`
          }
          if (mounted) setError(msg)
          return
        }
        const data = await res.json()
        if (mounted) {
          setPlayers(data.players || [])
          if (data.status === 'playing' && data.gameState) {
            onGameStart(data.gameState, roomCode, playerId, playerIndex)
            return
          }
        }
      } catch (err) {
        const message = (err as Error).message
        if (mounted) setError(message.includes('fetch') ? 'Cannot reach server. Check that the game server and ngrok are running, and VITE_API_URL is set.' : message)
      }
    }

    pollRoom()
    const interval = setInterval(pollRoom, 2000) // Poll every 2 seconds
    pollingRef.current = interval as unknown as number

    return () => {
      mounted = false
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [roomCode, playerId, playerIndex, onGameStart])

  async function handleStart() {
    try {
      const res = await fetch(`${API_BASE}/api/room/${roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to start game')
        return
      }
      const gameState = await res.json()
      onGameStart(gameState, roomCode, playerId, playerIndex)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?room=${roomCode}` : ''

  return (
    <div className="room-waiting">
      <div className="room-waiting-inner content-box-over-bg">
        <h1>{isHost ? 'Room created' : 'Waiting for host'}</h1>
        <p className="room-code">Room code: <strong>{roomCode}</strong></p>
        {isHost && shareUrl && (
          <div className="share-section">
            <label>Share this link:</label>
            <input type="text" readOnly value={shareUrl} onClick={e => (e.target as HTMLInputElement).select()} />
          </div>
        )}
        <div className="players-list">
          <h3>Players ({players.length})</h3>
          <ul>
            {players.map((p, i) => (
              <li key={i}>{p.name} {p.index === playerIndex && '(you)'}</li>
            ))}
          </ul>
        </div>
        {error && <p className="error">{error}</p>}
        {isHost && (
          <button
            type="button"
            className="primary"
            onClick={handleStart}
            disabled={players.length < 2}
          >
            Start game {players.length < 2 && '(need 2+ players)'}
          </button>
        )}
        {!isHost && <p className="waiting">Waiting for host to start…</p>}
        <button type="button" className="secondary" onClick={onBack}>
          Leave
        </button>
      </div>
      <style>{`
        .room-waiting { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .room-waiting-inner { width: 100%; max-width: 420px; }
        .room-waiting h1 { font-size: 1.8rem; text-align: center; color: var(--accent); margin-bottom: 0.5rem; }
        .room-code { text-align: center; margin-bottom: 1rem; font-size: 1.1rem; }
        .share-section { margin-bottom: 1rem; }
        .share-section label { display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.9rem; }
        .share-section input { width: 100%; padding: 0.5rem; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text); font-size: 0.85rem; }
        .players-list { margin: 1rem 0; }
        .players-list h3 { font-size: 1rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .players-list ul { list-style: none; padding: 0; }
        .players-list li { padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
        .error { color: var(--accent); margin-bottom: 1rem; }
        .waiting { color: var(--text-muted); margin: 1rem 0; }
        .room-waiting button { width: 100%; margin-bottom: 0.5rem; padding: 0.6rem; }
      `}</style>
    </div>
  )
}
