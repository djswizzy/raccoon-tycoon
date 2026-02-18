import type { GameState } from './types'
import { COMMODITY_NAMES } from './data/cards'
import { COMMODITIES } from './gameLogic'

export type PendingAction =
  | { type: 'production'; cardIndex: number }
  | { type: 'startAuction'; railroadIndex: number }
  | { type: 'buyBuilding'; buildingIndex: number }
  | { type: 'buyTown'; useSpecific: boolean }

type Props = {
  state: GameState
  pending: PendingAction | null
  onCommit: () => void
}

export function ActionBar({ state, pending, onCommit }: Props) {
  const current = state.players[state.currentPlayerIndex]
  let description = 'No action selected'

  if (pending) {
    switch (pending.type) {
      case 'production': {
        const card = current.hand[pending.cardIndex]
        if (card) {
          const prodList = COMMODITIES.flatMap(c =>
            Array(card.production[c] ?? 0).fill(COMMODITY_NAMES[c])
          ).join(', ')
          const priceList = card.priceIncrease.map(c => COMMODITY_NAMES[c]).join(', ')
          description = `Produce: take ${prodList || 'commodities'}, raise ${priceList || '—'} by $1.`
        }
        break
      }
      case 'startAuction': {
        const rr = state.railroadOffer[pending.railroadIndex]
        if (rr) description = `Start auction: ${rr.name} (min $${rr.minBid}).`
        break
      }
      case 'buyBuilding': {
        const b = state.buildingOffer[pending.buildingIndex]
        if (b) description = `Buy ${b.name} for $${b.cost}.`
        break
      }
      case 'buyTown': {
        const town = state.currentTown
        if (town) {
          if (pending.useSpecific) {
            const costDesc = Object.entries(town.costSpecific ?? {})
              .map(([c, n]) => `${n} ${COMMODITY_NAMES[c as keyof typeof COMMODITY_NAMES]}`)
              .join(', ')
            description = `Buy ${town.name}: pay ${costDesc}.`
          } else {
            description = `Buy ${town.name}: pay ${town.costAny} any.`
          }
        }
        break
      }
    }
  }

  return (
    <div className={`action-bar-fixed card ${pending ? 'has-selection' : ''}`}>
      <span className="action-desc">{description}</span>
      <button
        type="button"
        className="primary"
        onClick={onCommit}
        disabled={!pending}
      >
        Commit
      </button>
      <style>{`
        .action-bar-fixed {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.6rem 1rem;
          max-width: calc(100vw - 2rem);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .action-bar-fixed .action-desc {
          font-size: 0.9rem;
          color: var(--text-muted);
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .action-bar-fixed.has-selection .action-desc {
          color: var(--text);
        }
      `}</style>
    </div>
  )
}
