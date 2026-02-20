import { useState } from 'react'
import type { GameState } from './types'
import { getPlayerColor } from './GameLog'

type Props = {
  state: GameState
  onBid: (amount: number) => void
  onPass: () => void
  onClose?: () => void
  canAct?: boolean
}

export function AuctionPanel({ state, onBid, onPass, onClose, canAct = true }: Props) {
  const [input, setInput] = useState('')
  const rr = state.auctionRailroad!
  const current = state.players[state.currentPlayerIndex]
  const maxBid = Math.max(...state.auctionBids.filter((_, i) => i !== state.currentPlayerIndex))
  const minBid = Math.max(rr.minBid, maxBid + 1)
  const passed = state.auctionPassed[state.currentPlayerIndex]

  function handleBid() {
    const n = parseInt(input, 10)
    if (!Number.isNaN(n) && n >= minBid && n <= current.money) {
      onBid(n)
      setInput('')
    }
  }

  return (
    <div className="auction-overlay">
      <div className="auction-panel card">
        <div className="auction-panel-header">
          <h2>Auction: {rr.name}</h2>
          {onClose && <button type="button" className="auction-close" onClick={onClose} title="Close">×</button>}
        </div>
        <p>Min bid ${rr.minBid} · {rr.vp} VP</p>
        <p className="current-high">
          Current high: ${Math.max(...state.auctionBids)} by{' '}
          {state.players[state.auctionBids.indexOf(Math.max(...state.auctionBids))].name}
        </p>
        <div className="auction-players">
          {state.players.map((player, index) => {
            const isCurrent = index === state.currentPlayerIndex
            const hasPassed = state.auctionPassed[index]
            const bid = state.auctionBids[index]
            const color = getPlayerColor(index)
            return (
              <div
                key={player.id}
                className={`auction-player-wrap ${isCurrent ? 'current-turn' : ''}`}
              >
                {isCurrent && <div className="auction-arrow" aria-hidden>▼ Your turn</div>}
                <div
                  className={`auction-player-row ${hasPassed ? 'passed' : ''}`}
                  style={!hasPassed ? { borderLeftColor: color } : undefined}
                >
                  <span className="auction-player-name" style={!hasPassed ? { color } : undefined}>
                    {player.name}
                  </span>
                  {hasPassed ? (
                    <span className="auction-player-status">Passed</span>
                  ) : (
                    <span className="auction-player-bid">${bid}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {!passed && canAct ? (
          <>
            <div className="bid-row">
              <input
                type="number"
                min={minBid}
                max={current.money}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Min $${minBid}`}
              />
              <button
                type="button"
                className="primary"
                onClick={handleBid}
                disabled={!input || parseInt(input, 10) < minBid || parseInt(input, 10) > current.money}
              >
                Bid
              </button>
              <button type="button" className="secondary" onClick={onPass}>
                Pass
              </button>
            </div>
            <p className="your-money">Your money: ${current.money}</p>
          </>
        ) : !passed && !canAct ? (
          <p>Waiting for {current.name} to bid or pass.</p>
        ) : (
          <p>You passed. Waiting for others.</p>
        )}
      </div>
      <style>{`
        .auction-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .auction-panel {
          max-width: 560px;
          width: 90%;
          padding: 2.5rem;
          font-size: 1.15rem;
        }
        .auction-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .auction-panel-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
        }
        .auction-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          padding: 0 0.25rem;
        }
        .auction-close:hover {
          color: var(--text);
        }
        .auction-panel p {
          margin: 0.75rem 0;
          color: var(--text-muted);
          font-size: 1.1rem;
        }
        .current-high {
          font-size: 1.1rem;
        }
        .auction-players {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin: 1rem 0;
        }
        .auction-player-wrap {
          margin-bottom: 0.15rem;
        }
        .auction-player-wrap.current-turn .auction-player-row {
          background: rgba(184, 84, 80, 0.25);
          border-radius: 6px;
        }
        .auction-player-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          border-left: 4px solid transparent;
        }
        .auction-player-row.passed {
          opacity: 0.5;
          color: var(--text-muted);
        }
        .auction-arrow {
          color: var(--accent);
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.2rem;
          padding-left: 0.6rem;
        }
        .auction-player-name {
          flex: 1;
          font-weight: 500;
        }
        .auction-player-status {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .auction-player-bid {
          font-weight: 600;
          min-width: 2.5rem;
          text-align: right;
        }
        .bid-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin: 1.5rem 0;
        }
        .bid-row input {
          width: 7rem;
          padding: 0.75rem;
          font-size: 1.25rem;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
        }
        .bid-row button {
          padding: 0.75rem 1.25rem;
          font-size: 1.1rem;
        }
        .your-money {
          font-size: 1rem;
        }
      `}</style>
    </div>
  )
}
