import type { RailroadCard as RRCard } from './types'

type Props = {
  railroads: (RRCard | null)[]
  onStartAuction: (index: number) => void
  disabled: boolean
  currentPlayerMoney: number
  selectedRailroadIndex?: number | null
}

export function RailroadOffer({ railroads, onStartAuction, disabled, currentPlayerMoney, selectedRailroadIndex = null }: Props) {
  return (
    <div className="railroad-offer">
      <h3>Railroads (auction)</h3>
      <div className="railroad-cards">
        {railroads.map((rr, i) => (
          rr ? (
            <button
              key={rr.id}
              type="button"
              className={`railroad-card card ${selectedRailroadIndex === i ? 'selected' : ''}`}
              onClick={() => onStartAuction(i)}
              disabled={disabled || currentPlayerMoney < rr.minBid}
            >
              <div className="rr-name">{rr.name}</div>
              <div className="rr-min">Min ${rr.minBid}</div>
              <div className="rr-vp">{rr.vp} VP each</div>
            </button>
          ) : (
            <div key={`empty-${i}`} className="railroad-card empty">—</div>
          )
        ))}
      </div>
      <style>{`
        .railroad-offer {
          flex: 1;
          min-width: 200px;
        }
        .railroad-offer h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .railroad-cards {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .railroad-card {
          min-width: 120px;
          padding: 0.75rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .railroad-card button.railroad-card:hover:not(:disabled) {
          border-color: var(--accent);
        }
        .railroad-card .rr-name {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .railroad-card .rr-min {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .railroad-card .rr-vp {
          font-size: 0.9rem;
          color: var(--accent);
        }
        .railroad-card.empty {
          background: var(--surface2);
          border-style: dashed;
        }
        .railroad-card.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
        }
      `}</style>
    </div>
  )
}
