export type Commodity = 'wheat' | 'wood' | 'iron' | 'coal' | 'goods' | 'luxury';

export interface ProductionCard {
  id: string;
  production: Partial<Record<Commodity, number>>; // icons on card
  priceIncrease: Commodity[]; // commodities whose market price goes +1 when played
}

export interface RailroadCard {
  id: string;
  name: string;
  minBid: number;
  vp: number;
}

export interface TownCard {
  id: string;
  name: string;
  vp: number;
  costSpecific: Partial<Record<Commodity, number>>; // exact commodities required
  costAny: number; // OR this many of any mix
}

export type BuildingId =
  | 'cottage'      // +1 max production (4 instead of 3)
  | 'factory'     // +2 max production (5)
  | 'smuggler'    // hand size 4
  | 'blackmarket' // hand size 5
  | 'warehouse'   // +4 storage (on top of +1 per building)
  | 'wheat1' | 'wheat2' | 'wood1' | 'wood2' | 'iron1' | 'iron2'
  | 'coal1' | 'coal2' | 'goods1' | 'goods2' | 'luxury1' | 'luxury2'
  | 'machineshop'; // double-sided +1/+2

export interface BuildingTile {
  id: BuildingId;
  name: string;
  cost: number;
  description: string;
  upgradeCost?: number; // for +1/+2 tiles
  commodityBonus?: Commodity;
  bonusValue?: 1 | 2;
  productionLimit?: number;
  handSize?: number;
  storageBonus?: number;
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
}
