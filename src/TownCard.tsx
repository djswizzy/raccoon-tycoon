import type { TownCard as TownCardType, Player } from './types'
import { COMMODITY_NAMES } from './data/cards'
import { COMMODITIES } from './gameLogic'

function totalCommodities(c: Partial<Record<string, number>>): number {
  return COMMODITIES.reduce((s, k) => s + (c[k] ?? 0), 0)
}

function canBuySpecific(player: Player, town: TownCardType): boolean {
  for (const [key, n] of Object.entries(town.costSpecific ?? {})) {
    if ((player.commodities[key as keyof typeof player.commodities] ?? 0) < n) return false
  }
  return Object.keys(town.costSpecific ?? {}).length > 0
}

function canBuyAny(player: Player, town: TownCardType): boolean {
  return town.costAny > 0 && totalCommodities(player.commodities) >= town.costAny
}

type Props = {
  town: TownCardType
  player: Player
  onBuySpecific: () => void
  onBuyAny: () => void
  selectedBuySpecific?: boolean | null
}

export function TownCard({ town, player, onBuySpecific, onBuyAny, selectedBuySpecific = null }: Props) {
  const specificOk = canBuySpecific(player, town)
  const anyOk = canBuyAny(player, town)
  const costDesc = Object.entries(town.costSpecific ?? {})
    .map(([c, n]) => `${n} ${COMMODITY_NAMES[c as keyof typeof COMMODITY_NAMES]}`)
    .join(', ')

  return (
    <div className="town-card card">
      <div className="town-name">{town.name}</div>
      <div className="town-vp">{town.vp} VP</div>
      <div className="town-cost">
        {costDesc && (
          <button
            type="button"
            className={`secondary small ${selectedBuySpecific === true ? 'selected' : ''}`}
            onClick={onBuySpecific}
            disabled={!specificOk}
          >
            Pay {costDesc}
          </button>
        )}
        {town.costAny > 0 && (
          <button
            type="button"
            className={`secondary small ${selectedBuySpecific === false ? 'selected' : ''}`}
            onClick={onBuyAny}
            disabled={!anyOk}
          >
            Pay {town.costAny} any
          </button>
        )}
      </div>
      <style>{`
        .town-card {
          padding: 0.75rem;
        }
        .town-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .town-vp {
          color: var(--accent);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .town-cost {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .town-cost .small {
          padding: 0.35rem 0.6rem;
          font-size: 0.8rem;
        }
        .town-cost .small.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
        }
      `}</style>
    </div>
  )
}
