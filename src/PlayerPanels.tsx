import type { GameState } from './types'
import { computeScores } from './gameLogic'

type Props = { state: GameState }

function railroadVpBreakdown(railroads: { name: string; vp: number }[]): { name: string; count: number; vp: number }[] {
  const byName = new Map<string, { count: number; vp: number }>()
  for (const r of railroads) {
    const cur = byName.get(r.name)
    if (!cur) byName.set(r.name, { count: 1, vp: r.vp })
    else {
      cur.count += 1
    }
  }
  return Array.from(byName.entries()).map(([name, { count, vp }]) => ({
    name,
    count,
    vp: vp * count,
  }))
}

export function PlayerPanels({ state }: Props) {
  const scores = state.phase === 'gameover' ? computeScores(state) : null
  return (
    <section className="player-panels">
      <h3>Players</h3>
      <div className="panels-row">
        {state.players.map((p, i) => {
          const rrBreakdown = railroadVpBreakdown(p.railroads)
          const totalRrVp = rrBreakdown.reduce((s, x) => s + x.vp, 0)
          return (
          <div
            key={p.id}
            className={`panel card ${i === state.currentPlayerIndex ? 'current' : ''}`}
          >
            <div className="panel-name">{p.name}</div>
            <div className="panel-money">
              {i === state.currentPlayerIndex ? `$${p.money}` : '—'}
            </div>
            <div className="panel-assets">
              <span title={rrBreakdown.map(r => `${r.name} ×${r.count} = ${r.vp} VP`).join(', ')}>
                {p.railroads.length} RR ({totalRrVp} VP)
              </span>
              <span>{p.towns.length} towns</span>
              <span>{p.buildings.length} buildings</span>
            </div>
            {scores && (
              <div className="panel-vp">
                {scores.find(s => s.playerIndex === i)?.vp ?? 0} VP
              </div>
            )}
          </div>
          )
        })}
      </div>
      <style>{`
        .player-panels h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .panels-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .player-panels .panel {
          padding: 0.6rem;
          min-width: 100px;
        }
        .player-panels .panel.current {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
        }
        .panel-name {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .panel-money {
          color: var(--accent);
          font-size: 0.9rem;
        }
        .panel-assets {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }
        .panel-vp {
          margin-top: 0.35rem;
          font-weight: 600;
          color: var(--green);
        }
      `}</style>
    </section>
  )
}
