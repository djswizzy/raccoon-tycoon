/**
 * In-memory game store. Replace with Vercel Postgres / Supabase / KV for production.
 * Keys: gameId -> { state: GameState, playerTokens: string[] }
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, { state: any; playerTokens: string[] }>();

export function getGame(gameId: string) {
  return store.get(gameId);
}

export function setGame(gameId: string, state: unknown, playerTokens: string[]) {
  store.set(gameId, { state, playerTokens });
}

export function setGameState(gameId: string, state: unknown) {
  const row = store.get(gameId);
  if (!row) return;
  store.set(gameId, { ...row, state });
}

export function addPlayerToken(gameId: string, token: string) {
  const row = store.get(gameId);
  if (!row) return;
  row.playerTokens.push(token);
}
