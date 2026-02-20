import { useState, useMemo } from 'react'
import type { Commodity } from './types'
import type { TownCard } from './types'
import { COMMODITIES } from './gameLogic'
import { COMMODITY_NAMES, COMMODITY_EMOJI } from './data/cards'

type Props = {
  town: TownCard
  /** Effective cost (e.g. costAny - Brick Works reduction). */
  totalToSpend: number
  commodities: Partial<Record<Commodity, number>>
  onConfirm: (selection: Partial<Record<Commodity, number>>) => void
  onCancel: () => void
}

export function TownPayAnyPanel({ town, totalToSpend, commodities, onConfirm, onCancel }: Props) {
  const [selection, setSelection] = useState<Partial<Record<Commodity, number>>>({})

  const currentSum = useMemo(
    () => COMMODITIES.reduce((s, c) => s + (selection[c] ?? 0), 0),
    [selection]
  )
  const valid = currentSum === totalToSpend

  function adjust(c: Commodity, delta: number) {
    const cur = selection[c] ?? 0
    const have = commodities[c] ?? 0
    const next = Math.max(0, Math.min(have, cur + delta))
    setSelection(prev => (next === 0 ? { ...prev, [c]: undefined } : { ...prev, [c]: next }))
  }

  return (
    <div className="town-pay-any-overlay" onClick={onCancel}>
      <div className="town-pay-any-panel card" onClick={e => e.stopPropagation()}>
        <h2>Pay {totalToSpend} any for {town.name}</h2>
        <p className="town-pay-any-hint">Choose a mix of resources that total {totalToSpend}. You have: {COMMODITIES.map(c => `${commodities[c] ?? 0} ${COMMODITY_EMOJI[c]}`).join(' · ')}</p>
        <div className="town-pay-any-rows">
          {COMMODITIES.map(c => {
            const have = commodities[c] ?? 0
            const chosen = selection[c] ?? 0
            if (have === 0) return null
            return (
              <div key={c} className="town-pay-any-row">
                <span className="town-pay-any-emoji">{COMMODITY_EMOJI[c]}</span>
                <span className="town-pay-any-name">{COMMODITY_NAMES[c]}</span>
                <div className="town-pay-any-stepper">
                  <button
                    type="button"
                    className="town-pay-any-btn"
                    onClick={() => adjust(c, -1)}
                    disabled={chosen <= 0}
                    aria-label={`Less ${COMMODITY_NAMES[c]}`}
                  >
                    −
                  </button>
                  <span className="town-pay-any-value">{chosen}</span>
                  <button
                    type="button"
                    className="town-pay-any-btn"
                    onClick={() => adjust(c, 1)}
                    disabled={chosen >= have || currentSum >= totalToSpend}
                    aria-label={`More ${COMMODITY_NAMES[c]}`}
                  >
                    +
                  </button>
                </div>
                <span className="town-pay-any-have">/ {have}</span>
              </div>
            )
          })}
        </div>
        <p className="town-pay-any-total">Total: {currentSum} / {totalToSpend}</p>
        <div className="town-pay-any-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => valid && onConfirm(selection)}
            disabled={!valid}
          >
            Pay and buy {town.name}
          </button>
        </div>
      </div>
      <style>{`
        .town-pay-any-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .town-pay-any-panel {
          max-width: 360px;
          padding: 1rem;
        }
        .town-pay-any-panel h2 {
          margin: 0 0 0.5rem;
          font-size: 1rem;
        }
        .town-pay-any-hint {
          margin: 0 0 1rem;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .town-pay-any-rows {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .town-pay-any-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .town-pay-any-emoji {
          font-size: 1.25rem;
        }
        .town-pay-any-name {
          flex: 1;
          font-size: 0.9rem;
        }
        .town-pay-any-stepper {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .town-pay-any-btn {
          width: 1.75rem;
          height: 1.75rem;
          padding: 0;
          font-size: 1rem;
          line-height: 1;
          border-radius: 4px;
          cursor: pointer;
          background: var(--surface1);
          border: 1px solid var(--border);
        }
        .town-pay-any-btn:hover:not(:disabled) {
          background: var(--accent-dim);
          border-color: var(--accent);
        }
        .town-pay-any-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .town-pay-any-value {
          min-width: 1.5rem;
          text-align: center;
          font-weight: 600;
        }
        .town-pay-any-have {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .town-pay-any-total {
          margin: 0 0 1rem;
          font-weight: 600;
          color: var(--accent);
        }
        .town-pay-any-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  )
}
