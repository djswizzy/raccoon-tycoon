import type { BuildingTile } from './types'

type Props = {
  buildings: BuildingTile[]
  onBuy: (index: number) => void
  currentPlayerMoney: number
  selectedBuildingIndex?: number | null
}

export function BuildingOffer({ buildings, onBuy, currentPlayerMoney, selectedBuildingIndex = null }: Props) {
  return (
    <div className="building-offer">
      <h3>Buildings</h3>
      <div className="building-tiles">
        {buildings.map((b, i) => (
          <button
            key={b.id}
            type="button"
            className={`building-tile card ${selectedBuildingIndex === i ? 'selected' : ''}`}
            onClick={() => onBuy(i)}
            disabled={currentPlayerMoney < b.cost}
          >
            <div className="b-name">{b.name}</div>
            <div className="b-cost">${b.cost}</div>
            <div className="b-desc">{b.description}</div>
          </button>
        ))}
      </div>
      <style>{`
        .building-offer h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .building-tiles {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .building-tile {
          text-align: left;
          min-width: 140px;
          padding: 0.6rem;
        }
        .building-tile .b-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .building-tile .b-cost {
          color: var(--accent);
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }
        .building-tile .b-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .building-tile.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
        }
      `}</style>
    </div>
  )
}
