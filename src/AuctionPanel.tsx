import { useState } from 'react'
import type { GameState } from './types'

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
          max-width: 400px;
          padding: 1.5rem;
        }
        .auction-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .auction-panel-header h2 {
          margin: 0 0 0.25rem 0;
        }
        .auction-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          padding: 0 0.25rem;
        }
        .auction-close:hover {
          color: var(--text);
        }
        .auction-panel p {
          margin: 0.5rem 0;
          color: var(--text-muted);
        }
        .current-high {
          font-size: 0.9rem;
        }
        .bid-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin: 1rem 0;
        }
        .bid-row input {
          width: 5rem;
          padding: 0.5rem;
          font-size: 1rem;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
        }
        .your-money {
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  )
}
