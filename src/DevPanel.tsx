/**
 * Dev mode panel: give yourself cards/resources for testing.
 * Only active when URL has ?dev=1 (e.g. http://localhost:5173/?dev=1).
 * To remove: delete this file and its usage in GameBoard.
 */
import { useState, useMemo } from 'react'
import type { GameState } from './types'
import type { Commodity, RailroadCard } from './types'
import { COMMODITY_NAMES, RAILROAD_TYPES, getBuildingTileById, getAllBuildingTiles } from './data/cards'
import { drawOneCard } from './gameLogic'

const COMMODITIES: Commodity[] = ['wheat', 'wood', 'iron', 'coal', 'goods', 'luxury']

type Props = {
  state: GameState
  setState: (s: GameState) => void
  playerIndex: number
}

function useDevMode(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('dev') === '1'
  }, [typeof window !== 'undefined' && window.location.search])
}

export function DevPanel({ state, setState, playerIndex }: Props) {
  const [open, setOpen] = useState(false)
  const [commodity, setCommodity] = useState<Commodity>('wheat')
  const [commodityQty, setCommodityQty] = useState(2)
  const [buildingId, setBuildingId] = useState('')
  const [railroadTypeId, setRailroadTypeId] = useState(RAILROAD_TYPES[0]?.typeId ?? '')

  const isDev = useDevMode()
  const buildingTiles = useMemo(() => getAllBuildingTiles(), [])

  if (!isDev) return null

  function addCard() {
    setState(drawOneCard(state))
  }

  function addMoney() {
    const s = { ...state, players: state.players.map((p, i) => i === playerIndex ? { ...p, money: p.money + 20 } : p) }
    setState(s)
  }

  function addCommodity() {
    if (commodityQty < 1) return
    const s = { ...state, players: state.players.map((p, i) => {
      if (i !== playerIndex) return p
      const cur = p.commodities[commodity] ?? 0
      return { ...p, commodities: { ...p.commodities, [commodity]: cur + commodityQty } }
    }) }
    setState(s)
  }

  function addBuilding() {
    const tile = buildingId ? getBuildingTileById(buildingId) : null
    if (!tile) return
    const s = { ...state, players: state.players.map((p, i) => {
      if (i !== playerIndex) return p
      return { ...p, buildings: [...p.buildings, tile] }
    }) }
    setState(s)
    setBuildingId('')
  }

  function addRailroadToOffer() {
    const template = RAILROAD_TYPES.find(t => t.typeId === railroadTypeId)
    if (!template) return
    const newCard: RailroadCard = {
      id: `rr-dev-${Date.now()}`,
      typeId: template.typeId,
      name: template.name,
      minBid: template.minBid,
      vpSchedule: template.vpSchedule,
    }
    setState({
      ...state,
      railroadOffer: [...state.railroadOffer, newCard],
    })
  }

  return (
    <div className="dev-panel">
      <button type="button" className="dev-panel-toggle" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} Dev
      </button>
      {open && (
        <div className="dev-panel-content card">
          <h4>Dev: give yourself</h4>
          <div className="dev-panel-actions">
            <button type="button" onClick={addCard}>Draw 1 card</button>
            <button type="button" onClick={addMoney}>+$20</button>
            <div className="dev-panel-row">
              <select value={commodity} onChange={(e) => setCommodity(e.target.value as Commodity)}>
                {COMMODITIES.map(c => (
                  <option key={c} value={c}>{COMMODITY_NAMES[c]}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={20}
                value={commodityQty}
                onChange={(e) => setCommodityQty(parseInt(e.target.value, 10) || 1)}
              />
              <button type="button" onClick={addCommodity}>Add</button>
            </div>
            <div className="dev-panel-row">
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
              >
                <option value="">— Building —</option>
                {buildingTiles.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button type="button" onClick={addBuilding} disabled={!buildingId}>Add building</button>
            </div>
            <div className="dev-panel-row">
              <select
                value={railroadTypeId}
                onChange={(e) => setRailroadTypeId(e.target.value)}
              >
                {RAILROAD_TYPES.map(t => (
                  <option key={t.typeId} value={t.typeId}>{t.name} (min ${t.minBid})</option>
                ))}
              </select>
              <button type="button" onClick={addRailroadToOffer}>Add railroad to offer</button>
            </div>
          </div>
          <p className="dev-panel-hint">URL ?dev=1 to show. Remove this file to strip dev mode.</p>
        </div>
      )}
      <style>{`
        .dev-panel {
          position: fixed;
          bottom: 0.5rem;
          left: 0.5rem;
          z-index: 999;
        }
        .dev-panel-toggle {
          padding: 0.35rem 0.6rem;
          font-size: 0.8rem;
          background: #333;
          color: #ccc;
          border: 1px solid #555;
          border-radius: 4px;
          cursor: pointer;
        }
        .dev-panel-toggle:hover {
          background: #444;
          color: #fff;
        }
        .dev-panel-content {
          margin-top: 0.35rem;
          padding: 0.75rem;
          max-width: 320px;
          background: var(--surface1);
          border: 1px solid var(--border);
        }
        .dev-panel-content h4 {
          margin: 0 0 0.5rem;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .dev-panel-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .dev-panel-actions > button {
          padding: 0.3rem 0.5rem;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .dev-panel-row {
          display: flex;
          gap: 0.35rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .dev-panel-row select,
        .dev-panel-row input[type="number"] {
          padding: 0.25rem;
          font-size: 0.85rem;
        }
        .dev-panel-row input[type="number"] {
          width: 2.5rem;
        }
        .dev-panel-hint {
          margin: 0.5rem 0 0;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
