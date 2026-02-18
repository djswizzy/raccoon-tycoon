import type { GameState } from './types'
import { computeScores, getWinner } from './gameLogic'

type Props = {
  state: GameState
  onReset: () => void
}

export function GameOver({ state, onReset }: Props) {
  const scores = computeScores(state)
  const winnerIdx = getWinner(state)
  const winner = state.players[winnerIdx]
  scores.sort((a, b) => b.vp - a.vp || b.money - a.money)

  return (
    <div className="game-over">
      <div className="game-over-inner card">
        <h1>Game over</h1>
        <p className="winner">Winner: {winner.name}</p>
        <table className="scores">
          <thead>
            <tr>
              <th>Player</th>
              <th>VP</th>
              <th>Money</th>
            </tr>
          </thead>
          <tbody>
            {scores.map(({ playerIndex, vp, money }) => (
              <tr key={playerIndex} className={playerIndex === winnerIdx ? 'winner-row' : ''}>
                <td>{state.players[playerIndex].name}</td>
                <td>{vp}</td>
                <td>${money}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="primary" onClick={onReset}>
          New game
        </button>
      </div>
      <style>{`
        .game-over {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .game-over-inner {
          max-width: 400px;
          padding: 2rem;
          text-align: center;
        }
        .game-over h1 {
          margin-bottom: 0.5rem;
        }
        .winner {
          font-size: 1.25rem;
          color: var(--accent);
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        .scores {
          width: 100%;
          margin-bottom: 1.5rem;
          border-collapse: collapse;
        }
        .scores th, .scores td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .scores th {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .winner-row {
          background: var(--surface2);
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
