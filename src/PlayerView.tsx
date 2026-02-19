import type { Player, GameState } from './types'
import { COMMODITY_NAMES, COMMODITY_EMOJI } from './data/cards'
import { COMMODITIES } from './gameLogic'

type Props = {
  player: Player
  isCurrentTurn: boolean
  onClose?: () => void
}

export function PlayerView({ player, isCurrentTurn, onClose }: Props) {
  return (
    <div className="player-view card">
      {onClose && (
        <div className="player-view-header">
          <h3>{player.name}</h3>
          <button type="button" className="player-view-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      )}
      {!onClose && (
        <h3 className={isCurrentTurn ? 'current-player' : ''}>{player.name}{isCurrentTurn ? ' (current turn)' : ''}</h3>
      )}
      {onClose ? (
        <div className="player-view-money-hidden">Money: —</div>
      ) : (
        <div className="player-view-money">${player.money}</div>
      )}
      
      <div className="player-view-section">
        <h4>Commodities</h4>
        {COMMODITIES.every(c => (player.commodities[c] ?? 0) === 0) ? (
          <p className="player-view-empty">None</p>
        ) : (
          <div className="commodities-list">
            {COMMODITIES.map(c => {
              const n = player.commodities[c] ?? 0
              if (n === 0) return null
              return (
                <span key={c} className="commodity-chip" title={COMMODITY_NAMES[c]}>
                  <span className="commodity-emoji">{COMMODITY_EMOJI[c]}</span>
                  <span className="commodity-name">{COMMODITY_NAMES[c]}</span>
                  <span className="commodity-count">{n}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="player-view-section">
        <h4>Railroads ({player.railroads.length})</h4>
        {player.railroads.length === 0 ? (
          <p className="player-view-empty">None</p>
        ) : (
          <ul className="player-view-list">
            {player.railroads.map(r => (
              <li key={r.id}>
                <span className="item-name">{r.name}</span>
                <span className="item-meta">{r.vp} VP</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="player-view-section">
        <h4>Towns ({player.towns.length})</h4>
        {player.towns.length === 0 ? (
          <p className="player-view-empty">None</p>
        ) : (
          <ul className="player-view-list">
            {player.towns.map(t => (
              <li key={t.id}>
                <span className="item-name">{t.name}</span>
                <span className="item-meta">{t.vp} VP</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="player-view-section">
        <h4>Buildings ({player.buildings.length})</h4>
        {player.buildings.length === 0 ? (
          <p className="player-view-empty">None</p>
        ) : (
          <ul className="player-view-list">
            {player.buildings.map(b => (
              <li key={b.id} title={b.description}>
                <span className="item-name">{b.name}</span>
                {b.description && <span className="item-desc">{b.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="player-view-section">
        <h4>Hand</h4>
        <p className="hand-size">{player.hand.length} cards</p>
      </div>

      <style>{`
        .player-view {
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .player-view-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }
        .player-view-header h3,
        .player-view > h3 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--text);
        }
        .player-view > h3.current-player {
          color: var(--accent);
        }
        .player-view-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .player-view-close:hover {
          color: var(--text);
        }
        .player-view-money {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent);
        }
        .player-view-money-hidden {
          font-size: 1rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .player-view-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .player-view-section h4 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0;
        }
        .commodities-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .commodity-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface2);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
          gap: 0.5rem;
        }
        .commodity-emoji {
          flex-shrink: 0;
        }
        .commodity-name {
          flex: 1;
          text-align: left;
        }
        .commodity-count {
          font-weight: 600;
          flex-shrink: 0;
        }
        .player-view-empty {
          color: var(--text-muted);
          font-size: 0.85rem;
          font-style: italic;
          margin: 0;
        }
        .player-view-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .player-view-list li {
          background: var(--surface2);
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .item-name {
          font-weight: 600;
        }
        .item-meta {
          font-size: 0.75rem;
          color: var(--accent);
        }
        .item-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .hand-size {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
