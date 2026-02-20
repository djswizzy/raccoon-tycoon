export type Commodity = 'wheat' | 'wood' | 'iron' | 'coal' | 'goods' | 'luxury';

export interface ProductionCard {
  id: string;
  production: Partial<Record<Commodity, number>>; // icons on card
  priceIncrease: Commodity[]; // commodities whose market price goes +1 when played
}

export interface RailroadCard {
  id: string;
  typeId: string; // same for all 4 copies of this railroad type
  name: string;
  minBid: number;
  /** VP for 1st, 2nd, 3rd, 4th copy of this type (as on the card) */
  vpSchedule: number[];
}

export interface TownCard {
  id: string;
  name: string;
  vp: number;
  costSpecific: Partial<Record<Commodity, number>>; // exact commodities required
  costAny: number; // OR this many of any mix
}

export type BuildingId = string;

export interface BuildingTile {
  id: BuildingId;
  name: string;
  cost: number;
  description: string;
  upgradeCost?: number;
  commodityBonus?: Commodity;
  bonusValue?: 1 | 2;
  productionLimit?: number;
  handSize?: number;
  storageBonus?: number;
  /** If true, player may only use one B/P building's effect at a time (tracked by activeBpBuildingId). */
  bpTag?: boolean;
  /** B/P card side: 1 = front (+1), 2 = back (+2). Only B/P cards have this. */
  bpLevel?: 1 | 2;
  /** Level-1 only: building id of the +2 side (upgrade target). */
  bpUpgradeToId?: string;
  /** Level-2 only: building id of the +1 side (this was upgraded from). */
  bpUpgradeFromId?: string;
  /** +N of any commodity when producing (player chooses). */
  anyCommodityBonus?: number;
  /** Trading firm: owner gets $1 per unit when any player sells these commodities. */
  tradingFirmCommodities?: Commodity[];
  /** Owner gets this many $ from bank when an auction is held. */
  auctionCommission?: number;
  /** Reduce town cost (any or each specific) by this many when buying a town. */
  townCostReduce?: number;
  /** End game: +this × (towns owned). */
  vpPerTown?: number;
  /** End game: +this × (railroads owned). */
  vpPerRailroad?: number;
  /** End game: +this × floor(money/20). */
  vpPer20Money?: number;
  /** End game: +this × (buildings owned), in addition to base 1 VP per building. */
  vpPerBuilding?: number;
  /** May perform two Sell actions in one turn. */
  extraSellAction?: boolean;
  /** May perform two Purchase Building actions in one turn. */
  extraBuildingPurchase?: boolean;
  /** When selling, add this to price per unit (capped at board max). */
  sellPriceBonus?: number;
}

export interface Player {
  id: string;
  name: string;
  money: number;
  commodities: Partial<Record<Commodity, number>>;
  hand: ProductionCard[];
  railroads: RailroadCard[];
  towns: TownCard[];
  buildings: BuildingTile[];
  /** When player has multiple B/P buildings, which one is currently active (only its effect applies). */
  activeBpBuildingId?: string;
}

export type Market = Record<Commodity, number>;

export type GamePhase = 'setup' | 'playing' | 'auction' | 'discardDown' | 'gameover';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  roundStartIndex: number;
  market: Market;
  productionDeck: ProductionCard[];
  productionDiscard: ProductionCard[];
  railroadDeck: RailroadCard[];
  railroadOffer: RailroadCard[];
  townDeck: TownCard[];
  currentTown: TownCard | null;
  buildingStack: BuildingTile[];
  buildingOffer: BuildingTile[];
  auctionRailroad: RailroadCard | null;
  auctionStarterIndex: number;
  auctionBids: number[];
  auctionPassed: boolean[];
  numPlayers: number;
  suddenDeathWinner?: number;
  /** True after the current player has performed their one action this turn (resets on actionEndTurn). */
  actionTakenThisTurn?: boolean;
  /** Number of production cards to draw for current player when they end their turn. */
  pendingDrawCount?: number;
  /** Set when an auction just resolved (for logging); should be cleared after logging. */
  lastAuctionResult?: { railroadName: string; winnerIndex: number; amount: number };
  /** Number of building purchases this turn (for Construction Company). */
  buildingPurchasesThisTurn?: number;
  /** Number of sell actions this turn (for Freight Company). */
  sellActionsThisTurn?: number;
}
