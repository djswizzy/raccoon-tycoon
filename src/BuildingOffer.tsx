import type { BuildingTile } from './types'

type Props = {
  buildings: BuildingTile[]
  onSelect: (index: number) => void
  onConfirmBuy: (index: number) => void
  currentPlayerMoney: number
  selectedBuildingIndex?: number | null
  selectionDisabled?: boolean
}

export function BuildingOffer({ buildings, onSelect, onConfirmBuy, currentPlayerMoney, selectedBuildingIndex = null, selectionDisabled = false }: Props) {
  return (
    <div className="building-offer">
      <h3>Buildings</h3>
      <div className="building-tiles">
        {buildings.map((b, i) => {
          const isSelected = selectedBuildingIndex === i
          const canAfford = currentPlayerMoney >= b.cost
          return (
          <button
            key={b.id}
            type="button"
            className={`building-tile card ${isSelected ? 'selected' : ''}`}
            onClick={() => (isSelected && canAfford ? onConfirmBuy(i) : onSelect(i))}
            disabled={selectionDisabled || !canAfford}
          >
            <div className="b-content">
              <div className="b-name">{b.name}</div>
              <div className="b-desc">{b.description}</div>
            </div>
            <div className="b-cost" aria-label={`Cost ${b.cost}`}>${b.cost}</div>
          </button>
          )
        })}
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
          position: relative;
          text-align: center;
          width: 140px;
          aspect-ratio: 1;
          padding: 0.6rem;
          padding-bottom: 2rem;
          background: #e8dcc8;
          transition: transform 0.2s ease, border-color 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .building-tile:not(.selected):hover:not(:disabled) {
          transform: translateY(-8px);
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 2px var(--accent-dim);
        }
        .building-tile .b-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }
        .building-tile .b-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .building-tile .b-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .building-tile .b-cost {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background: linear-gradient(145deg, #d4af37, #b8962e);
          color: #1a1410;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .building-tile.selected,
        .building-tile.selected:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
          transform: translateY(-8px);
        }
      `}</style>
    </div>
  )
}
