import { useState } from 'react'
import type { GameState } from './types'

export interface LogEntry {
  id: string
  playerIndex: number
  message: string
  timestamp: number
}

type Props = {
  state: GameState
  entries: LogEntry[]
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

export function GameLog({ state, entries }: Props) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <>
      <div className={`game-log card ${collapsed ? 'collapsed' : ''}`}>
        <div className="game-log-header">
          <h3>Game Log</h3>
          <button 
            type="button" 
            className="log-toggle" 
            onClick={() => setCollapsed(true)}
            aria-label="Collapse log"
          >
            ◀
          </button>
        </div>
        <div className="game-log-content">
          {entries.length === 0 ? (
            <p className="log-empty">No actions yet</p>
          ) : (
            <div className="log-entries">
              {[...entries].reverse().map(entry => {
                const player = state.players[entry.playerIndex]
                const color = getPlayerColor(entry.playerIndex)
                return (
                  <div key={entry.id} className="log-entry">
                    <span className="log-player" style={{ color }}>
                      {player.name}:
                    </span>
                    <span className="log-message">{entry.message}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {collapsed && (
        <button
          type="button"
          className="log-expand-button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand log"
        >
          Logs
        </button>
      )}
      <style>{`
        .game-log {
          position: fixed;
          right: 0;
          top: 1rem;
          bottom: 1rem;
          width: 280px;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 2rem);
          transition: transform 0.3s ease-in-out;
          z-index: 100;
          transform: translateX(100%);
        }
        .game-log:not(.collapsed) {
          transform: translateX(0);
        }
        .game-log-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0.5rem;
        }
        .game-log-header h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0;
        }
        .log-toggle {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .log-toggle:hover {
          color: var(--text);
        }
        .game-log-content {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        .log-empty {
          color: var(--text-muted);
          font-size: 0.85rem;
          text-align: center;
          padding: 1rem 0;
        }
        .log-entries {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .log-entry {
          font-size: 0.85rem;
          line-height: 1.4;
          word-wrap: break-word;
        }
        .log-player {
          font-weight: 600;
          margin-right: 0.4rem;
        }
        .log-message {
          color: var(--text);
        }
        .log-expand-button {
          position: fixed;
          right: 0;
          top: 50%;
          margin-top: -1.5rem;
          height: 3rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-right: none;
          border-radius: 6px 0 0 6px;
          color: var(--text);
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0 1rem;
          cursor: pointer;
          z-index: 99;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .log-expand-button:hover {
          background: var(--surface2);
          color: var(--accent);
        }
        @media (max-width: 1200px) {
          .log-expand-button {
            top: auto;
            bottom: 2rem;
            margin-top: 0;
          }
        }
      `}</style>
    </>
  )
}
