import type { RailroadCard as RRCard } from './types'

type Props = {
  railroads: (RRCard | null)[]
  onSelect: (index: number) => void
  onConfirmStartAuction: (index: number) => void
  disabled: boolean
  currentPlayerMoney: number
  selectedRailroadIndex?: number | null
  hideTitle?: boolean
}

function railroadVpProgression(vp: number): string {
  const one = vp
  const two = 2 * vp + 1
  const three = 3 * vp + 3
  const four = 4 * vp + 7
  return `${one}:${two}:${three}:${four}`
}

export function RailroadOffer({ railroads, onSelect, onConfirmStartAuction, disabled, currentPlayerMoney, selectedRailroadIndex = null, hideTitle = false }: Props) {
  return (
    <div className="railroad-offer">
      {!hideTitle && <h3>Railroads (auction)</h3>}
      <div className="railroad-cards">
        {railroads.map((rr, i) => (
          rr ? (
            <button
              key={rr.id}
              type="button"
              className={`railroad-card card ${selectedRailroadIndex === i ? 'selected' : ''}`}
              onClick={() => {
                const isSelected = selectedRailroadIndex === i
                const canAfford = currentPlayerMoney >= rr.minBid
                if (isSelected && canAfford) onConfirmStartAuction(i)
                else onSelect(i)
              }}
              disabled={disabled || currentPlayerMoney < rr.minBid}
            >
              <div className="rr-name">{rr.name}</div>
              <div className="rr-min">Min ${rr.minBid}</div>
              <div className="rr-vp" title="VP for 1, 2, 3, 4 cards">{railroadVpProgression(rr.vp)}</div>
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
          width: 100px;
          aspect-ratio: 100 / 130;
          padding: 0.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          justify-content: center;
          transition: transform 0.2s ease, border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .railroad-card:not(.selected):hover:not(:disabled):not(.empty) {
          transform: translateY(-8px);
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 2px var(--accent-dim);
        }
        .railroad-card .rr-name {
          font-weight: 600;
          font-size: 0.95rem;
          line-height: 1.2;
        }
        .railroad-card .rr-min {
          font-size: 0.9rem;
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
        .railroad-card.selected,
        .railroad-card.selected:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-dim);
          transform: translateY(-8px);
        }
      `}</style>
    </div>
  )
}
