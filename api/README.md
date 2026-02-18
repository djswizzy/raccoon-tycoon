# API (Vercel Serverless)

These endpoints are intended for online multiplayer. Deploy with Vercel; they run as serverless functions.

**Without a database:** The stub implementations use an in-memory store (lost on cold start). Replace with Vercel Postgres, Supabase, or KV (see `docs/MULTIPLAYER_VERCEL.md`).

**Game logic:** To validate and apply actions on the server, you need the same `initGame`, `actionProduction`, etc. Either:
- Build a small bundle that includes `src/gameLogic.ts` + `src/data/cards.ts` + `src/types.ts` and import it from these handlers, or
- Copy the relevant logic into `api/lib/` so the API is self-contained.

Routes:
- `POST /api/games` — create game (body: `{ numPlayers, playerName }`), returns `{ gameId, playerToken }`.
- `GET /api/games/[id]` — get current game state (for load + polling).
- `POST /api/games/[id]/join` — join game (body: `{ name }`), returns `{ playerToken }`.
- `POST /api/games/[id]/action` — perform action (body: `{ playerToken, action, payload }`), returns new state.
