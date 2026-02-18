import type { GameState, Player, Commodity, Market, ProductionCard } from './types';
import { createProductionDeck, createBuildingTiles, RAILROADS, TOWNS } from './data/cards';

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
};
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
  if (!card || state.phase !== 'playing') return false;
  const maxProd = getMaxProduction(p);
  const prodList = COMMODITIES.flatMap(c => Array(card.production[c] ?? 0).fill(c)).slice(0, maxProd);
  const current = totalCommodities(p.commodities);
  return current + prodList.length <= getMaxStorage(p);
}

export function actionProduction(state: GameState, cardIndex: number): GameState {
  const s = { ...state, players: state.players.map(x => ({ ...x })) };
  const p = s.players[s.currentPlayerIndex];
  const card = p.hand[cardIndex];
  if (!card) return state;

  const maxProd = getMaxProduction(p);
  const available: Commodity[] = COMMODITIES.flatMap(c => Array(card.production[c] ?? 0).fill(c));
  const take = available.slice(0, maxProd);

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
  if (s.productionDeck.length > 0) {
    const drawn = s.productionDeck.pop()!;
    p.hand.push(drawn);
  } else if (s.productionDiscard.length > 0) {
    s.productionDeck = shuffle([...s.productionDiscard]);
    s.productionDiscard = [];
    const drawn = s.productionDeck.pop()!;
    p.hand.push(drawn);
  }

  // Enforce storage
  const maxStorage = getMaxStorage(p);
  let total = totalCommodities(p.commodities);
  if (total > maxStorage) {
    const excess = total - maxStorage;
    for (let i = 0; i < excess; i++) {
      for (const c of COMMODITIES) {
        if ((p.commodities[c] ?? 0) > 0) {
          p.commodities[c] = (p.commodities[c] ?? 0) - 1;
          break;
        }
      }
    }
  }

  return nextTurn(s);
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

  return nextTurn(s);
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
      return s;
    }
    return nextTurn(s);
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
  return nextTurn(s);
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
  return nextTurn(s);
}

function nextTurn(s: GameState): GameState {
  const next = (s.currentPlayerIndex + 1) % s.numPlayers;
  s.currentPlayerIndex = next;
  if (next === s.roundStartIndex) {
    const railroadsGone = s.railroadDeck.length === 0 && s.railroadOffer.length <= 1;
    const townsGone = s.townDeck.length === 0 && s.currentTown === null;
    if (railroadsGone || townsGone) return endGame(s);
  }
  return s;
}

function endGame(s: GameState): GameState {
  s.phase = 'gameover';
  return s;
}

export function computeScores(state: GameState): { playerIndex: number; vp: number; money: number }[] {
  return state.players.map((p, i) => {
    let vp = p.towns.reduce((s, t) => s + t.vp, 0) + p.railroads.reduce((s, r) => s + r.vp, 0);
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
