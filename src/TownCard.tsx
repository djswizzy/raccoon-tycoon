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
  actionsDisabled?: boolean
}

export function TownCard({ town, player, onBuySpecific, onBuyAny, selectedBuySpecific = null, actionsDisabled = false }: Props) {
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
            disabled={actionsDisabled || !specificOk}
          >
            Pay {costDesc}
          </button>
        )}
        {town.costAny > 0 && (
          <button
            type="button"
            className={`secondary small ${selectedBuySpecific === false ? 'selected' : ''}`}
            onClick={onBuyAny}
            disabled={actionsDisabled || !anyOk}
          >
            Pay {town.costAny} any
          </button>
        )}
      </div>
      <style>{`
        .town-card {
          width: 100px;
          aspect-ratio: 100 / 130;
          padding: 0.5rem;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transition: transform 0.2s ease, border-color 0.15s, box-shadow 0.15s;
        }
        .town-card:hover {
          transform: translateY(-8px);
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 2px var(--accent-dim);
        }
        .town-name {
          font-weight: 600;
          font-size: 0.8rem;
          line-height: 1.2;
        }
        .town-vp {
          color: var(--accent);
          font-size: 0.8rem;
        }
        .town-cost {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .town-cost .small {
          padding: 0.25rem 0.4rem;
          font-size: 0.7rem;
        }
        .town-cost .small.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
        }
      `}</style>
    </div>
  )
}
