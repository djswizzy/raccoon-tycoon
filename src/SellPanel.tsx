import { useState } from 'react'
import type { Commodity, Market } from './types'
import { COMMODITY_NAMES } from './data/cards'
import { COMMODITIES } from './gameLogic'

type Props = {
  commodities: Partial<Record<Commodity, number>>
  market: Market
  onSell: (commodity: Commodity, quantity: number) => void
  onClose: () => void
}

export function SellPanel({ commodities, market, onSell, onClose }: Props) {
  const [selected, setSelected] = useState<Commodity | null>(null)
  const [qty, setQty] = useState(1)

  const have = selected ? (commodities[selected] ?? 0) : 0
  const price = selected ? market[selected] : 0
  const maxQty = Math.min(have, 10)

  return (
    <div className="sell-overlay">
      <div className="sell-panel card">
        <h2>Sell commodities</h2>
        <p>Choose a commodity and quantity. Price will drop by the amount sold.</p>
        <div className="commodity-buttons">
          {COMMODITIES.map(c => {
            const n = commodities[c] ?? 0
            if (n === 0) return null
            return (
              <button
                key={c}
                type="button"
                className={`secondary ${selected === c ? 'active' : ''}`}
                onClick={() => { setSelected(c); setQty(1); }}
              >
                {COMMODITY_NAMES[c]} ({n}) @ ${market[c]}
              </button>
            )
          })}
        </div>
        {selected && have > 0 && (
          <div className="qty-row">
            <label>Quantity:</label>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={e => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1)))}
            />
            <span className="total">= ${price * qty}</span>
            <button
              type="button"
              className="primary"
              onClick={() => onSell(selected, qty)}
            >
              Sell {qty}
            </button>
          </div>
        )}
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <style>{`
        .sell-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .sell-panel {
          max-width: 420px;
          padding: 1.5rem;
        }
        .sell-panel h2 {
          margin-bottom: 0.5rem;
        }
        .commodity-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .commodity-buttons .active {
          border-color: var(--accent);
          background: var(--surface2);
        }
        .qty-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .qty-row input {
          width: 4rem;
          padding: 0.4rem;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
        }
        .qty-row .total {
          color: var(--accent);
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
