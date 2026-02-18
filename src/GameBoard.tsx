import { useState } from 'react'
import type { GameState } from './types'
import { COMMODITY_NAMES } from './data/cards'
import { COMMODITIES, actionProduction, actionBuyTown, actionBuyBuilding, startAuction, placeBid, passAuction, actionSell } from './gameLogic'
import { MarketStrip } from './MarketStrip'
import { RailroadOffer } from './RailroadOffer'
import { TownCard } from './TownCard'
import { BuildingOffer } from './BuildingOffer'
import { PlayerHand } from './PlayerHand'
import { PlayerPanels } from './PlayerPanels'
import { AuctionPanel } from './AuctionPanel'
import { SellPanel } from './SellPanel'
import { ActionBar, type PendingAction } from './ActionBar'

type Props = {
  state: GameState
  setState: (s: GameState) => void
}

function samePending(a: PendingAction | null, b: PendingAction): boolean {
  if (!a) return false
  if (a.type !== b.type) return false
  switch (a.type) {
    case 'production': return b.type === 'production' && a.cardIndex === b.cardIndex
    case 'startAuction': return b.type === 'startAuction' && a.railroadIndex === b.railroadIndex
    case 'buyBuilding': return b.type === 'buyBuilding' && a.buildingIndex === b.buildingIndex
    case 'buyTown': return b.type === 'buyTown' && a.useSpecific === b.useSpecific
    default: return false
  }
}

export function GameBoard({ state, setState }: Props) {
  const [showSellPanel, setShowSellPanel] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const current = state.players[state.currentPlayerIndex]
  const isAuction = state.phase === 'auction'

  function togglePending(next: PendingAction) {
    setPendingAction(prev => samePending(prev, next) ? null : next)
  }

  function commitPending() {
    if (!pendingAction) return
    switch (pendingAction.type) {
      case 'production':
        setState(actionProduction(state, pendingAction.cardIndex))
        break
      case 'startAuction':
        setState(startAuction(state, pendingAction.railroadIndex))
        break
      case 'buyBuilding':
        setState(actionBuyBuilding(state, pendingAction.buildingIndex))
        break
      case 'buyTown':
        setState(actionBuyTown(state, pendingAction.useSpecific))
        break
    }
    setPendingAction(null)
  }

  return (
    <div className="game-board">
      <header className="game-header">
        <h1>Raccoon Tycoon</h1>
        <div className="current-turn">
          <span className="label">Current turn</span>
          <span className="player-name">{current.name}</span>
        </div>
      </header>

      {!isAuction && (
        <ActionBar
          state={state}
          pending={pendingAction}
          onCommit={commitPending}
        />
      )}

      <section className="market-section">
        <MarketStrip market={state.market} />
      </section>

      <section className="offer-row">
        <RailroadOffer
          railroads={state.railroadOffer}
          onStartAuction={(idx) => togglePending({ type: 'startAuction', railroadIndex: idx })}
          disabled={isAuction}
          currentPlayerMoney={current.money}
          selectedRailroadIndex={pendingAction?.type === 'startAuction' ? pendingAction.railroadIndex : null}
        />
        <div className="town-slot">
          <h3>Town</h3>
          {state.currentTown ? (
            <TownCard
              town={state.currentTown}
              onBuySpecific={() => togglePending({ type: 'buyTown', useSpecific: true })}
              onBuyAny={() => togglePending({ type: 'buyTown', useSpecific: false })}
              player={current}
              selectedBuySpecific={pendingAction?.type === 'buyTown' ? pendingAction.useSpecific : null}
            />
          ) : (
            <div className="empty-slot">No town available</div>
          )}
        </div>
      </section>

      <section className="buildings-section">
        <BuildingOffer
          buildings={state.buildingOffer}
          onBuy={(idx) => togglePending({ type: 'buyBuilding', buildingIndex: idx })}
          currentPlayerMoney={current.money}
          selectedBuildingIndex={pendingAction?.type === 'buyBuilding' ? pendingAction.buildingIndex : null}
        />
      </section>

      <section className="player-area">
        <PlayerHand
          hand={current.hand}
          onProduce={(cardIndex) => togglePending({ type: 'production', cardIndex })}
          disabled={isAuction}
          commodities={current.commodities}
          buildings={current.buildings}
          selectedCardIndex={pendingAction?.type === 'production' ? pendingAction.cardIndex : null}
        />
        <div className="my-resources card">
          <h3>Your resources</h3>
          <div className="money">${current.money}</div>
          <div className="commodities-list">
            {COMMODITIES.map(c => {
              const n = current.commodities[c] ?? 0
              if (n === 0) return null
              return (
                <span key={c} className="commodity-chip">
                  {COMMODITY_NAMES[c]}: {n}
                </span>
              )
            })}
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => setShowSellPanel(true)}
          >
            Sell commodities
          </button>
        </div>
      </section>

      {showSellPanel && (
        <SellPanel
          commodities={current.commodities}
          market={state.market}
          onSell={(commodity, qty) => {
            setState(actionSell(state, commodity, qty))
            setShowSellPanel(false)
          }}
          onClose={() => setShowSellPanel(false)}
        />
      )}

      <PlayerPanels state={state} />

      {isAuction && state.auctionRailroad && (
        <AuctionPanel
          state={state}
          onBid={(amount) => setState(placeBid(state, amount))}
          onPass={() => setState(passAuction(state))}
        />
      )}

      <style>{`
        .game-board {
          min-height: 100vh;
          padding: 1rem;
          padding-bottom: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .game-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .game-header h1 {
          font-size: 1.5rem;
          color: var(--accent);
          margin: 0;
        }
        .current-turn {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .current-turn .label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .current-turn .player-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .market-section {
          margin-bottom: 1rem;
        }
        .offer-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .town-slot {
          flex: 1;
          min-width: 200px;
        }
        .town-slot h3, .buildings-section h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .empty-slot {
          background: var(--surface2);
          border: 1px dashed var(--border);
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          color: var(--text-muted);
        }
        .buildings-section {
          margin-bottom: 1rem;
        }
        .player-area {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .player-area .my-resources {
          min-width: 200px;
        }
        .my-resources .money {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 0.5rem;
        }
        .commodities-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-bottom: 0.75rem;
        }
        .commodity-chip {
          background: var(--surface2);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  )
}
