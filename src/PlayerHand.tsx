import type { ProductionCard, BuildingTile } from './types'
import { COMMODITY_NAMES, COMMODITY_EMOJI } from './data/cards'
import { getProductionList } from './gameLogic'

type Props = {
  hand: ProductionCard[]
  onProduce: (cardIndex: number) => void
  onToggleProductionIndex: (cardIndex: number, index: number) => void
  disabled: boolean
  commodities: Partial<Record<string, number>>
  buildings: BuildingTile[]
  selectedCardIndex?: number | null
  productionSelection: number[]
  maxProduction: number
}

export function PlayerHand({
  hand,
  onProduce,
  onToggleProductionIndex,
  disabled,
  commodities: _commodities,
  buildings: _buildings,
  selectedCardIndex = null,
  productionSelection,
  maxProduction,
}: Props) {
  return (
    <div className="player-hand card">
      <h3>Your hand — choose a card, then pick {maxProduction} from the bottom</h3>
      <div className="hand-cards">
        {hand.map((card, i) => {
          const productionList = getProductionList(card)
          const isSelected = selectedCardIndex === i
          return (
            <div
              key={card.id}
              className={`prod-card ${isSelected ? 'selected' : ''}`}
            >
              <button
                type="button"
                className="prod-card-top"
                onClick={() => onProduce(i)}
                disabled={disabled}
              >
                <div className="prod-card-emojis">
                  {card.priceIncrease.map((c, idx) => (
                    <span key={`price-${i}-${idx}`} className="prod-emoji" title={COMMODITY_NAMES[c]}>
                      {COMMODITY_EMOJI[c]}
                    </span>
                  ))}
                  {card.priceIncrease.length === 0 && (
                    <span className="prod-emoji none">—</span>
                  )}
                </div>
              </button>
              <div className="prod-card-divider" />
              <div className="prod-card-bottom">
                <div className="prod-card-emojis prod-slots">
                  {productionList.map((co, slotIndex) => {
                    const takeAll = productionList.length <= maxProduction
                    const slotSelected = !takeAll && isSelected && productionSelection.includes(slotIndex)
                    const canToggle = !takeAll && isSelected && !disabled && (
                      slotSelected || productionSelection.length < maxProduction
                    )
                    return (
                      <button
                        key={`prod-${i}-${slotIndex}`}
                        type="button"
                        className={`prod-emoji slot ${slotSelected ? 'selected' : ''} ${takeAll ? 'take-all' : ''}`}
                        title={COMMODITY_NAMES[co]}
                        disabled={!canToggle}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (canToggle) onToggleProductionIndex(i, slotIndex)
                        }}
                      >
                        {COMMODITY_EMOJI[co]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        .player-hand {
          flex: 1;
          min-width: 320px;
        }
        .player-hand h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .hand-cards {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .prod-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0;
          min-width: 120px;
          width: 120px;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          text-align: center;
          overflow: hidden;
        }
        .prod-card:hover {
          border-color: var(--accent);
        }
        .prod-card.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
        }
        .prod-card-top, .prod-card-bottom {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          min-height: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          font: inherit;
          color: inherit;
        }
        .prod-card-top:disabled {
          cursor: default;
        }
        .prod-card-top {
          background: #2c4a6e;
        }
        .prod-card-divider {
          height: 2px;
          background: var(--border);
        }
        .prod-card-bottom {
          background: #6e2c2c;
        }
        .prod-card-emojis {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          justify-content: center;
          align-items: center;
        }
        .prod-emoji {
          font-size: 1.5rem;
          line-height: 1;
        }
        .prod-emoji.slot {
          padding: 0.15rem;
          border-radius: 6px;
          border: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .prod-emoji.slot:hover:not(:disabled) {
          background: rgba(184, 84, 80, 0.15);
          border-color: var(--accent-dim);
        }
        .prod-emoji.slot.selected {
          border-color: var(--accent);
          background: rgba(184, 84, 80, 0.25);
        }
        .prod-emoji.slot:disabled {
          cursor: default;
        }
        .prod-emoji.slot.take-all {
          cursor: default;
          pointer-events: none;
        }
        .prod-emoji.none {
          font-size: 1rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
