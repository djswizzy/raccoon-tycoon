import { useState } from 'react'

const PLAYER_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']

type Props = {
  onStart: (numPlayers: number, names: string[]) => void
}

export function SetupScreen({ onStart }: Props) {
  const [numPlayers, setNumPlayers] = useState(3)
  const [names, setNames] = useState<string[]>(PLAYER_NAMES)

  function updateName(index: number, value: string) {
    setNames(prev => {
      const next = [...prev]
      next[index] = value || PLAYER_NAMES[index]
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onStart(numPlayers, names.slice(0, numPlayers))
  }

  return (
    <div className="setup">
      <div className="setup-inner">
        <h1>Marsupial Monopoly</h1>
        <p className="tagline">Build railroads, towns & goods in Astoria</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Number of players</label>
            <select
              value={numPlayers}
              onChange={e => setNumPlayers(Number(e.target.value))}
            >
              {[2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Player names</label>
            <div className="name-inputs">
              {Array.from({ length: numPlayers }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  value={names[i]}
                  onChange={e => updateName(i, e.target.value)}
                  placeholder={PLAYER_NAMES[i]}
                  maxLength={20}
                />
              ))}
            </div>
          </div>
          <button type="submit" className="primary">Start game</button>
        </form>
      </div>
      <style>{`
        .setup {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(160deg, #1f1412 0%, #3d2520 50%, #1f1412 100%);
        }
        .setup-inner {
          width: 100%;
          max-width: 380px;
        }
        .setup h1 {
          font-size: 2.2rem;
          text-align: center;
          color: var(--accent);
          margin-bottom: 0.25rem;
        }
        .tagline {
          text-align: center;
          color: var(--text-muted);
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }
        .setup .field {
          margin-bottom: 1.25rem;
        }
        .setup label {
          display: block;
          margin-bottom: 0.4rem;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .setup select, .setup input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 1rem;
        }
        .name-inputs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .setup button[type="submit"] {
          width: 100%;
          padding: 0.75rem;
          margin-top: 0.5rem;
          font-size: 1.05rem;
        }
      `}</style>
    </div>
  )
}
