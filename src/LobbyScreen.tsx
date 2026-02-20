import { useState, useEffect } from 'react'

type Mode = 'choice' | 'create' | 'join'

type Props = {
  onPlayLocal: () => void
  onCreateRoom: (roomCode: string, playerId: string, playerIndex: number) => void
  onJoinRoom: (roomCode: string, playerId: string, playerIndex: number) => void
}

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
const API_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error('Server returned a page instead of data. If using ngrok, the request may have hit a warning page—try again.')
    }
    throw new Error(`Invalid response: ${text.slice(0, 80)}`)
  }
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
      const url = `${API_BASE}/api/room/create`
      const res = await fetch(url, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ playerName: playerName || 'Player 1' }),
      })
      if (!res.ok) {
        const text = await res.text()
        let data
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
        throw new Error(data.error || 'Failed to create room')
      }
      const data = await safeJson(res)
      onCreateRoom(data.roomCode, data.playerId, data.playerIndex)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Make sure the server is running on port 3001.')
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
      const url = `${API_BASE}/api/room/join`
      const res = await fetch(url, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ roomCode: roomCode.toUpperCase().trim(), playerName: joinName || 'Player' }),
      })
      if (!res.ok) {
        const text = await res.text()
        let data
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
        throw new Error(data.error || 'Failed to join room')
      }
      const data = await safeJson(res)
      onJoinRoom(data.roomCode, data.playerId, data.playerIndex)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Make sure the server is running on port 3001.')
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
