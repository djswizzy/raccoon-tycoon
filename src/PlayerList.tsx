import type { GameState } from './types'
import { COMMODITY_NAMES } from './data/cards'
import { COMMODITIES } from './gameLogic'

type Props = {
  state: GameState
  currentPlayerIndex: number
  onSelectPlayer: (playerIndex: number) => void
}

const PLAYER_COLORS = [
  '#ff4444', // red
  '#44ff44', // green
  '#4444ff', // blue
  '#ff44ff', // magenta
  '#ffff44', // yellow
]

function getPlayerColor(playerIndex: number): string {
  return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length]
}

export function PlayerList({ state, currentPlayerIndex, onSelectPlayer }: Props) {
  return (
    <div className="player-list">
      <h3>Players</h3>
      <div className="player-list-items">
        {state.players.map((player, index) => {
          const isCurrent = index === currentPlayerIndex
          const color = getPlayerColor(index)
          const totalVp = player.railroads.reduce((sum, r) => sum + r.vp, 0) + 
                         player.towns.reduce((sum, t) => sum + t.vp, 0)
          
          return (
            <button
              key={player.id}
              type="button"
              className={`player-list-item ${isCurrent ? 'current' : ''}`}
              onClick={() => onSelectPlayer(index)}
              style={{ borderLeftColor: color }}
            >
              <div className="player-list-item-header">
                <span className="player-list-item-name" style={{ color }}>
                  {player.name}
                </span>
                {isCurrent && <span className="player-list-item-badge">Current</span>}
              </div>
              <div className="player-list-item-stats">
                <span className="stat-vp">{totalVp} VP</span>
              </div>
              {(player.railroads.length > 0 || player.towns.length > 0 || player.buildings.length > 0 || Object.values(player.commodities).some(n => n > 0)) && (
                <div className="player-list-item-details">
                  {player.railroads.length > 0 && (
                    <div className="detail-group">
                      <span className="detail-label">Railroads:</span>
                      <span className="detail-value">{player.railroads.map(r => r.name).join(', ')}</span>
                    </div>
                  )}
                  {player.towns.length > 0 && (
                    <div className="detail-group">
                      <span className="detail-label">Towns:</span>
                      <span className="detail-value">{player.towns.map(t => t.name).join(', ')}</span>
                    </div>
                  )}
                  {player.buildings.length > 0 && (
                    <div className="detail-group">
                      <span className="detail-label">Buildings:</span>
                      <span className="detail-value">{player.buildings.map(b => b.name).join(', ')}</span>
                    </div>
                  )}
                  {Object.values(player.commodities).some(n => n > 0) && (
                    <div className="detail-group">
                      <span className="detail-label">Commodities:</span>
                      <span className="detail-value">
                        {COMMODITIES.filter(c => (player.commodities[c] ?? 0) > 0)
                          .map(c => `${COMMODITY_NAMES[c]} (${player.commodities[c]})`)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <style>{`
        .player-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .player-list h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0 0 0.5rem 0;
        }
        .player-list-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .player-list-item {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-left: 3px solid;
          border-radius: 4px;
          padding: 0.6rem;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s, border-color 0.2s;
        }
        .player-list-item:hover {
          background: var(--surface);
          border-color: var(--accent);
        }
        .player-list-item.current {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent-dim);
        }
        .player-list-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.35rem;
        }
        .player-list-item-name {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .player-list-item-badge {
          background: var(--accent);
          color: var(--bg);
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 3px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .player-list-item-stats {
          display: flex;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          flex-wrap: wrap;
        }
        .player-list-item-stats span {
          white-space: nowrap;
        }
        .stat-money {
          color: var(--accent);
          font-weight: 600;
        }
        .stat-vp {
          color: var(--green);
          font-weight: 600;
        }
        .player-list-item-details {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .detail-group {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          font-size: 0.75rem;
        }
        .detail-label {
          color: var(--text-muted);
          font-weight: 600;
        }
        .detail-value {
          color: var(--text);
          word-wrap: break-word;
        }
      `}</style>
    </div>
  )
}
