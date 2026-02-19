import { useState } from 'react'
import type { GameState } from './types'
import { PlayerList } from './PlayerList'
import { PlayerView } from './PlayerView'

type Props = {
  state: GameState
}

export function PlayerPanel({ state }: Props) {
  const [collapsed, setCollapsed] = useState(true)
  const [viewingPlayerIndex, setViewingPlayerIndex] = useState<number | null>(null)

  function handleExpand(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setCollapsed(false)
  }

  function handleCollapse() {
    setCollapsed(true)
  }

  return (
    <>
      <div className={`player-panel card ${collapsed ? 'collapsed' : ''}`}>
        <div className="player-panel-header">
          <h3>Players</h3>
          <button 
            type="button" 
            className="panel-toggle" 
            onClick={handleCollapse}
            aria-label="Collapse panel"
          >
            ◀
          </button>
        </div>
        <div className="player-panel-content">
          {viewingPlayerIndex === null ? (
            <PlayerList
              state={state}
              currentPlayerIndex={state.currentPlayerIndex}
              onSelectPlayer={setViewingPlayerIndex}
            />
          ) : (
            <PlayerView
              player={state.players[viewingPlayerIndex]}
              isCurrentTurn={viewingPlayerIndex === state.currentPlayerIndex}
              onClose={() => setViewingPlayerIndex(null)}
            />
          )}
        </div>
      </div>
      {collapsed ? (
        <button
          key="expand-button"
          type="button"
          className="player-panel-expand-button"
          onClick={handleExpand}
          aria-label="Expand player panel"
        >
          Players
        </button>
      ) : null}
      <style>{`
        .player-panel {
          position: fixed;
          left: 0;
          top: 1rem;
          bottom: 1rem;
          width: 280px;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 2rem);
          transition: transform 0.3s ease-in-out;
          z-index: 101;
          transform: translateX(-100%);
        }
        .player-panel:not(.collapsed) {
          transform: translateX(0);
        }
        .player-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0.5rem;
        }
        .player-panel-header h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0;
        }
        .panel-toggle {
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
        .panel-toggle:hover {
          color: var(--text);
        }
        .player-panel-content {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        .player-panel-expand-button {
          position: fixed;
          left: 0;
          top: 50%;
          margin-top: -1.5rem;
          height: 3rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-left: none;
          border-radius: 0 6px 6px 0;
          color: var(--text);
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0 1rem;
          cursor: pointer;
          z-index: 99;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .player-panel-expand-button:hover {
          background: var(--surface2);
          color: var(--accent);
        }
        @media (max-width: 1200px) {
          .player-panel-expand-button {
            top: auto;
            bottom: 2rem;
            margin-top: 0;
          }
        }
      `}</style>
    </>
  )
}
