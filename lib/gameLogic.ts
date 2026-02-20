import type { GameState, Player, Commodity, Market, ProductionCard, BuildingTile } from './types.js';
import { createProductionDeck, createBuildingDeckForGame, createRailroadDeck, createTownDeck, COMMODITY_NAMES, getBuildingTileById } from './data/cards.js';

function getEffectiveBuildings(player: Player): BuildingTile[] {
  const nonBp = player.buildings.filter(b => !b.bpTag);
  const bp = player.buildings.filter(b => b.bpTag);
  if (bp.length === 0) return nonBp;
  const active = player.activeBpBuildingId && bp.some(b => b.id === player.activeBpBuildingId)
    ? bp.find(b => b.id === player.activeBpBuildingId)!
    : bp[0];
  return [...nonBp, active];
}

/** Deep clone game state so it can be stored for undo without being mutated by subsequent actions. */
export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

const COMMODITIES: Commodity[] = ['wheat', 'wood', 'iron', 'coal', 'goods', 'luxury'];

export const COMMODITY_PRICE_MIN: Record<Commodity, number> = {
  wheat: 1, wood: 1, iron: 2, coal: 2, goods: 3, luxury: 3,
};
export const COMMODITY_PRICE_MAX: Record<Commodity, number> = {
  wheat: 12, wood: 12, iron: 13, coal: 13, goods: 14, luxury: 14,
};

const INITIAL_MARKET: Market = {
  wheat: 1, wood: 1, iron: 2, coal: 2, goods: 3, luxury: 3,
};

function newPlayer(id: string, name: string, hand: ProductionCard[]): Player {
  return {
    id,
    name,
    money: 10,
    commodities: {},
    hand,
    railroads: [],
    towns: [],
    buildings: [],
  };
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function initGame(numPlayers: number, names: string[]): GameState {
  const prodDeck = createProductionDeck();
  const hands: ProductionCard[][] = [];
  for (let i = 0; i < numPlayers; i++) {
    hands.push(prodDeck.splice(0, 3));
  }

  const players: Player[] = names.slice(0, numPlayers).map((name, i) =>
    newPlayer(`player-${i}`, name, hands[i])
  );

  // Starting commodities: 1st gets 1, 2nd gets 2, etc. All different.
  const freePerPlayer = [1, 2, 3, 4, 5].slice(0, numPlayers);
  const used: Set<Commodity> = new Set();
  freePerPlayer.forEach((count, pi) => {
    let left = count;
    for (const c of COMMODITIES) {
      if (left <= 0) break;
      if (used.has(c)) continue;
      used.add(c);
      players[pi].commodities[c] = (players[pi].commodities[c] ?? 0) + 1;
      left--;
    }
  });

  const railroadDeck = createRailroadDeck(numPlayers);
  const railroadOffer = railroadDeck.splice(0, 2);

  const townDeck = createTownDeck(numPlayers);
  const currentTown = townDeck.shift() ?? null;

  const { initialOffer: buildingOffer, buildingStack } = createBuildingDeckForGame();

  return {
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    roundStartIndex: 0,
    market: { ...INITIAL_MARKET },
    productionDeck: prodDeck,
    productionDiscard: [],
    railroadDeck,
    railroadOffer,
    townDeck,
    currentTown,
    buildingStack,
    buildingOffer,
  auctionRailroad: null,
  auctionStarterIndex: 0,
  auctionBids: [],
  auctionPassed: [],
  numPlayers,
  actionTakenThisTurn: false,
  pendingDrawCount: 0,
};
}

/** Draw one production card for the current player. If the deck is empty, replenish it by shuffling the discard pile, then draw. */
function drawOneCard(state: GameState): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x, hand: [...x.hand] })) };
  const p = s.players[s.currentPlayerIndex];
  let deck = [...s.productionDeck];
  let discard = [...s.productionDiscard];
  let card: ProductionCard | null = null;
  if (deck.length > 0) {
    card = deck.pop()!;
  } else if (discard.length > 0) {
    // Replenish deck from discard, then draw
    deck = shuffle(discard);
    discard = [];
    card = deck.pop()!;
  }
  if (!card) return state;
  s.productionDeck = deck;
  s.productionDiscard = discard;
  p.hand = [...p.hand, card];
  return s;
}

export function getMaxProduction(player: Player): number {
  const buildings = getEffectiveBuildings(player);
  const tile = buildings.find(b => b.productionLimit != null);
  if (tile?.productionLimit === 5) return 5;
  if (tile?.productionLimit === 4) return 4;
  return 3;
}

export function getMaxHandSize(player: Player): number {
  const buildings = getEffectiveBuildings(player);
  if (buildings.some(b => b.handSize === 5)) return 5;
  if (buildings.some(b => b.handSize === 4)) return 4;
  return 3;
}

export function getMaxStorage(player: Player): number {
  let base = 10;
  base += player.buildings.length;
  const buildings = getEffectiveBuildings(player);
  const warehouse = buildings.find(b => b.storageBonus != null);
  if (warehouse) base += warehouse.storageBonus!;
  return base;
}

function totalCommodities(commodities: Partial<Record<Commodity, number>>): number {
  return COMMODITIES.reduce((s, c) => s + (commodities[c] ?? 0), 0);
}

export function canProduce(state: GameState, cardIndex: number): boolean {
  const p = state.players[state.currentPlayerIndex];
  const card = p.hand[cardIndex];
  return !!(card && state.phase === 'playing');
}

/** Flatten card production to an array (one entry per unit). */
export function getProductionList(card: { production: Partial<Record<Commodity, number>> }): Commodity[] {
  return COMMODITIES.flatMap(c => Array(card.production[c] ?? 0).fill(c));
}

export function actionProduction(
  state: GameState,
  cardIndex: number,
  commoditiesToTake?: Commodity[],
  tradingFloorPurchase?: { fromPlayerIndex: number; commodity: Commodity; quantity: number }
): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const card = p.hand[cardIndex];
  if (!card) return state;

  if (tradingFloorPurchase && tradingFloorPurchase.quantity > 0) {
    const hasTradingFloor = getEffectiveBuildings(p).some(b => b.tradingFloor === true);
    if (!hasTradingFloor) return state;
    const fromIdx = tradingFloorPurchase.fromPlayerIndex;
    if (fromIdx === s.currentPlayerIndex || fromIdx < 0 || fromIdx >= s.players.length) return state;
    const fromPlayer = s.players[fromIdx];
    const c = tradingFloorPurchase.commodity;
    const qty = tradingFloorPurchase.quantity;
    const have = fromPlayer.commodities[c] ?? 0;
    if (qty > have) return state;
    const price = s.market[c];
    const cost = price * qty;
    if (p.money < cost) return state;
    fromPlayer.commodities[c] = have - qty;
    if (fromPlayer.commodities[c] === 0) delete fromPlayer.commodities[c];
    p.commodities[c] = (p.commodities[c] ?? 0) + qty;
    p.money -= cost;
    fromPlayer.money += cost;
  }

  const maxProd = getMaxProduction(p);
  const available: Commodity[] = getProductionList(card);
  let take: Commodity[];
  if (commoditiesToTake && commoditiesToTake.length === maxProd) {
    for (const c of COMMODITIES) {
      const onCard = card.production[c] ?? 0;
      const requested = commoditiesToTake.filter(x => x === c).length;
      if (requested > onCard) return state;
    }
    take = commoditiesToTake;
  } else {
    take = available.slice(0, maxProd);
  }

  const buildings = getEffectiveBuildings(p);
  const bonusTile = buildings.find(b => b.commodityBonus != null);
  if (bonusTile?.commodityBonus) {
    const extra = bonusTile.bonusValue ?? 1;
    for (let i = 0; i < extra; i++) {
      const c = bonusTile.commodityBonus!;
      p.commodities[c] = (p.commodities[c] ?? 0) + 1;
    }
  }
  const anyBonusTile = buildings.find(b => b.anyCommodityBonus != null);
  if (anyBonusTile?.anyCommodityBonus) {
    const c = COMMODITIES[0];
    for (let i = 0; i < anyBonusTile.anyCommodityBonus; i++) {
      p.commodities[c] = (p.commodities[c] ?? 0) + 1;
    }
  }

  for (const c of take) {
    p.commodities[c] = (p.commodities[c] ?? 0) + 1;
  }
  for (const c of card.priceIncrease) {
    s.market[c] = Math.min(COMMODITY_PRICE_MAX[c], s.market[c] + 1);
  }

  p.hand = p.hand.filter((_, i) => i !== cardIndex);
  s.productionDiscard = [...s.productionDiscard, card];
  s.actionTakenThisTurn = true;
  s.pendingDrawCount = (state.pendingDrawCount ?? 0) + 1;
  return s;
}

export function actionDiscard(state: GameState, commodity: Commodity): GameState {
  if (state.phase !== 'discardDown') return state;
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const have = p.commodities[commodity] ?? 0;
  if (have <= 0) return state;
  p.commodities[commodity] = have - 1;
  const maxStorage = getMaxStorage(p);
  const total = totalCommodities(p.commodities);
  if (total <= maxStorage) {
    s.phase = 'playing';
  }
  return s;
}

export function getTotalCommodities(commodities: Partial<Record<Commodity, number>>): number {
  return totalCommodities(commodities);
}

export function actionSell(state: GameState, commodity: Commodity, quantity: number, useExportCompany?: boolean): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const have = p.commodities[commodity] ?? 0;
  const sell = Math.min(quantity, have);
  if (sell <= 0 || state.phase !== 'playing') return state;

  p.commodities[commodity] = have - sell;
  let price = s.market[commodity];
  if (useExportCompany) {
    const exportBuilding = p.buildings.find(b => b.sellPriceBonus != null);
    if (exportBuilding?.sellPriceBonus != null) {
      price = Math.min(COMMODITY_PRICE_MAX[commodity], price + exportBuilding.sellPriceBonus);
    }
  }
  p.money += price * sell;
  s.market[commodity] = Math.max(COMMODITY_PRICE_MIN[commodity], s.market[commodity] - sell);

  for (let i = 0; i < s.players.length; i++) {
    if (i === s.currentPlayerIndex) continue;
    const other = s.players[i];
    for (const b of other.buildings) {
      if (b.tradingFirmCommodities?.includes(commodity)) {
        other.money += sell;
        break;
      }
    }
  }

  const sellCount = (s.sellActionsThisTurn ?? 0) + 1;
  s.sellActionsThisTurn = sellCount;
  const hasFreight = p.buildings.some(b => b.extraSellAction === true);
  s.actionTakenThisTurn = !(hasFreight && sellCount < 2);
  return s;
}

export function startAuction(state: GameState, railroadIndex: number): GameState {
  if (state.phase !== 'playing' || state.auctionRailroad) return state;
  const card = state.railroadOffer[railroadIndex];
  if (!card) return state;
  const starter = state.currentPlayerIndex;
  if (state.players[starter].money < card.minBid) return state;

  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  for (const p of s.players) {
    const auctionBuilding = p.buildings.find(b => b.auctionCommission != null);
    if (auctionBuilding?.auctionCommission != null) {
      p.money += auctionBuilding.auctionCommission;
    }
  }
  s.phase = 'auction';
  s.auctionRailroad = card;
  s.auctionStarterIndex = starter;
  s.auctionBids = s.players.map((_, i) => (i === starter ? card.minBid : 0));
  s.auctionPassed = s.players.map(() => false);
  s.actionTakenThisTurn = true;
  return s;
}

export function placeBid(state: GameState, amount: number): GameState {
  if (state.phase !== 'auction' || !state.auctionRailroad) return state;
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const i = s.currentPlayerIndex;
  const p = s.players[i];
  if (p.money < amount || amount < state.auctionRailroad.minBid) return state;
  const othersBids = s.auctionBids.filter((_, idx) => idx !== i);
  const maxOther = othersBids.length ? Math.max(...othersBids) : 0;
  if (amount <= maxOther) return state;

  s.auctionBids[i] = amount;
  return nextAuctionTurn(s);
}

export function passAuction(state: GameState): GameState {
  if (state.phase !== 'auction') return state;
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  s.auctionPassed[s.currentPlayerIndex] = true;
  return nextAuctionTurn(s);
}

function nextAuctionTurn(s: GameState): GameState {
  const stillIn = s.auctionPassed.filter(x => !x).length;
  if (stillIn <= 1) {
    let winner = -1;
    let maxBid = s.auctionRailroad!.minBid - 1;
    for (let i = 0; i < s.numPlayers; i++) {
      if (!s.auctionPassed[i] && s.auctionBids[i] > maxBid) {
        maxBid = s.auctionBids[i];
        winner = i;
      }
    }
    if (winner >= 0) {
      s.players[winner].money -= s.auctionBids[winner];
      s.players[winner].railroads = [...s.players[winner].railroads, s.auctionRailroad!];
      s.lastAuctionResult = { railroadName: s.auctionRailroad!.name, winnerIndex: winner, amount: s.auctionBids[winner] };
      const offerIndex = s.railroadOffer.findIndex(r => r.id === s.auctionRailroad!.id);
      s.railroadOffer = s.railroadOffer.filter((_, i) => i !== offerIndex);
      if (s.railroadDeck.length > 0) {
        s.railroadOffer.push(s.railroadDeck.shift()!);
      }
    }
    s.phase = 'playing';
    s.auctionRailroad = null;
    s.auctionBids = [];
    s.auctionPassed = [];
    const auctionStarter = s.auctionStarterIndex;
    if (winner >= 0) {
      s.currentPlayerIndex = auctionStarter; // always revert to bid starter, win or lose
      s.actionTakenThisTurn = winner === auctionStarter; // starter won => must press End turn; else gets another action
    }
    return s;
  }
  let next = (s.currentPlayerIndex + 1) % s.numPlayers;
  while (s.auctionPassed[next]) next = (next + 1) % s.numPlayers;
  s.currentPlayerIndex = next;
  return s;
}

export function actionBuyBuilding(state: GameState, buildingIndex: number): GameState {
  if (state.phase !== 'playing') return state;
  const tile = state.buildingOffer[buildingIndex];
  if (!tile) return state;
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  if (p.money < tile.cost) return state;

  p.money -= tile.cost;
  p.buildings = [...p.buildings, tile];
  if (tile.bpTag && !p.activeBpBuildingId) p.activeBpBuildingId = tile.id;
  s.buildingOffer = s.buildingOffer.filter((_, i) => i !== buildingIndex);
  s.buildingPurchasesThisTurn = (s.buildingPurchasesThisTurn ?? 0) + 1;
  s.actionTakenThisTurn = true;

  // If the building increases hand size, draw cards up to the new limit
  if (tile.handSize != null) {
    const newLimit = getMaxHandSize(p);
    let toDraw = Math.max(0, newLimit - p.hand.length);
    let next = s;
    while (toDraw > 0) {
      next = drawOneCard(next);
      toDraw--;
    }
    return next;
  }
  return s;
}

export function actionUpgradeBBuilding(state: GameState, buildingId: string): GameState {
  if (state.phase !== 'playing') return state;
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const building = p.buildings.find(b => b.id === buildingId);
  if (!building?.bpTag || !building.bpUpgradeToId || building.bpLevel !== 1) return state;
  const upgradeCost = building.upgradeCost ?? 0;
  if (p.money < upgradeCost) return state;
  const level2Tile = getBuildingTileById(building.bpUpgradeToId);
  if (!level2Tile) return state;

  p.money -= upgradeCost;
  p.buildings = p.buildings.map(b => b.id === buildingId ? level2Tile : b);
  if (p.activeBpBuildingId === buildingId) p.activeBpBuildingId = level2Tile.id;
  s.actionTakenThisTurn = true;
  return s;
}

export function actionSetActiveBpBuilding(state: GameState, buildingId: string): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const building = p.buildings.find(b => b.id === buildingId);
  if (!building?.bpTag) return state;
  p.activeBpBuildingId = buildingId;
  return s;
}

function getTownCostReduce(player: Player): number {
  const buildings = getEffectiveBuildings(player);
  const b = buildings.find(x => x.townCostReduce != null);
  return b?.townCostReduce ?? 0;
}

export function actionBuyTown(state: GameState, useSpecific: boolean, commoditiesToSpend?: Partial<Record<Commodity, number>>): GameState {
  if (state.phase !== 'playing' || !state.currentTown) return state;
  const town = state.currentTown;
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const reduce = getTownCostReduce(p);

  if (useSpecific) {
    const costSpecific = { ...town.costSpecific } as Partial<Record<Commodity, number>>;
    for (const c of COMMODITIES) {
      const n = (costSpecific[c] ?? 0) - reduce;
      costSpecific[c] = Math.max(0, n);
    }
    for (const [c, n] of Object.entries(costSpecific)) {
      if (n > 0 && (p.commodities[c as Commodity] ?? 0) < n) return state;
    }
    for (const c of COMMODITIES) {
      const pay = costSpecific[c] ?? 0;
      if (pay > 0) p.commodities[c] = (p.commodities[c] ?? 0) - pay;
    }
  } else {
    const need = Math.max(0, town.costAny - reduce);
    if (commoditiesToSpend != null) {
      const sum = COMMODITIES.reduce((t, c) => t + (commoditiesToSpend[c] ?? 0), 0);
      if (sum !== need) return state;
      for (const c of COMMODITIES) {
        const pay = commoditiesToSpend[c] ?? 0;
        if (pay > 0 && (p.commodities[c] ?? 0) < pay) return state;
      }
      for (const c of COMMODITIES) {
        const pay = commoditiesToSpend[c] ?? 0;
        if (pay > 0) p.commodities[c] = (p.commodities[c] ?? 0) - pay;
      }
    } else {
      let left = need;
      for (const c of COMMODITIES) {
        while (left > 0 && (p.commodities[c] ?? 0) > 0) {
          p.commodities[c] = (p.commodities[c] ?? 0) - 1;
          left--;
        }
      }
      if (left > 0) return state;
    }
  }

  p.towns = [...p.towns, town];
  s.currentTown = s.townDeck.shift() ?? null;
  s.actionTakenThisTurn = true;
  return s;
}

/** Advance to the next player. Call only when the current player explicitly ends their turn. Replenishes hand (pending draws) and checks discard-down before advancing. */
export function actionEndTurn(state: GameState): GameState {
  let s = { ...state, players: state.players.map(x => ({ ...x, hand: [...x.hand] })) };
  const railroadsGone = s.railroadDeck.length === 0 && s.railroadOffer.length === 0;
  const townsGone = s.townDeck.length === 0 && s.currentTown === null;
  if (railroadsGone || townsGone) return endGame(s);

  const toDraw = s.pendingDrawCount ?? 0;
  s.pendingDrawCount = 0;
  for (let i = 0; i < toDraw; i++) {
    s = drawOneCard(s);
  }

  const p = s.players[s.currentPlayerIndex];
  const total = totalCommodities(p.commodities);
  const maxStorage = getMaxStorage(p);
  if (total > maxStorage) {
    s.phase = 'discardDown';
    return s;
  }

  while (s.buildingOffer.length < 4 && s.buildingStack.length > 0) {
    s.buildingOffer.push(s.buildingStack.shift()!);
  }

  s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.numPlayers;
  s.actionTakenThisTurn = false;
  s.buildingPurchasesThisTurn = 0;
  s.sellActionsThisTurn = 0;
  return s;
}

function endGame(s: GameState): GameState {
  s.phase = 'gameover';
  return s;
}

function railroadVp(railroads: { typeId: string; vpSchedule: number[] }[]): number {
  const countByType = new Map<string, number>();
  const scheduleByType = new Map<string, number[]>();
  for (const r of railroads) {
    countByType.set(r.typeId, (countByType.get(r.typeId) ?? 0) + 1);
    if (!scheduleByType.has(r.typeId)) scheduleByType.set(r.typeId, r.vpSchedule);
  }
  let total = 0;
  for (const [typeId, count] of countByType) {
    const schedule = scheduleByType.get(typeId) ?? [1, 2, 3, 4];
    for (let i = 0; i < count && i < schedule.length; i++) total += schedule[i];
  }
  return total;
}

export function getPlayerVp(player: Player): number {
  let vp = player.towns.reduce((s, t) => s + t.vp, 0) + railroadVp(player.railroads);
  const pairs = Math.min(player.towns.length, player.railroads.length);
  vp += pairs * 2;
  vp += player.buildings.length;
  for (const b of player.buildings) {
    if (b.vpPerTown != null) vp += b.vpPerTown * player.towns.length;
    if (b.vpPerRailroad != null) vp += b.vpPerRailroad * player.railroads.length;
    if (b.vpPer20Money != null) vp += b.vpPer20Money * Math.floor(player.money / 20);
    if (b.vpPerBuilding != null) vp += b.vpPerBuilding * player.buildings.length;
  }
  return vp;
}

export function computeScores(state: GameState): { playerIndex: number; vp: number; money: number }[] {
  return state.players.map((p, i) => ({
    playerIndex: i,
    vp: getPlayerVp(p),
    money: p.money,
  }));
}

export function getWinner(state: GameState): number {
  if (state.phase !== 'gameover') return -1;
  const scores = computeScores(state);
  scores.sort((a, b) => b.vp - a.vp || b.money - a.money);
  return scores[0].playerIndex;
}

export { COMMODITIES };

/** Format a single action for the game log (server and client). */
export function formatActionMessage(
  action: { type: string; [k: string]: unknown },
  state: GameState,
  prevState?: GameState
): string {
  const useState = prevState ?? state
  switch (action.type) {
    case 'production': {
      const player = useState.players[useState.currentPlayerIndex]
      const card = player?.hand[action.cardIndex as number]
      if (!card) return 'Played production card'
      const commodities = (action.commoditiesToTake as Commodity[]) ?? []
      const prodList = commodities.length > 0
        ? commodities.map((c) => COMMODITY_NAMES[c]).join(', ')
        : 'commodities'
      const priceList = card.priceIncrease.length > 0
        ? card.priceIncrease.map((c) => COMMODITY_NAMES[c]).join(', ')
        : '—'
      const tf = action.tradingFloorPurchase as { fromPlayerIndex: number; commodity: Commodity; quantity: number } | undefined
      const tfMsg = tf && tf.quantity > 0 && useState.players[tf.fromPlayerIndex]
        ? `; bought ${tf.quantity} ${COMMODITY_NAMES[tf.commodity]} from ${useState.players[tf.fromPlayerIndex].name} (Trading Floor)`
        : ''
      return `Played production card: took ${prodList}, raised ${priceList} by $1${tfMsg}`
    }
    case 'sell':
      return `Sold ${action.quantity} ${COMMODITY_NAMES[action.commodity as Commodity]}`
    case 'discard':
      return `Discarded ${COMMODITY_NAMES[action.commodity as Commodity]}`
    case 'buyBuilding': {
      const building = useState.buildingOffer[action.buildingIndex as number]
      return building ? `Bought ${building.name} for $${building.cost}` : 'Bought building'
    }
    case 'upgradeBBuilding': {
      const prev = prevState ?? state
      const b = prev.players[prev.currentPlayerIndex]?.buildings.find((x: { id: string }) => x.id === action.buildingId)
      if (b?.bpUpgradeToId) {
        const level2 = getBuildingTileById(b.bpUpgradeToId)
        return level2 ? `Upgraded to ${level2.name}` : `Upgraded ${b.name} to +2`
      }
      const level2InState = state.players[state.currentPlayerIndex]?.buildings.find((x: { bpUpgradeFromId?: string }) => x.bpUpgradeFromId === action.buildingId)
      return level2InState ? `Upgraded to ${level2InState.name}` : 'Upgraded B building'
    }
    case 'buyTown': {
      const town = useState.currentTown
      if (!town) return 'Bought town'
      return `Bought ${town.name} (${action.useSpecific ? 'specific commodities' : 'any commodities'})`
    }
    case 'startAuction': {
      const railroad = useState.railroadOffer[action.railroadIndex as number]
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

/** Action types for online play - server applies these. */
export type GameAction =
  | { type: 'production'; cardIndex: number; commoditiesToTake?: Commodity[]; tradingFloorPurchase?: { fromPlayerIndex: number; commodity: Commodity; quantity: number } }
  | { type: 'sell'; commodity: Commodity; quantity: number; useExportCompany?: boolean }
  | { type: 'discard'; commodity: Commodity }
  | { type: 'buyBuilding'; buildingIndex: number }
  | { type: 'upgradeBBuilding'; buildingId: string }
  | { type: 'setActiveBpBuilding'; buildingId: string }
  | { type: 'buyTown'; useSpecific: boolean; commoditiesToSpend?: Partial<Record<Commodity, number>> }
  | { type: 'startAuction'; railroadIndex: number }
  | { type: 'placeBid'; amount: number }
  | { type: 'passAuction' }
  | { type: 'endTurn' }
  | { type: 'undo' }

export function applyGameAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'production':
      return actionProduction(state, action.cardIndex, action.commoditiesToTake, action.tradingFloorPurchase)
    case 'sell':
      return actionSell(state, action.commodity, action.quantity, action.useExportCompany)
    case 'discard':
      return actionDiscard(state, action.commodity)
    case 'buyBuilding':
      return actionBuyBuilding(state, action.buildingIndex)
    case 'upgradeBBuilding':
      return actionUpgradeBBuilding(state, action.buildingId)
    case 'setActiveBpBuilding':
      return actionSetActiveBpBuilding(state, action.buildingId)
    case 'buyTown':
      return actionBuyTown(state, action.useSpecific, action.commoditiesToSpend)
    case 'startAuction':
      return startAuction(state, action.railroadIndex)
    case 'placeBid':
      return placeBid(state, action.amount)
    case 'passAuction':
      return passAuction(state)
    case 'endTurn':
      return actionEndTurn(state)
    default:
      return state
  }
}
