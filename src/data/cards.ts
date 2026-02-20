import type { Commodity, ProductionCard, RailroadCard, TownCard, BuildingTile } from '../types';

function prod(p: Partial<Record<Commodity, number>>, price: Commodity[]): ProductionCard {
  return { id: `p-${Math.random().toString(36).slice(2, 9)}`, production: p, priceIncrease: price };
}

export function createProductionDeck(): ProductionCard[] {
  const templates: [Partial<Record<Commodity, number>>, Commodity[]][] = [
    [{ wheat: 2, wood: 1 }, ['wheat', 'wood']],
    [{ wheat: 1, coal: 2 }, ['coal']],
    [{ wood: 2, iron: 1 }, ['wood', 'iron']],
    [{ iron: 2, coal: 1 }, ['iron']],
    [{ goods: 2, luxury: 1 }, ['goods', 'luxury']],
    [{ wheat: 1, goods: 1, luxury: 1 }, ['luxury']],
    [{ wood: 1, iron: 1, coal: 1 }, ['iron', 'coal']],
    [{ wheat: 1, wood: 1, goods: 1 }, ['wheat', 'goods']],
    [{ coal: 2, goods: 1 }, ['coal', 'goods']],
    [{ wheat: 2, iron: 1 }, ['wheat']],
    [{ wood: 1, coal: 1, luxury: 1 }, ['wood', 'luxury']],
    [{ iron: 1, goods: 2 }, ['iron', 'goods']],
    [{ wheat: 1, coal: 2 }, ['wheat', 'coal']],
    [{ wood: 2, luxury: 1 }, ['wood']],
    [{ iron: 1, coal: 1, goods: 1 }, ['coal']],
    [{ wheat: 1, wood: 1, iron: 1 }, ['wheat', 'wood']],
    [{ coal: 1, goods: 1, luxury: 1 }, ['luxury']],
    [{ wheat: 2, coal: 1 }, ['wheat', 'coal']],
    [{ wood: 1, iron: 2 }, ['wood', 'iron']],
    [{ goods: 1, luxury: 2 }, ['goods', 'luxury']],
    [{ wheat: 1, wood: 1, coal: 1 }, ['wood']],
    [{ iron: 1, coal: 1, luxury: 1 }, ['iron', 'luxury']],
    [{ wheat: 1, goods: 2 }, ['wheat', 'goods']],
    [{ wood: 2, goods: 1 }, ['wood', 'goods']],
    [{ iron: 2, luxury: 1 }, ['iron', 'luxury']],
    // 4–5 commodity cards (choose 3)
    [{ wood: 3, iron: 1, wheat: 1 }, ['wood', 'iron']],
    [{ wheat: 2, coal: 2, goods: 1 }, ['wheat', 'coal']],
    [{ iron: 2, coal: 1, luxury: 1 }, ['iron', 'luxury']],
    [{ goods: 2, luxury: 2, wheat: 1 }, ['goods', 'luxury']],
    [{ coal: 2, wood: 2, iron: 1 }, ['coal', 'wood']],
    [{ wheat: 2, wood: 1, goods: 1, luxury: 1 }, ['wheat', 'goods']],
    [{ iron: 1, coal: 1, goods: 1, luxury: 1 }, ['iron', 'coal']],
    [{ wood: 2, iron: 2, coal: 1 }, ['wood', 'iron']],
    [{ wheat: 3, wood: 1, coal: 1 }, ['wheat']],
    [{ luxury: 2, goods: 2, coal: 1 }, ['luxury', 'goods']],
  ];
  const deck: ProductionCard[] = [];
  let id = 0;
  for (const [p, price] of templates) {
    for (let i = 0; i < 2; i++) {
      deck.push({ ...prod(p, price), id: `prod-${id++}` });
    }
  }
  return shuffle(deck);
}

/** Railroad type template: 4 copies of each. vpSchedule = VP for 1st, 2nd, 3rd, 4th copy (totals: 4/9/15/23 etc). */
const RAILROAD_TYPES: { typeId: string; name: string; minBid: number; vpSchedule: number[] }[] = [
  { typeId: 'top-dog', name: 'Top Dog', minBid: 6, vpSchedule: [4, 5, 6, 8] },           // 4 / 9 / 15 / 23
  { typeId: 'tycoon-railroad', name: 'Tycoon Railroad', minBid: 7, vpSchedule: [4, 5, 7, 9] }, // 4 / 9 / 16 / 25
  { typeId: 'big-bear', name: 'Big Bear', minBid: 5, vpSchedule: [3, 4, 6, 8] },         // 3 / 7 / 13 / 21
  { typeId: 'fat-cat', name: 'Fat Cat', minBid: 4, vpSchedule: [3, 4, 5, 7] },           // 3 / 7 / 12 / 19
  { typeId: 'sly-fox', name: 'Sly Fox', minBid: 3, vpSchedule: [2, 3, 5, 7] },           // 2 / 5 / 10 / 17
  { typeId: 'skunk-works', name: 'Skunk Works', minBid: 2, vpSchedule: [2, 3, 4, 6] },    // 2 / 5 / 9 / 15
];

/** 2p: remove Sly Fox, Skunk Works, Tycoon. 3p: remove Skunk Works, Tycoon. 4p: remove Skunk Works. 5p: all. */
export function createRailroadDeck(numPlayers: number): RailroadCard[] {
  let types = [...RAILROAD_TYPES];
  if (numPlayers <= 4) types = types.filter(t => t.typeId !== 'skunk-works');
  if (numPlayers <= 3) types = types.filter(t => t.typeId !== 'tycoon-railroad');
  if (numPlayers <= 2) types = types.filter(t => t.typeId !== 'sly-fox');
  const deck: RailroadCard[] = [];
  let id = 0;
  for (const t of types) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push({
        id: `rr-${id++}`,
        typeId: t.typeId,
        name: t.name,
        minBid: t.minBid,
        vpSchedule: t.vpSchedule,
      });
    }
  }
  return shuffle(deck);
}

export const TOWNS: TownCard[] = [
  { id: 't-1', name: 'Millbrook', vp: 2, costSpecific: { wheat: 2, wood: 1 }, costAny: 0 },
  { id: 't-2', name: 'Ironvale', vp: 2, costSpecific: { iron: 2, coal: 1 }, costAny: 0 },
  { id: 't-3', name: 'Coalton', vp: 2, costSpecific: { coal: 2, iron: 1 }, costAny: 0 },
  { id: 't-4', name: 'Goodhaven', vp: 2, costSpecific: { goods: 2, luxury: 1 }, costAny: 0 },
  { id: 't-5', name: 'Wheatfield', vp: 3, costSpecific: { wheat: 3 }, costAny: 4 },
  { id: 't-6', name: 'Lumberton', vp: 3, costSpecific: { wood: 3 }, costAny: 4 },
  { id: 't-7', name: 'Steelburg', vp: 3, costSpecific: { iron: 3 }, costAny: 4 },
  { id: 't-8', name: 'Blackmoor', vp: 3, costSpecific: { coal: 3 }, costAny: 4 },
  { id: 't-9', name: 'Port Mercado', vp: 3, costSpecific: { goods: 3 }, costAny: 4 },
  { id: 't-10', name: 'Grand Luxe', vp: 3, costSpecific: { luxury: 3 }, costAny: 4 },
  { id: 't-11', name: 'Crossroads', vp: 4, costSpecific: {}, costAny: 5 },
  { id: 't-12', name: 'Harbor Town', vp: 4, costSpecific: { goods: 2, luxury: 2 }, costAny: 0 },
  { id: 't-13', name: 'Forge City', vp: 4, costSpecific: { iron: 2, coal: 2 }, costAny: 0 },
  { id: 't-14', name: 'Valley View', vp: 4, costSpecific: { wheat: 2, wood: 2 }, costAny: 0 },
  { id: 't-15', name: 'Capital City', vp: 5, costSpecific: {}, costAny: 6 },
  { id: 't-16', name: 'Astoria Central', vp: 5, costSpecific: { luxury: 2, goods: 2 }, costAny: 0 },
];

const COMMODITY_NAMES: Record<Commodity, string> = {
  wheat: 'Wheat', wood: 'Wood', iron: 'Iron', coal: 'Coal', goods: 'Goods', luxury: 'Luxury',
};

export const COMMODITY_EMOJI: Record<Commodity, string> = {
  wheat: '🌾',
  wood: '🪵',
  iron: '⚙️',
  coal: '🪨',
  goods: '📦',
  luxury: '💎',
};

/** Building tiles from Raccoon Tycoon. B/P = only one B/P effect at a time. B cards are double-sided: front +1, back +2; only the front is in the deck; player can pay to upgrade. */
const BUILDING_TILES: BuildingTile[] = [
  // B cards: 6 (or 7) physical cards, two sides each. Front (+1) in deck; back (+2) obtained by upgrade.
  { id: 'wheat-field-b', name: 'Wheat Field (B)', cost: 4, description: '+1 Wheat', commodityBonus: 'wheat', bonusValue: 1, bpTag: true, bpLevel: 1, upgradeCost: 5, bpUpgradeToId: 'grain-farm-b' },
  { id: 'grain-farm-b', name: 'Grain Farm (B)', cost: 9, description: '+2 Wheat', commodityBonus: 'wheat', bonusValue: 2, bpTag: true, bpLevel: 2, bpUpgradeFromId: 'wheat-field-b' },
  { id: 'lumber-yard-b', name: 'Lumber Yard (B)', cost: 4, description: '+1 Wood', commodityBonus: 'wood', bonusValue: 1, bpTag: true, bpLevel: 1, upgradeCost: 5, bpUpgradeToId: 'saw-mill-b' },
  { id: 'saw-mill-b', name: 'Saw Mill (B)', cost: 9, description: '+2 Wood', commodityBonus: 'wood', bonusValue: 2, bpTag: true, bpLevel: 2, bpUpgradeFromId: 'lumber-yard-b' },
  { id: 'coal-deposit-b', name: 'Coal Deposit (B)', cost: 5, description: '+1 Coal', commodityBonus: 'coal', bonusValue: 1, bpTag: true, bpLevel: 1, upgradeCost: 7, bpUpgradeToId: 'coal-mine-b' },
  { id: 'coal-mine-b', name: 'Coal Mine (B)', cost: 12, description: '+2 Coal', commodityBonus: 'coal', bonusValue: 2, bpTag: true, bpLevel: 2, bpUpgradeFromId: 'coal-deposit-b' },
  { id: 'iron-deposit-b', name: 'Iron Deposit (B)', cost: 5, description: '+1 Iron', commodityBonus: 'iron', bonusValue: 1, bpTag: true, bpLevel: 1, upgradeCost: 7, bpUpgradeToId: 'iron-mine-b' },
  { id: 'iron-mine-b', name: 'Iron Mine (B)', cost: 12, description: '+2 Iron', commodityBonus: 'iron', bonusValue: 2, bpTag: true, bpLevel: 2, bpUpgradeFromId: 'iron-deposit-b' },
  { id: 'tool-die-b', name: 'Tool & Die (B)', cost: 6, description: '+1 Goods', commodityBonus: 'goods', bonusValue: 1, bpTag: true, bpLevel: 1, upgradeCost: 9, bpUpgradeToId: 'loom-b' },
  { id: 'loom-b', name: 'Loom (B)', cost: 15, description: '+2 Goods', commodityBonus: 'goods', bonusValue: 2, bpTag: true, bpLevel: 2, bpUpgradeFromId: 'tool-die-b' },
  { id: 'vineyard-b', name: 'Vineyard (B)', cost: 6, description: '+1 Luxury', commodityBonus: 'luxury', bonusValue: 1, bpTag: true, bpLevel: 1, upgradeCost: 9, bpUpgradeToId: 'glass-works-b' },
  { id: 'glass-works-b', name: 'Glass Works (B)', cost: 15, description: '+2 Luxury', commodityBonus: 'luxury', bonusValue: 2, bpTag: true, bpLevel: 2, bpUpgradeFromId: 'vineyard-b' },
  { id: 'machine-shop-b', name: 'Machine Shop (B)', cost: 30, description: '+1 Commodity of your choice', anyCommodityBonus: 1, bpTag: true, bpLevel: 1, upgradeCost: 30, bpUpgradeToId: 'water-mill-b' },
  { id: 'water-mill-b', name: 'Water Mill (B)', cost: 60, description: '+2 Commodities of your choice', anyCommodityBonus: 2, bpTag: true, bpLevel: 2, bpUpgradeFromId: 'machine-shop-b' },
  { id: 'lumber-wheat-trading-firm', name: 'Lumber/ Wheat Trading Firm', cost: 10, description: 'You get $1/ unit of Wood or Wheat that is sold by any player.', tradingFirmCommodities: ['wood', 'wheat'] },
  { id: 'goods-luxury-trading-firm', name: 'Goods Luxury Trading Firm', cost: 10, description: 'You get $1/ unit of Goods or Luxury that is sold by any player.', tradingFirmCommodities: ['goods', 'luxury'] },
  { id: 'coal-iron-trading-firm', name: 'Coal / Iron Trading Firm', cost: 10, description: 'You get $1/ unit of Coal or Iron that is sold by any player.', tradingFirmCommodities: ['coal', 'iron'] },
  { id: 'warehouse-x2', name: 'Warehouse (x2)', cost: 10, description: 'You may store an extra 3 Commodity Tokens.', storageBonus: 3 },
  { id: 'construction-company', name: 'Construction Company', cost: 20, description: 'You may perform two Purchase Building actions in one turn.', extraBuildingPurchase: true },
  { id: 'freight-company', name: 'Freight Company', cost: 25, description: 'You may sell 2 Commodities in one turn.', extraSellAction: true },
  { id: 'governors-mansion', name: "Governor's Mansion", cost: 30, description: 'Each Town Card you own is worth +1 VP at the end of the game.', vpPerTown: 1 },
  { id: 'rail-baron', name: 'Rail Baron', cost: 30, description: 'Each of your Railroad Cards is worth +1 VP at the end of the game.', vpPerRailroad: 1 },
  { id: 'bank', name: 'Bank', cost: 30, description: 'Each $20 that you have at the end of the game is worth +1 VP.', vpPer20Money: 1 },
  { id: 'auction-house', name: 'Auction House', cost: 15, description: 'You get $5 commission for each auction that is held. This is paid from the bank, not the player.', auctionCommission: 5 },
  { id: 'smuggler', name: 'Smuggler', cost: 20, description: 'Your hand limit of Price & Production cards is increased to 4.', handSize: 4 },
  { id: 'black-market', name: 'Black Market', cost: 30, description: 'Your hand limit of Price & Production cards is increased to 5.', handSize: 5 },
  { id: 'brick-works', name: 'Brick Works', cost: 25, description: 'You may build Towns with one fewer Commodity.', townCostReduce: 1 },
  { id: 'mayors-office', name: "Mayor's Office", cost: 30, description: 'Each Building you own is worth +1 VP at the end of the game.', vpPerBuilding: 1 },
  { id: 'trading-floor', name: 'Trading Floor', cost: 15, description: "When using the 'Produce' action, you may also buy any number of one Commodity currently owned by one other player at the current market price (before the price is affected by the Price & Production card). They may not refuse." },
  { id: 'export-company', name: 'Export Company', cost: 30, description: "When selling a Commodity, you may increase the price of that Commodity by $3 before selling. Maximum Price is limited to the value shown on the board for that Commodity.", sellPriceBonus: 3 },
  { id: 'cottage-industry-p', name: 'Cottage Industry (p)', cost: 30, description: 'You may produce up to four (4) of the Commodity Tokens shown in the Production area of a Price/ Production Card.', productionLimit: 4, bpTag: true },
  { id: 'factory-x2-p', name: 'Factory (x2) (p)', cost: 40, description: 'You may produce up to five (5) of the Commodity Tokens shown in the Production area of a Price/ Production Card.', productionLimit: 5, bpTag: true },
];

/** Level-1 B card tiles (7 types); only 4 are used per game. */
const B_LEVEL1_TILES = BUILDING_TILES.filter(t => t.bpLevel === 1 && t.bpUpgradeToId);

/** Non-B buildings (shuffled into the stack; refill offer from this). */
const NON_B_TILES = BUILDING_TILES.filter(t => !t.bpTag);

/**
 * Per game: pick a random 4 of the 7 B card types for the initial offer; the rest of the deck is non-B buildings only.
 * Initial building offer = those 4 B cards. Stack = shuffled non-B buildings (refill from here).
 */
export function createBuildingDeckForGame(): { initialOffer: BuildingTile[]; buildingStack: BuildingTile[] } {
  const bPool = shuffle([...B_LEVEL1_TILES]);
  const initialOffer = bPool.slice(0, 4);
  const buildingStack = shuffle([...NON_B_TILES]);
  return { initialOffer, buildingStack };
}

/** Only front sides of B cards (+1) go in the deck; back sides (+2) are obtained by upgrade. (Legacy: single shuffled deck.) */
export function createBuildingTiles(): BuildingTile[] {
  const forDeck = BUILDING_TILES.filter(t => !t.bpUpgradeFromId);
  return shuffle([...forDeck]);
}

/** Look up any building tile by id (including level-2 B sides, for upgrades). */
export function getBuildingTileById(id: string): BuildingTile | undefined {
  return BUILDING_TILES.find(t => t.id === id);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export { COMMODITY_NAMES };
