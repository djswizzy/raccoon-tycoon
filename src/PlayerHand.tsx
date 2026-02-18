import type { ProductionCard, BuildingTile } from './types'
import { COMMODITY_NAMES } from './data/cards'
import { COMMODITIES } from './gameLogic'

type Props = {
  hand: ProductionCard[]
  onProduce: (cardIndex: number) => void
  disabled: boolean
  commodities: Partial<Record<string, number>>
  buildings: BuildingTile[]
  selectedCardIndex?: number | null
}

export function PlayerHand({ hand, onProduce, disabled, commodities: _commodities, buildings: _buildings, selectedCardIndex = null }: Props) {
  return (
    <div className="player-hand card">
      <h3>Your hand (play one to produce)</h3>
      <div className="hand-cards">
        {hand.map((card, i) => (
          <button
            key={card.id}
            type="button"
            className={`prod-card ${selectedCardIndex === i ? 'selected' : ''}`}
            onClick={() => onProduce(i)}
            disabled={disabled}
          >
            <div className="prod-icons">
              {COMMODITIES.flatMap(c =>
                Array(card.production[c] ?? 0).fill(c).map((co, j) => (
                  <span key={`${co}-${j}`} className="icon" title={COMMODITY_NAMES[co as keyof typeof COMMODITY_NAMES]}>
                    {COMMODITY_NAMES[co as keyof typeof COMMODITY_NAMES].slice(0, 1)}
                  </span>
                ))
              )}
            </div>
            <div className="price-up">
              ↑ {card.priceIncrease.map(c => COMMODITY_NAMES[c as keyof typeof COMMODITY_NAMES].slice(0, 1)).join(', ')}
            </div>
          </button>
        ))}
      </div>
      <style>{`
        .player-hand {
          flex: 1;
          min-width: 280px;
        }
        .player-hand h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .hand-cards {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .prod-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0.6rem;
          min-width: 80px;
          text-align: center;
        }
        .prod-card:hover:not(:disabled) {
          border-color: var(--accent);
        }
        .prod-icons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.2rem;
          justify-content: center;
          margin-bottom: 0.25rem;
        }
        .prod-icons .icon {
          font-size: 0.75rem;
          padding: 0.15rem 0.3rem;
          background: var(--surface);
          border-radius: 4px;
        }
        .price-up {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .prod-card.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
        }
      `}</style>
    </div>
  )
}
