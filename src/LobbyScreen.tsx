import { useState, useEffect } from 'react'
import { API_BASE, API_HEADERS, safeJson, withNgrokRetry } from './api'

type Mode = 'choice' | 'create' | 'join'

type Props = {
  onPlayLocal: () => void
  onCreateRoom: (roomCode: string, playerId: string, playerIndex: number) => void
  onJoinRoom: (roomCode: string, playerId: string, playerIndex: number) => void
}

export function LobbyScreen({ onPlayLocal, onCreateRoom, onJoinRoom }: Props) {
  const [mode, setMode] = useState<Mode>('choice')
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const room = params.get('room')?.toUpperCase().trim()
    if (room && room.length === 6) {
      setMode('join')
      setRoomCode(room)
    }
  }, [])
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await withNgrokRetry(async () => {
        const url = `${API_BASE}/api/room/create`
        const res = await fetch(url, {
          method: 'POST',
          headers: API_HEADERS,
          body: JSON.stringify({ playerName: playerName || 'Player 1' }),
        })
        if (!res.ok) {
          const data = await safeJson<{ error?: string }>(res).catch(() => ({}))
          throw new Error(data?.error || `Server error: ${res.status} ${res.statusText}`)
        }
        const data = await safeJson<{ roomCode: string; playerId: string; playerIndex: number }>(res)
        onCreateRoom(data.roomCode, data.playerId, data.playerIndex)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
        setError('Cannot reach the game server. If local: run the server (npm run server) and use the same origin or set VITE_API_URL=http://localhost:3001. If online: ensure ngrok is running and ALLOWED_ORIGINS includes this site. Check the Network tab for the request URL and error.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await withNgrokRetry(async () => {
        const url = `${API_BASE}/api/room/join`
        const res = await fetch(url, {
          method: 'POST',
          headers: API_HEADERS,
          body: JSON.stringify({ roomCode: roomCode.toUpperCase().trim(), playerName: joinName || 'Player' }),
        })
        if (!res.ok) {
          const data = await safeJson<{ error?: string }>(res).catch(() => ({}))
          throw new Error(data?.error || `Server error: ${res.status} ${res.statusText}`)
        }
        const data = await safeJson<{ roomCode: string; playerId: string; playerIndex: number }>(res)
        onJoinRoom(data.roomCode, data.playerId, data.playerIndex)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
        setError('Cannot reach the game server. If local: run the server (npm run server) and use the same origin or set VITE_API_URL=http://localhost:3001. If online: ensure ngrok is running and ALLOWED_ORIGINS includes this site. Check the Network tab for the request URL and error.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'choice') {
    return (
      <div className="lobby">
        <div className="lobby-inner content-box-over-bg">
          <h1>Marsupial Monopoly</h1>
          <p className="tagline">Build railroads, towns & goods in Astoria</p>
          <div className="lobby-buttons">
            <button type="button" className="primary large" onClick={onPlayLocal}>
              Play locally
            </button>
            <button type="button" className="secondary large" onClick={() => setMode('create')}>
              Create room (online)
            </button>
            <button type="button" className="secondary large" onClick={() => setMode('join')}>
              Join room (online)
            </button>
          </div>
        </div>
        <style>{`
          .lobby { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
          .lobby-inner { width: 100%; max-width: 400px; }
          .lobby h1 { font-size: 2.2rem; text-align: center; color: var(--accent); margin-bottom: 0.25rem; }
          .tagline { text-align: center; color: var(--text-muted); margin-bottom: 2rem; font-size: 0.95rem; }
          .lobby-buttons { display: flex; flex-direction: column; gap: 0.75rem; }
          .lobby .large { width: 100%; padding: 0.75rem; font-size: 1rem; }
        `}</style>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <div className="lobby">
        <div className="lobby-inner content-box-over-bg">
          <h1>Create room</h1>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Your name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Player 1"
                maxLength={20}
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create room'}
            </button>
          </form>
          <button type="button" className="secondary" onClick={() => { setMode('choice'); setError(''); }}>
            Back
          </button>
        </div>
        <style>{`
          .lobby { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
          .lobby-inner { width: 100%; max-width: 380px; }
          .lobby h1 { font-size: 1.8rem; text-align: center; color: var(--accent); margin-bottom: 1.5rem; }
          .field { margin-bottom: 1rem; }
          .field label { display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.9rem; }
          .field input { width: 100%; padding: 0.6rem; background: var(--surface2); border: 1px solid var(--border);
            border-radius: 6px; color: var(--text); font-size: 1rem; }
          .error { color: var(--accent); margin-bottom: 1rem; font-size: 0.9rem; }
          .lobby button { width: 100%; margin-bottom: 0.5rem; padding: 0.6rem; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="lobby">
      <div className="lobby-inner content-box-over-bg">
        <h1>Join room</h1>
        <form onSubmit={handleJoin}>
          <div className="field">
            <label>Room code</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              autoCapitalize="characters"
            />
          </div>
          <div className="field">
            <label>Your name</label>
            <input
              type="text"
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
              placeholder="Player"
              maxLength={20}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Joining…' : 'Join room'}
          </button>
        </form>
        <button type="button" className="secondary" onClick={() => { setMode('choice'); setError(''); }}>
          Back
        </button>
      </div>
      <style>{`
        .lobby { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .lobby-inner { width: 100%; max-width: 380px; }
        .lobby h1 { font-size: 1.8rem; text-align: center; color: var(--accent); margin-bottom: 1.5rem; }
        .field { margin-bottom: 1rem; }
        .field label { display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.9rem; }
        .field input { width: 100%; padding: 0.6rem; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text); font-size: 1rem; }
        .error { color: var(--accent); margin-bottom: 1rem; font-size: 0.9rem; }
        .lobby button { width: 100%; margin-bottom: 0.5rem; padding: 0.6rem; }
      `}</style>
    </div>
  )
}
