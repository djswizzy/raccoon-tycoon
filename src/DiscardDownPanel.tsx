import type { GameState, Commodity } from './types'
import { COMMODITY_NAMES, COMMODITY_EMOJI } from './data/cards'
import { COMMODITIES, getMaxStorage, getTotalCommodities } from './gameLogic'

type Props = {
  state: GameState
  onDiscard: (commodity: Commodity) => void
}

export function DiscardDownPanel({ state, onDiscard }: Props) {
  const player = state.players[state.currentPlayerIndex]
  const maxStorage = getMaxStorage(player)
  const total = getTotalCommodities(player.commodities)
  const toDiscard = total - maxStorage

  return (
    <div className="discard-overlay">
      <div className="discard-panel card">
        <h2>Discard down to {maxStorage}</h2>
        <p className="discard-desc">
          You have <strong>{total}</strong> tokens (max {maxStorage}). Discard <strong>{toDiscard}</strong> by clicking a commodity below.
        </p>
        <div className="discard-commodities">
          {COMMODITIES.map(c => {
            const n = player.commodities[c] ?? 0
            if (n === 0) return null
            return (
              <button
                key={c}
                type="button"
                className="discard-chip"
                onClick={() => onDiscard(c)}
              >
                <span className="discard-emoji">{COMMODITY_EMOJI[c]}</span>
                <span className="discard-name">{COMMODITY_NAMES[c]}</span>
                <span className="discard-count">×{n}</span>
              </button>
            )
          })}
        </div>
      </div>
      <style>{`
        .discard-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
        }
        .discard-panel {
          max-width: 420px;
          padding: 1.5rem;
        }
        .discard-panel h2 {
          margin-bottom: 0.5rem;
        }
        .discard-desc {
          color: var(--text-muted);
          margin-bottom: 1.25rem;
        }
        .discard-commodities {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .discard-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0.75rem;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-size: 0.95rem;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .discard-chip:hover {
          border-color: var(--accent);
          background: rgba(184, 84, 80, 0.15);
        }
        .discard-emoji {
          font-size: 1.25rem;
        }
        .discard-count {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}
