export type Commodity = 'wheat' | 'wood' | 'iron' | 'coal' | 'goods' | 'luxury';

export interface ProductionCard {
  id: string;
  production: Partial<Record<Commodity, number>>; // icons on card
  priceIncrease: Commodity[]; // commodities whose market price goes +1 when played
}

export interface RailroadCard {
  id: string;
  typeId: string;
  name: string;
  minBid: number;
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
  bpTag?: boolean;
  bpLevel?: 1 | 2;
  bpUpgradeToId?: string;
  bpUpgradeFromId?: string;
  anyCommodityBonus?: number;
  tradingFirmCommodities?: Commodity[];
  auctionCommission?: number;
  townCostReduce?: number;
  vpPerTown?: number;
  vpPerRailroad?: number;
  vpPer20Money?: number;
  vpPerBuilding?: number;
  extraSellAction?: boolean;
  extraBuildingPurchase?: boolean;
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
  buildingPurchasesThisTurn?: number;
  sellActionsThisTurn?: number;
}
