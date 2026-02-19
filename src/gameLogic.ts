import type { GameState, Player, Commodity, Market, ProductionCard } from './types';
import { createProductionDeck, createBuildingTiles, RAILROADS, TOWNS } from './data/cards';

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

  let railroadDeck = [...RAILROADS];
  if (numPlayers <= 4) railroadDeck = railroadDeck.filter(r => r.id !== 'rr-7');
  if (numPlayers <= 3) railroadDeck = railroadDeck.filter(r => r.id !== 'rr-8' && r.id !== 'rr-6');
  if (numPlayers <= 2) railroadDeck = railroadDeck.filter(r => !['rr-7', 'rr-8', 'rr-6'].includes(r.id));
  railroadDeck = shuffle(railroadDeck);
  const railroadOffer = railroadDeck.splice(0, 2);

  let townDeck = [...TOWNS];
  townDeck.sort((a, b) => a.vp - b.vp);
  if (numPlayers === 2) {
    townDeck = townDeck.filter((_, i) => i % 2 === 0);
  }
  const currentTown = townDeck.shift() ?? null;

  const buildingTiles = createBuildingTiles();
  const buildingOffer = buildingTiles.splice(0, 4);
  const buildingStack = buildingTiles;

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

function drawOneCard(state: GameState): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x, hand: [...x.hand] })) };
  const p = s.players[s.currentPlayerIndex];
  let deck = [...s.productionDeck];
  let discard = [...s.productionDiscard];
  let card: ProductionCard | null = null;
  if (deck.length > 0) {
    card = deck.pop()!;
  } else if (discard.length > 0) {
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
  const tile = player.buildings.find(b => b.productionLimit != null);
  if (tile?.productionLimit === 5) return 5;
  if (tile?.productionLimit === 4) return 4;
  return 3;
}

export function getMaxHandSize(player: Player): number {
  if (player.buildings.some(b => b.handSize === 5)) return 5;
  if (player.buildings.some(b => b.handSize === 4)) return 4;
  return 3;
}

export function getMaxStorage(player: Player): number {
  let base = 10;
  base += player.buildings.length;
  const warehouse = player.buildings.find(b => b.storageBonus != null);
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

export function actionProduction(state: GameState, cardIndex: number, commoditiesToTake?: Commodity[]): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const card = p.hand[cardIndex];
  if (!card) return state;

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

  const bonusTile = p.buildings.find(b => b.commodityBonus != null);
  if (bonusTile?.commodityBonus) {
    const extra = bonusTile.bonusValue ?? 1;
    for (let i = 0; i < extra; i++) {
      const c = bonusTile.commodityBonus!;
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

export function actionSell(state: GameState, commodity: Commodity, quantity: number): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const have = p.commodities[commodity] ?? 0;
  const sell = Math.min(quantity, have);
  if (sell <= 0 || state.phase !== 'playing') return state;

  p.commodities[commodity] = have - sell;
  const price = s.market[commodity];
  p.money += price * sell;
  s.market[commodity] = Math.max(COMMODITY_PRICE_MIN[commodity], price - sell);

  return s;
}

export function startAuction(state: GameState, railroadIndex: number): GameState {
  if (state.phase !== 'playing' || state.auctionRailroad) return state;
  const card = state.railroadOffer[railroadIndex];
  if (!card) return state;
  const starter = state.currentPlayerIndex;
  if (state.players[starter].money < card.minBid) return state;

  const s = { ...state, players: state.players.map(x => ({ ...x })) };
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
    if (winner >= 0 && winner !== auctionStarter) {
      s.currentPlayerIndex = auctionStarter;
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
  s.buildingOffer = s.buildingOffer.filter((_, i) => i !== buildingIndex);
  if (s.buildingStack.length > 0) {
    s.buildingOffer.push(s.buildingStack.shift()!);
  }
  s.actionTakenThisTurn = true;
  return s;
}

export function actionBuyTown(state: GameState, useSpecific: boolean): GameState {
  if (state.phase !== 'playing' || !state.currentTown) return state;
  const town = state.currentTown;
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];

  if (useSpecific) {
    for (const [c, n] of Object.entries(town.costSpecific ?? {})) {
      if ((p.commodities[c as Commodity] ?? 0) < n) return state;
    }
    for (const c of COMMODITIES) {
      const pay = town.costSpecific?.[c] ?? 0;
      if (pay > 0) p.commodities[c] = (p.commodities[c] ?? 0) - pay;
    }
  } else {
    let need = town.costAny;
    for (const c of COMMODITIES) {
      while (need > 0 && (p.commodities[c] ?? 0) > 0) {
        p.commodities[c] = (p.commodities[c] ?? 0) - 1;
        need--;
      }
    }
    if (need > 0) return state;
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

  s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.numPlayers;
  s.actionTakenThisTurn = false;
  return s;
}

function endGame(s: GameState): GameState {
  s.phase = 'gameover';
  return s;
}

export function computeScores(state: GameState): { playerIndex: number; vp: number; money: number }[] {
  return state.players.map((p, i) => {
    // Towns: printed VP on each; railroads: sum of each card's VP
    let vp = p.towns.reduce((s, t) => s + t.vp, 0) + p.railroads.reduce((s, r) => s + r.vp, 0);
    // +2 per town–railroad pair (town paired with a railroad at end of game)
    const pairs = Math.min(p.towns.length, p.railroads.length);
    vp += pairs * 2;
    vp += p.buildings.length;
    return { playerIndex: i, vp, money: p.money };
  });
}

export function getWinner(state: GameState): number {
  if (state.phase !== 'gameover') return -1;
  const scores = computeScores(state);
  scores.sort((a, b) => b.vp - a.vp || b.money - a.money);
  return scores[0].playerIndex;
}

export { COMMODITIES };

/** Action types for online play - server applies these. */
export type GameAction =
  | { type: 'production'; cardIndex: number; commoditiesToTake?: Commodity[] }
  | { type: 'sell'; commodity: Commodity; quantity: number }
  | { type: 'discard'; commodity: Commodity }
  | { type: 'buyBuilding'; buildingIndex: number }
  | { type: 'buyTown'; useSpecific: boolean }
  | { type: 'startAuction'; railroadIndex: number }
  | { type: 'placeBid'; amount: number }
  | { type: 'passAuction' }
  | { type: 'endTurn' }

export function applyGameAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'production':
      return actionProduction(state, action.cardIndex, action.commoditiesToTake)
    case 'sell':
      return actionSell(state, action.commodity, action.quantity)
    case 'discard':
      return actionDiscard(state, action.commodity)
    case 'buyBuilding':
      return actionBuyBuilding(state, action.buildingIndex)
    case 'buyTown':
      return actionBuyTown(state, action.useSpecific)
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
