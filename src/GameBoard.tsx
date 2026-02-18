import { useState } from 'react'
import type { GameState } from './types'
import { COMMODITY_NAMES, COMMODITY_EMOJI } from './data/cards'
import { COMMODITIES, actionProduction, actionBuyTown, actionBuyBuilding, startAuction, placeBid, passAuction, actionSell, actionDiscard, getMaxProduction, getProductionList } from './gameLogic'
import { MarketStrip } from './MarketStrip'
import { DiscardDownPanel } from './DiscardDownPanel'
import { RailroadOffer } from './RailroadOffer'
import { TownCard } from './TownCard'
import { BuildingOffer } from './BuildingOffer'
import { PlayerHand } from './PlayerHand'
import { AuctionPanel } from './AuctionPanel'
import { SellPanel } from './SellPanel'
import type { PendingAction } from './ActionBar'

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
  const [productionSelection, setProductionSelection] = useState<number[]>([])
  const current = state.players[state.currentPlayerIndex]
  const isAuction = state.phase === 'auction'
  const maxProduction = getMaxProduction(current)

  function togglePending(next: PendingAction) {
    setPendingAction(prev => {
      const nextIsSame = samePending(prev, next)
      if (next.type === 'production' && (!prev || prev.type !== 'production' || prev.cardIndex !== next.cardIndex)) {
        setProductionSelection([])
      }
      return nextIsSame ? null : next
    })
  }

  function toggleProductionIndex(cardIndex: number, index: number) {
    if (pendingAction?.type !== 'production' || pendingAction.cardIndex !== cardIndex) return
    setProductionSelection(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index)
      if (prev.length >= maxProduction) return prev
      return [...prev, index]
    })
  }

  function commitPending() {
    if (!pendingAction) return
    switch (pendingAction.type) {
      case 'production': {
        const card = current.hand[pendingAction.cardIndex]
        if (card && productionSelection.length === maxProduction) {
          const list = getProductionList(card)
          const toTake = productionSelection.map(i => list[i])
          setState(actionProduction(state, pendingAction.cardIndex, toTake))
        } else if (card) {
          setState(actionProduction(state, pendingAction.cardIndex))
        }
        setProductionSelection([])
        break
      }
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

  const commitDisabled =
    pendingAction?.type === 'production'
      ? (() => {
          const card = current.hand[pendingAction?.cardIndex ?? -1]
          if (!card) return true
          const listLen = getProductionList(card).length
          return listLen > maxProduction
            ? productionSelection.length !== maxProduction
            : false
        })()
      : false

  return (
    <div className="game-board">
      <header className="game-header">
        <h1>Raccoon Tycoon</h1>
        <div className="current-turn">
          <span className="label">Current turn</span>
          <span className="player-name">{current.name}</span>
        </div>
      </header>

      <div className="game-body">
        <div className="game-main">
          <section className="market-section">
            <MarketStrip market={state.market} />
          </section>

      <section className="offer-row">
        <div className="railroad-offer-with-deck">
          <div className="deck-pile" title="Railroad deck">
            <div className="deck-card-back" aria-hidden />
            <span className="deck-count" aria-label={`${state.railroadDeck.length} railroads remaining`}>
              {state.railroadDeck.length}
            </span>
          </div>
          <RailroadOffer
            railroads={state.railroadOffer}
            onStartAuction={(idx) => togglePending({ type: 'startAuction', railroadIndex: idx })}
            disabled={isAuction}
            currentPlayerMoney={current.money}
            selectedRailroadIndex={pendingAction?.type === 'startAuction' ? pendingAction.railroadIndex : null}
          />
        </div>
        <div className="town-offer-with-deck">
          <div className="deck-pile" title="Town deck">
            <div className="deck-card-back" aria-hidden />
            <span className="deck-count" aria-label={`${state.townDeck.length} towns remaining`}>
              {state.townDeck.length}
            </span>
          </div>
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
        </div>
      </section>

      <div className="buildings-and-hand-row">
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
            onToggleProductionIndex={toggleProductionIndex}
            disabled={isAuction}
            commodities={current.commodities}
            buildings={current.buildings}
            selectedCardIndex={pendingAction?.type === 'production' ? pendingAction.cardIndex : null}
            productionSelection={productionSelection}
            maxProduction={maxProduction}
          />
        </section>
      </div>
      </div>

      <aside className="game-sidebar card">
        <h3>Your resources</h3>
        <div className="sidebar-money">${current.money}</div>
        <div className="commodities-list">
          {COMMODITIES.map(c => {
            const n = current.commodities[c] ?? 0
            return (
              <span key={c} className="commodity-chip" title={COMMODITY_NAMES[c]}>
                <span className="commodity-emoji">{COMMODITY_EMOJI[c]}</span>
                <span className="commodity-count">{n}</span>
              </span>
            )
          })}
        </div>
        {current.buildings.length > 0 && (
          <>
            <h3 className="sidebar-buildings-title">Your buildings</h3>
            <ul className="sidebar-buildings">
              {current.buildings.map(b => (
                <li key={b.id} className="sidebar-building" title={b.description}>
                  <span className="sidebar-building-name">{b.name}</span>
                  <span className="sidebar-building-desc">{b.description}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => setShowSellPanel(true)}
        >
          Sell commodities
        </button>
        {!isAuction && (
          <button
            type="button"
            className="primary sidebar-commit"
            onClick={commitPending}
            disabled={!pendingAction || commitDisabled}
          >
            Commit
          </button>
        )}
      </aside>
      </div>

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

      {isAuction && state.auctionRailroad && (
        <AuctionPanel
          state={state}
          onBid={(amount) => setState(placeBid(state, amount))}
          onPass={() => setState(passAuction(state))}
        />
      )}

      {state.phase === 'discardDown' && (
        <DiscardDownPanel
          state={state}
          onDiscard={(commodity) => setState(actionDiscard(state, commodity))}
        />
      )}

      <style>{`
        .game-board {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding: 1rem;
          padding-bottom: 2rem;
          gap: 0;
          max-width: 1400px;
          margin: 0 auto;
        }
        .game-body {
          display: flex;
          flex: 1;
          gap: 1rem;
          align-items: stretch;
          min-height: 0;
        }
        .game-main {
          flex: 1;
          min-width: 0;
        }
        .game-sidebar {
          width: 220px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.75rem;
        }
        .game-sidebar h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0;
        }
        .sidebar-money {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent);
        }
        .game-sidebar .commodities-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .game-sidebar .commodity-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface2);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .game-sidebar .commodity-emoji {
          margin-right: 0.5rem;
        }
        .game-sidebar .commodity-count {
          font-weight: 600;
        }
        .game-sidebar .sidebar-buildings-title {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0.25rem 0 0 0;
        }
        .game-sidebar .sidebar-buildings {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .game-sidebar .sidebar-building {
          background: var(--surface2);
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .game-sidebar .sidebar-building-name {
          font-weight: 600;
          display: block;
        }
        .game-sidebar .sidebar-building-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .sidebar-commit {
          margin-top: auto;
          width: 100%;
          padding: 0.65rem;
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
        .railroad-offer-with-deck,
        .town-offer-with-deck {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .deck-pile {
          position: relative;
          flex-shrink: 0;
        }
        .deck-card-back {
          width: 100px;
          height: 130px;
          background: linear-gradient(145deg, #2a3f5f 0%, #1a2840 100%);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: 2px 2px 6px rgba(0,0,0,0.3);
        }
        .deck-count {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 1.5rem;
          height: 1.5rem;
          padding: 0 0.35rem;
          background: var(--accent);
          color: var(--bg);
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
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
        .buildings-and-hand-row {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 1rem;
          min-width: 0;
        }
        .buildings-section {
          flex-shrink: 0;
        }
        .player-area {
          flex: 1;
          min-width: 0;
        }
      `}</style>
    </div>
  )
}
