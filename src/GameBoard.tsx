import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import type { GameState, BuildingTile, Commodity } from './types'
import type { GameAction } from './gameLogic'
import { COMMODITY_NAMES, COMMODITY_EMOJI, getBuildingTileById } from './data/cards'
import { COMMODITIES, COMMODITY_PRICE_MAX, actionProduction, actionBuyTown, actionBuyBuilding, actionUpgradeBBuilding, actionSetActiveBpBuilding, startAuction, placeBid, passAuction, actionSell, actionDiscard, actionEndTurn, cloneGameState, getMaxProduction, getProductionList, getTownCostReduce } from './gameLogic'
import { MarketStrip } from './MarketStrip'
import { DiscardDownPanel } from './DiscardDownPanel'
import { RailroadOffer, formatRailroadVpSchedule } from './RailroadOffer'
import { TownCard } from './TownCard'
import { TownPayAnyPanel } from './TownPayAnyPanel'
import { BuildingOffer, BuildingInfoModal } from './BuildingOffer'
import { PlayerHand } from './PlayerHand'
import { AuctionPanel } from './AuctionPanel'
import { SellPanel } from './SellPanel'
import { GameLog, getPlayerColor, type LogEntry } from './GameLog'
import { PlayerPanel } from './PlayerPanel'
import { DevPanel } from './DevPanel'
import type { PendingAction } from './ActionBar'

type Props = {
  state: GameState
  setState: (s: GameState) => void
  dispatch?: (action: GameAction, applyFirst?: GameAction) => void
  playerIndex?: number
  serverLogEntries?: LogEntry[]
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

function formatActionMessage(action: GameAction, state: GameState, prevState?: GameState): string {
  const useState = prevState || state
  switch (action.type) {
    case 'production': {
      const player = useState.players[useState.currentPlayerIndex]
      const card = player?.hand[action.cardIndex]
      if (!card) return 'Played production card'
      const commodities = action.commoditiesToTake || []
      const prodList = commodities.length > 0 
        ? commodities.map((c: Commodity) => COMMODITY_NAMES[c]).join(', ')
        : 'commodities'
      const priceList = card.priceIncrease.length > 0
        ? card.priceIncrease.map((c: Commodity) => COMMODITY_NAMES[c]).join(', ')
        : '—'
      const tf = action.tradingFloorPurchase
      const tfMsg = tf && tf.quantity > 0 && useState.players[tf.fromPlayerIndex]
        ? `; bought ${tf.quantity} ${COMMODITY_NAMES[tf.commodity]} from ${useState.players[tf.fromPlayerIndex].name} (Trading Floor)`
        : ''
      return `Played production card: took ${prodList}, raised ${priceList} by $1${tfMsg}`
    }
    case 'sell':
      return `Sold ${action.quantity} ${COMMODITY_NAMES[action.commodity]}`
    case 'discard':
      return `Discarded ${COMMODITY_NAMES[action.commodity]}`
    case 'buyBuilding': {
      const building = useState.buildingOffer[action.buildingIndex]
      return building ? `Bought ${building.name} for $${building.cost}` : 'Bought building'
    }
    case 'upgradeBBuilding': {
      const prev = prevState ?? state
      const b = prev.players[prev.currentPlayerIndex]?.buildings.find(x => x.id === action.buildingId)
      if (b?.bpUpgradeToId) {
        const level2 = getBuildingTileById(b.bpUpgradeToId)
        return level2 ? `Upgraded to ${level2.name}` : `Upgraded ${b.name} to +2`
      }
      const level2InState = state.players[state.currentPlayerIndex]?.buildings.find(x => x.bpUpgradeFromId === action.buildingId)
      return level2InState ? `Upgraded to ${level2InState.name}` : 'Upgraded B building'
    }
    case 'buyTown': {
      const town = useState.currentTown
      if (!town) return 'Bought town'
      return `Bought ${town.name} (${action.useSpecific ? 'specific commodities' : 'any commodities'})`
    }
    case 'startAuction': {
      const railroad = useState.railroadOffer[action.railroadIndex]
      return railroad ? `Started auction for ${railroad.name}` : 'Started auction'
    }
    case 'placeBid':
      return `Bid $${action.amount}`
    case 'passAuction':
      return 'Passed on auction'
    case 'endTurn':
      return 'Ended turn'
    default:
      return 'Performed action'
  }
}

export function GameBoard({ state, setState, dispatch, playerIndex, serverLogEntries }: Props) {
  const [showSellPanel, setShowSellPanel] = useState(false)
  const [showTownPayAnyPanel, setShowTownPayAnyPanel] = useState(false)
  const [infoBuilding, setInfoBuilding] = useState<BuildingTile | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [productionSelection, setProductionSelection] = useState<number[]>([])
  const [tradingFloorPurchase, setTradingFloorPurchase] = useState<{ fromPlayerIndex: number; commodity: Commodity; quantity: number } | null>(null)
  const [stateBeforeAction, setStateBeforeAction] = useState<GameState | null>(null)
  const [stateBeforeAuction, setStateBeforeAuction] = useState<GameState | null>(null)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const turnActionsRef = useRef<Array<{ action: GameAction; playerIdx: number }>>([])
  const prevStateRef = useRef<GameState>(state)
  const isOnline = !!dispatch && playerIndex !== undefined
  const me = isOnline ? state.players[playerIndex] : state.players[state.currentPlayerIndex]
  const current = state.players[state.currentPlayerIndex]
  const isMyTurn = !isOnline || state.currentPlayerIndex === playerIndex
  const isAuction = state.phase === 'auction'

  // Reset log only when game first enters playing (not when returning from auction)
  useEffect(() => {
    if (state.phase === 'playing' && prevStateRef.current.phase !== 'playing' && prevStateRef.current.phase !== 'auction') {
      setLogEntries([])
      turnActionsRef.current = []
    }
    prevStateRef.current = state
  }, [state.phase])

  // Reset Trading Floor purchase when leaving production pending action
  useEffect(() => {
    if (pendingAction?.type !== 'production') setTradingFloorPurchase(null)
  }, [pendingAction?.type, pendingAction?.type === 'production' ? pendingAction.cardIndex : undefined])

  // Clear turn actions when turn changes
  useEffect(() => {
    if (prevStateRef.current.currentPlayerIndex !== state.currentPlayerIndex && prevStateRef.current.currentPlayerIndex !== undefined) {
      turnActionsRef.current = []
    }
    prevStateRef.current = state
  }, [state.currentPlayerIndex])

  function addTurnAction(action: GameAction, playerIdx: number) {
    const entry = { action, playerIdx }
    turnActionsRef.current = [...turnActionsRef.current, entry]
  }

  function logTurnActions() {
    const actions = turnActionsRef.current.filter(
      ({ action }) => action.type !== 'endTurn' && action.type !== 'placeBid' && action.type !== 'passAuction'
    )
    if (actions.length === 0) return

    const playerIdx = actions[0].playerIdx
    const entries: LogEntry[] = actions.map(({ action }, idx) => {
      const message = formatActionMessage(action, state, prevStateRef.current)
      return {
        id: `${Date.now()}-${idx}-${Math.random()}`,
        playerIndex: playerIdx,
        message,
        timestamp: Date.now() + idx,
      }
    })

    setLogEntries(prev => [...prev, ...entries])
    turnActionsRef.current = []
  }

  useEffect(() => {
    if (state.phase !== 'auction') setStateBeforeAuction(null)
  }, [state.phase])
  const maxProduction = getMaxProduction(me)

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

  /** Apply any pending action (except production, buyBuilding, startAuction; those use double-click). Return the new state. */
  function applyPendingAction(s: GameState): GameState {
    if (!pendingAction) return s
    switch (pendingAction.type) {
      case 'buyTown':
        return actionBuyTown(s, pendingAction.useSpecific)
      default:
        return s
    }
  }

  function confirmStartAuction(railroadIndex: number) {
    const action: GameAction = { type: 'startAuction', railroadIndex }
    if (dispatch) {
      addTurnAction(action, state.currentPlayerIndex)
      dispatch(action)
    } else {
      setStateBeforeAuction(cloneGameState(state))
      addTurnAction(action, state.currentPlayerIndex)
      const nextState = startAuction(state, railroadIndex)
      prevStateRef.current = state
      setState(nextState)
    }
    setPendingAction(null)
  }

  function closeAuction() {
    if (!dispatch && stateBeforeAuction) {
      setState(stateBeforeAuction)
      setStateBeforeAuction(null)
    }
  }

  function confirmBuyBuilding(buildingIndex: number) {
    const action: GameAction = { type: 'buyBuilding', buildingIndex }
    if (dispatch) {
      addTurnAction(action, state.currentPlayerIndex)
      dispatch(action)
    } else {
      setStateBeforeAction(cloneGameState(state))
      addTurnAction(action, state.currentPlayerIndex)
      const nextState = actionBuyBuilding(state, buildingIndex)
      prevStateRef.current = state
      setState(nextState)
    }
    setPendingAction(null)
  }

  function confirmBuyTown(useSpecific: boolean, commoditiesToSpend?: Partial<Record<Commodity, number>>) {
    const action: GameAction = { type: 'buyTown', useSpecific, commoditiesToSpend }
    if (dispatch) {
      addTurnAction(action, state.currentPlayerIndex)
      dispatch(action)
    } else {
      setStateBeforeAction(cloneGameState(state))
      addTurnAction(action, state.currentPlayerIndex)
      const nextState = actionBuyTown(state, useSpecific, commoditiesToSpend)
      prevStateRef.current = state
      setState(nextState)
    }
    setPendingAction(null)
    setShowTownPayAnyPanel(false)
  }

  function upgradeBBuilding(buildingId: string) {
    const action: GameAction = { type: 'upgradeBBuilding', buildingId }
    if (dispatch) {
      addTurnAction(action, state.currentPlayerIndex)
      dispatch(action)
    } else {
      setStateBeforeAction(cloneGameState(state))
      addTurnAction(action, state.currentPlayerIndex)
      const nextState = actionUpgradeBBuilding(state, buildingId)
      prevStateRef.current = state
      setState(nextState)
    }
  }

  function playProduction(cardIndex: number) {
    const card = me.hand[cardIndex]
    if (!card) return
    const commoditiesToTake =
      productionSelection.length === maxProduction
        ? productionSelection.map(i => getProductionList(card)[i])
        : undefined
    const tf = tradingFloorPurchase && tradingFloorPurchase.quantity > 0 ? tradingFloorPurchase : undefined
    const action: GameAction = { type: 'production', cardIndex, commoditiesToTake, tradingFloorPurchase: tf }
    if (dispatch) {
      addTurnAction(action, state.currentPlayerIndex)
      dispatch(action)
    } else {
      setStateBeforeAction(cloneGameState(state))
      addTurnAction(action, state.currentPlayerIndex)
      const nextState =
        productionSelection.length === maxProduction
          ? actionProduction(state, cardIndex, productionSelection.map(i => getProductionList(card)[i]), tf)
          : actionProduction(state, cardIndex, undefined, tf)
      prevStateRef.current = state
      setState(nextState)
    }
    setPendingAction(null)
    setProductionSelection([])
    setTradingFloorPurchase(null)
  }

  function endTurn() {
    if (dispatch) {
      if (pendingAction?.type === 'buyTown') {
        const buyAction: GameAction = { type: 'buyTown', useSpecific: pendingAction.useSpecific }
        addTurnAction(buyAction, state.currentPlayerIndex)
        dispatch({ type: 'endTurn' }, buyAction)
      } else {
        addTurnAction({ type: 'endTurn' }, state.currentPlayerIndex)
        dispatch({ type: 'endTurn' })
      }
      logTurnActions()
      setPendingAction(null)
      setProductionSelection([])
      return
    }
    if (pendingAction && pendingAction.type !== 'production' && pendingAction.type !== 'buyBuilding' && pendingAction.type !== 'startAuction') {
      const buyAction: GameAction = { type: 'buyTown', useSpecific: pendingAction.useSpecific }
      setStateBeforeAction(cloneGameState(state))
      addTurnAction(buyAction, state.currentPlayerIndex)
      const nextState = applyPendingAction(state)
      prevStateRef.current = state
      setState(nextState)
      logTurnActions()
      setPendingAction(null)
      setProductionSelection([])
      return
    }
    addTurnAction({ type: 'endTurn' }, state.currentPlayerIndex)
    logTurnActions()
    const nextState = actionEndTurn(state)
    prevStateRef.current = state
    setState(nextState)
    setStateBeforeAction(null)
    setPendingAction(null)
    setProductionSelection([])
  }

  function undo() {
    if (!stateBeforeAction) return
    if (turnActionsRef.current.length > 0) {
      turnActionsRef.current = turnActionsRef.current.slice(0, -1)
    } else {
      setLogEntries(prev => prev.slice(0, -1))
    }
    setState(stateBeforeAction)
    setStateBeforeAction(null)
  }

  const canPlaySelectedCard =
    pendingAction?.type === 'production'
      ? (() => {
          const card = me.hand[pendingAction?.cardIndex ?? -1]
          if (!card) return false
          const listLen = getProductionList(card).length
          return listLen > maxProduction
            ? productionSelection.length === maxProduction
            : true
        })()
      : false

  const actionTakenThisTurn = state.actionTakenThisTurn === true

  return (
    <div className="game-board">
      {!dispatch && (
        <DevPanel
          state={state}
          setState={setState}
          playerIndex={state.currentPlayerIndex}
        />
      )}
      <div className="game-body">
        <div className="game-main">
          <section className="market-section">
            <MarketStrip market={state.market} />
          </section>

          <div className="below-market-row">
            <div className="game-main-left">
              <section className="offer-row">
                <div className="railroad-offer-with-deck content-box-over-bg content-box-railroad">
                  <div className="offer-deck-and-cards">
                    <div className="deck-pile" title="Railroad deck">
                      <div className="deck-card-back" aria-hidden />
                      <span className="deck-count" aria-label={`${state.railroadDeck.length} railroads remaining`}>
                        {state.railroadDeck.length}
                      </span>
                    </div>
                    <RailroadOffer
                      railroads={state.railroadOffer}
                      onSelect={(idx) => togglePending({ type: 'startAuction', railroadIndex: idx })}
                      onConfirmStartAuction={confirmStartAuction}
                      disabled={!isMyTurn || isAuction || actionTakenThisTurn}
                      currentPlayerMoney={current.money}
                      selectedRailroadIndex={pendingAction?.type === 'startAuction' ? pendingAction.railroadIndex : null}
                      hideTitle
                    />
                  </div>
                </div>
                <div className="town-offer-with-deck content-box-over-bg content-box-town">
                  <div className="offer-deck-and-cards">
                    <div className="deck-pile" title="Town deck">
                      <div className="deck-card-back" aria-hidden />
                      <span className="deck-count" aria-label={`${state.townDeck.length} towns remaining`}>
                        {state.townDeck.length}
                      </span>
                    </div>
                    <div className="town-slot">
                      {state.currentTown ? (
                        <TownCard
                          town={state.currentTown}
                          onBuySpecific={() => confirmBuyTown(true)}
                          onBuyAny={() => setShowTownPayAnyPanel(true)}
                          player={current}
                          selectedBuySpecific={pendingAction?.type === 'buyTown' ? pendingAction.useSpecific : null}
                          actionsDisabled={!isMyTurn || actionTakenThisTurn}
                        />
                      ) : (
                        <div className="empty-slot">No town available</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
              <section className="buildings-section content-box-over-bg">
                <BuildingOffer
                  buildings={state.buildingOffer}
                  onSelect={(idx) => togglePending({ type: 'buyBuilding', buildingIndex: idx })}
                  onConfirmBuy={confirmBuyBuilding}
                  currentPlayerMoney={current.money}
                  selectedBuildingIndex={pendingAction?.type === 'buyBuilding' ? pendingAction.buildingIndex : null}
                  selectionDisabled={!isMyTurn || (actionTakenThisTurn && !(me.buildings.some(b => b.extraBuildingPurchase) && (state.buildingPurchasesThisTurn ?? 0) === 1))}
                  onOpenBuildingInfo={setInfoBuilding}
                />
              </section>
            </div>
            <section className="player-area">
              {pendingAction?.type === 'production' && me.buildings.some(b => b.tradingFloor) && (() => {
                const myIdx = isOnline ? playerIndex! : state.currentPlayerIndex
                const otherPlayers = state.players
                  .map((p, i) => ({ index: i, name: p.name }))
                  .filter((_, i) => i !== myIdx)
                if (otherPlayers.length === 0) return null
                const fromIdx = tradingFloorPurchase != null && otherPlayers.some(op => op.index === tradingFloorPurchase.fromPlayerIndex)
                  ? tradingFloorPurchase.fromPlayerIndex
                  : otherPlayers[0].index
                const fromPlayer = state.players[fromIdx]
                const fromCommodities = COMMODITIES.filter(c => (fromPlayer.commodities[c] ?? 0) > 0)
                const selectedCommodity = tradingFloorPurchase?.commodity && fromCommodities.includes(tradingFloorPurchase.commodity)
                  ? tradingFloorPurchase.commodity
                  : fromCommodities[0]
                const maxQty = selectedCommodity ? (fromPlayer.commodities[selectedCommodity] ?? 0) : 0
                const price = selectedCommodity ? state.market[selectedCommodity] : 0
                const qty = tradingFloorPurchase?.fromPlayerIndex === fromIdx ? Math.min(tradingFloorPurchase.quantity, maxQty) : 0
                return (
                  <div className="trading-floor-panel card">
                    <h4>Trading Floor (optional)</h4>
                    <p className="trading-floor-desc">Buy commodities from one other player at market price before the card&apos;s price increase.</p>
                    <div className="trading-floor-row">
                      <label>
                        From:{' '}
                        <select
                          value={tradingFloorPurchase?.fromPlayerIndex ?? otherPlayers[0].index}
                          onChange={(e) => {
                            const i = Number(e.target.value)
                            const p = state.players[i]
                            const firstC = COMMODITIES.find(c => (p.commodities[c] ?? 0) > 0)
                            setTradingFloorPurchase({ fromPlayerIndex: i, commodity: firstC ?? 'wheat', quantity: 0 })
                          }}
                        >
                          {otherPlayers.map(({ index, name }) => (
                            <option key={index} value={index}>{name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Commodity:{' '}
                        <select
                          value={selectedCommodity ?? ''}
                          onChange={(e) => {
                            const c = e.target.value as Commodity
                            const maxForC = state.players[fromIdx].commodities[c] ?? 0
                            setTradingFloorPurchase({ fromPlayerIndex: fromIdx, commodity: c, quantity: Math.min(qty, maxForC) })
                          }}
                          disabled={fromCommodities.length === 0}
                        >
                          {fromCommodities.map(c => (
                            <option key={c} value={c}>{COMMODITY_NAMES[c]} ({(fromPlayer.commodities[c] ?? 0)})</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Qty:{' '}
                        <input
                          type="number"
                          min={0}
                          max={maxQty}
                          value={qty}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(maxQty, parseInt(e.target.value, 10) || 0))
                            setTradingFloorPurchase({ fromPlayerIndex: fromIdx, commodity: selectedCommodity ?? 'wheat', quantity: v })
                          }}
                        />
                        {selectedCommodity && maxQty > 0 && (
                          <span className="trading-floor-cost">
                            {qty > 0 ? ` = $${price * qty}` : ''}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                )
              })()}
              <PlayerHand
                hand={me.hand}
                onProduce={(cardIndex) => togglePending({ type: 'production', cardIndex })}
                onPlayCard={playProduction}
                onToggleProductionIndex={toggleProductionIndex}
                disabled={!isMyTurn || isAuction || actionTakenThisTurn}
                canPlaySelected={canPlaySelectedCard}
                commodities={me.commodities}
                buildings={me.buildings}
                selectedCardIndex={pendingAction?.type === 'production' ? pendingAction.cardIndex : null}
                productionSelection={productionSelection}
                maxProduction={maxProduction}
              />
            </section>
          </div>
        </div>

      <aside className="game-sidebar card">
        <div className="sidebar-current-player">
          <span className="sidebar-current-label">{isOnline ? (isMyTurn ? 'Your turn' : "Opponent's turn") : 'Current turn'}</span>
          <span className="sidebar-current-name" style={{ color: getPlayerColor(state.currentPlayerIndex) }}>{current.name}{isOnline && isMyTurn ? ' (you)' : ''}</span>
        </div>
        <h3>Your resources</h3>
        <div className="sidebar-money">${me.money}</div>
        <div className="commodities-list">
          {COMMODITIES.map(c => {
            const n = me.commodities[c] ?? 0
            return (
              <span key={c} className="commodity-chip" title={COMMODITY_NAMES[c]}>
                <span className="commodity-emoji">{COMMODITY_EMOJI[c]}</span>
                <span className="commodity-count">{n}</span>
              </span>
            )
          })}
        </div>
        {me.railroads.length > 0 && (
          <>
            <h3 className="sidebar-section-title">Your railroads</h3>
            <ul className="sidebar-list">
              {me.railroads.map(r => (
                <li key={r.id} className="sidebar-item">
                  <span className="sidebar-item-name">{r.name}</span>
                  <span className="sidebar-item-meta">{formatRailroadVpSchedule(r.vpSchedule)} VP</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {me.towns.length > 0 && (
          <>
            <h3 className="sidebar-section-title">Your towns</h3>
            <ul className="sidebar-list">
              {me.towns.map(t => (
                <li key={t.id} className="sidebar-item">
                  <span className="sidebar-item-name">{t.name}</span>
                  <span className="sidebar-item-meta">{t.vp} VP</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {me.buildings.length > 0 && (
          <>
            <h3 className="sidebar-section-title">Your buildings</h3>
            <ul className="sidebar-buildings">
              {me.buildings.map(b => (
                <li key={b.id} className="sidebar-building" title={b.name}>
                  <div className="sidebar-building-text">
                    <span className="sidebar-building-name">{b.name}</span>
                  </div>
                  <div className="sidebar-building-actions">
                    {b.bpUpgradeToId != null && b.upgradeCost != null && isMyTurn && !actionTakenThisTurn && current.money >= b.upgradeCost && (
                      <div className="sidebar-building-actions-row">
                        <button
                          type="button"
                          className="sidebar-building-upgrade"
                          onClick={() => upgradeBBuilding(b.id)}
                        >
                          Upgrade ${b.upgradeCost}
                        </button>
                      </div>
                    )}
                    <div className="sidebar-building-actions-row">
                      {me.buildings.filter(x => x.bpTag).length > 1 && b.bpTag && (
                        (me.activeBpBuildingId === b.id) ? (
                          <span className="sidebar-building-active">Active</span>
                        ) : (
                          <button
                            type="button"
                            className="sidebar-building-use-bp"
                            onClick={() => {
                              if (dispatch) {
                                dispatch({ type: 'setActiveBpBuilding', buildingId: b.id })
                              } else {
                                setState(actionSetActiveBpBuilding(state, b.id))
                              }
                            }}
                            disabled={!isMyTurn}
                            title="Use this B/P building this turn"
                          >
                            Use
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        className="sidebar-building-info"
                        aria-label="Full effect"
                        onClick={() => setInfoBuilding(b)}
                      >
                        i
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => setShowSellPanel(true)}
          disabled={!isMyTurn || actionTakenThisTurn}
        >
          Sell commodities
        </button>
        <div className="sidebar-end-actions">
          {((!dispatch && stateBeforeAction != null) || (dispatch && isMyTurn && !isAuction && state.phase !== 'discardDown')) && (
            <button
              type="button"
              className="secondary undo-button"
              onClick={dispatch ? () => dispatch({ type: 'undo' }) : undo}
            >
              Undo
            </button>
          )}
          {!isAuction && state.phase !== 'discardDown' && (
            <button
              type="button"
              className="primary sidebar-commit"
              onClick={endTurn}
              disabled={!isMyTurn || !actionTakenThisTurn}
            >
              End turn
            </button>
          )}
        </div>
      </aside>
      <GameLog state={state} entries={serverLogEntries ?? logEntries} />
      <PlayerPanel state={state} />
      </div>

      {infoBuilding && (
        <BuildingInfoModal building={infoBuilding} onClose={() => setInfoBuilding(null)} />
      )}
      {showSellPanel && (
        <SellPanel
          commodities={me.commodities}
          market={state.market}
          hasFreightCompany={me.buildings.some(b => b.extraSellAction)}
          sellActionsThisTurn={state.sellActionsThisTurn ?? 0}
          hasExportCompany={me.buildings.some(b => b.sellPriceBonus != null)}
          exportBonusAmount={me.buildings.find(b => b.sellPriceBonus != null)?.sellPriceBonus ?? 3}
          commodityPriceMax={COMMODITY_PRICE_MAX}
          onSell={(commodity, qty, useExportCompany) => {
            const action: GameAction = { type: 'sell', commodity, quantity: qty, useExportCompany }
            if (dispatch) {
              addTurnAction(action, state.currentPlayerIndex)
              dispatch(action)
              const canSellAgain = me.buildings.some(b => b.extraSellAction) && (state.sellActionsThisTurn ?? 0) < 1
              if (!canSellAgain) setShowSellPanel(false)
            } else {
              addTurnAction(action, state.currentPlayerIndex)
              const nextState = actionSell(state, commodity, qty, useExportCompany)
              prevStateRef.current = state
              setState(nextState)
              const canSellAgain = nextState.players[nextState.currentPlayerIndex].buildings.some((b: { extraSellAction?: boolean }) => b.extraSellAction) && (nextState.sellActionsThisTurn ?? 0) < 2
              if (!canSellAgain) setShowSellPanel(false)
            }
          }}
          onClose={() => setShowSellPanel(false)}
        />
      )}

      {showTownPayAnyPanel && state.currentTown && (
        <TownPayAnyPanel
          town={state.currentTown}
          totalToSpend={Math.max(0, state.currentTown.costAny - getTownCostReduce(me))}
          commodities={me.commodities}
          onConfirm={(selection) => confirmBuyTown(false, selection)}
          onCancel={() => setShowTownPayAnyPanel(false)}
        />
      )}

      {isAuction && state.auctionRailroad && (
        <AuctionPanel
          state={state}
          onBid={(amount) => {
            const action: GameAction = { type: 'placeBid', amount }
            if (dispatch) {
              addTurnAction(action, state.currentPlayerIndex)
              dispatch(action)
            } else {
              addTurnAction(action, state.currentPlayerIndex)
              const nextState = placeBid(state, amount)
              const result = nextState.lastAuctionResult
              if (result) {
                const winnerName = nextState.players[result.winnerIndex]?.name ?? 'Player'
                const entry: LogEntry = {
                  id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  playerIndex: result.winnerIndex,
                  message: `${winnerName} won ${result.railroadName} for $${result.amount}`,
                  timestamp: Date.now(),
                }
                flushSync(() => setLogEntries(prev => [...prev, entry]))
                const { lastAuctionResult: _, ...rest } = nextState
                setState(rest as GameState)
              } else {
                setState(nextState)
              }
              prevStateRef.current = state
            }
          }}
          onPass={() => {
            const action: GameAction = { type: 'passAuction' }
            if (dispatch) {
              addTurnAction(action, state.currentPlayerIndex)
              dispatch(action)
            } else {
              addTurnAction(action, state.currentPlayerIndex)
              const nextState = passAuction(state)
              const result = nextState.lastAuctionResult
              if (result) {
                const winnerName = nextState.players[result.winnerIndex]?.name ?? 'Player'
                const entry: LogEntry = {
                  id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  playerIndex: result.winnerIndex,
                  message: `${winnerName} won ${result.railroadName} for $${result.amount}`,
                  timestamp: Date.now(),
                }
                flushSync(() => setLogEntries(prev => [...prev, entry]))
                const { lastAuctionResult: _, ...rest } = nextState
                setState(rest as GameState)
              } else {
                setState(nextState)
              }
              prevStateRef.current = state
            }
          }}
          onClose={dispatch ? undefined : closeAuction}
          canAct={isMyTurn}
        />
      )}

      {state.phase === 'discardDown' && isMyTurn && (
        <DiscardDownPanel
          state={state}
          onDiscard={(commodity) => {
            const action: GameAction = { type: 'discard', commodity }
            if (dispatch) {
              addTurnAction(action, state.currentPlayerIndex)
              dispatch(action)
            } else {
              addTurnAction(action, state.currentPlayerIndex)
              const nextState = actionDiscard(state, commodity)
              prevStateRef.current = state
              setState(nextState)
            }
          }}
        />
      )}

      <PlayerPanel state={state} />

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
          overflow-x: visible;
        }
        .game-body {
          display: flex;
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
        .sidebar-current-player {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
        }
        .sidebar-current-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sidebar-current-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .game-sidebar h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 0;
        }
        .sidebar-money {
          font-size: 1.5rem;
          font-weight: 700;
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
        .game-sidebar .sidebar-section-title {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0.25rem 0 0 0;
        }
        .game-sidebar .sidebar-list,
        .game-sidebar .sidebar-buildings {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .game-sidebar .sidebar-item,
        .game-sidebar .sidebar-building {
          background: var(--surface2);
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .game-sidebar .sidebar-building {
          display: flex;
          align-items: flex-start;
          gap: 0.35rem;
        }
        .game-sidebar .sidebar-building-text {
          flex: 1;
          min-width: 0;
        }
        .game-sidebar .sidebar-building-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        .game-sidebar .sidebar-building-actions-row {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .game-sidebar .sidebar-building-upgrade {
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          border: 1px solid var(--accent);
          background: transparent;
          color: var(--accent);
          cursor: pointer;
          white-space: nowrap;
        }
        .game-sidebar .sidebar-building-upgrade:hover {
          background: var(--accent);
          color: white;
        }
        .sidebar-building-active {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--accent);
        }
        .sidebar-building-use-bp {
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          border: 1px solid var(--border);
          background: var(--surface3);
          color: var(--text);
          cursor: pointer;
        }
        .sidebar-building-use-bp:hover:not(:disabled) {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .sidebar-building-use-bp:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .game-sidebar .sidebar-item-name,
        .game-sidebar .sidebar-building-name {
          font-weight: 600;
          display: block;
        }
        .game-sidebar .sidebar-item-meta {
          font-size: 0.75rem;
          color: var(--accent);
        }
        .game-sidebar .sidebar-building-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .game-sidebar .sidebar-building-info {
          flex-shrink: 0;
          width: 1.25rem;
          height: 1.25rem;
          padding: 0;
          border: none;
          border-radius: 3px;
          background: var(--surface3);
          color: var(--text);
          font-size: 0.75rem;
          font-style: italic;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .game-sidebar .sidebar-building-info:hover {
          background: var(--accent);
          color: white;
        }
        .sidebar-end-actions {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }
        .sidebar-commit {
          width: 100%;
          padding: 0.65rem;
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
          flex-direction: column;
          gap: 0.5rem;
        }
        .offer-section-title {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0 0 0 0;
        }
        .offer-deck-and-cards {
          display: flex;
          flex-direction: row;
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
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
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
          min-width: 100px;
        }
        .buildings-section h3 {
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
        .below-market-row {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          min-width: 0;
        }
        .game-main-left {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex-shrink: 0;
        }
        .buildings-section {
          flex-shrink: 0;
          max-width: 640px;
        }
        .player-area {
          flex: 1;
          min-width: 0;
        }
        .trading-floor-panel {
          margin-bottom: 0.75rem;
          padding: 0.75rem 1rem;
        }
        .trading-floor-panel h4 {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
        }
        .trading-floor-desc {
          margin: 0 0 0.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .trading-floor-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }
        .trading-floor-row label {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.85rem;
        }
        .trading-floor-row select,
        .trading-floor-row input[type="number"] {
          padding: 0.25rem 0.4rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          font-size: 0.85rem;
        }
        .trading-floor-row input[type="number"] {
          width: 3.5rem;
        }
        .trading-floor-cost {
          font-size: 0.85rem;
          color: var(--accent);
          font-weight: 600;
        }
        .undo-button {
          width: 100%;
        }
      `}</style>
    </div>
  )
}
