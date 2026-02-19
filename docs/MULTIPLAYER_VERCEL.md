# Online Multiplayer on Vercel

This guide outlines how to make Marsupial Monopoly work for online multiplayer using **Vercel** for hosting and serverless APIs, plus a **database** for game state.

## Why this approach

- **Vercel** doesn’t run long-lived WebSockets, so we use a **turn-based + REST API + database** model.
- Clients **poll** for the latest game state (e.g. every 2–3 seconds) or you can add **Supabase Realtime** later so the server pushes “game updated” and the client refetches.
- All game logic stays in shared code; the API only loads state, applies actions, and saves state.

## High-level architecture

```
[Browser A]  ──POST /api/games/[id]/action──►  [Vercel Serverless]
[Browser B]  ──GET  /api/games/[id] (poll)──►       │
                                                      ├──► [Database]
                                                      │    (game state JSON)
                                                      └──► Your game logic (init, actions)
```

1. **Create game** → `POST /api/games` → returns `gameId` and a shareable link.
2. **Join game** → `POST /api/games/[id]/join` with player name → returns a **player token** (store in `localStorage`).
3. **Get state** → `GET /api/games/[id]` → returns current `GameState` (for initial load and polling).
4. **Do action** → `POST /api/games/[id]/action` with `{ playerToken, action: 'production' | 'sell' | ... }` → server runs the same `actionProduction` / `actionSell` / etc. you use locally, saves new state, returns it.

The frontend you have now stays almost the same: instead of `setState(newState)` you’ll `await fetch('/api/games/' + gameId + '/action', { method: 'POST', body: ... })` and then set state from the response (and other clients see it when they poll or get a real-time event).

---

## Step 1: Database (pick one)

You need a place to store one row per game (e.g. `id`, `state` JSON, `created_at`). All work with Vercel.

### Option A: Vercel Postgres (simplest on Vercel)

1. In Vercel dashboard: Project → Storage → Create Database → **Postgres**.
2. Connect it to your project; Vercel will add `POSTGRES_URL` (and similar) env vars.
3. Create a table, e.g.:

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Use the `id` as the public game code (e.g. nanoid).

### Option B: Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. New table `games`: columns `id` (uuid/text), `state` (jsonb), `created_at`, `updated_at`.
3. In Vercel, set env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or service key for server).
4. Later you can add **Supabase Realtime** on the `games` table so clients get pushed updates instead of polling.

### Option C: Vercel KV (Redis)

Good if you want very fast reads/writes and TTL (e.g. auto-delete games after 24h). Create via Vercel Storage → KV, then use the REST API or a small client to get/set `game:{id}` → JSON state.

---

## Step 2: API routes on Vercel

Vercel will run serverless functions for paths under `/api`. You can keep your app as a **Vite** SPA and add an `api` folder at the **root** of the repo.

### Folder layout

```
marsupial_monopoly/
  api/
    games/
      index.ts    → POST create game
      [id].ts     → GET game state
      [id]/
        join.ts   → POST join game
        action.ts → POST perform action
  src/            → existing Vite app
  ...
```

Each file under `api/` should export a default function that receives `req` and `res` (or the framework-style handler your runtime expects). Vercel supports **Node** and **Edge** runtimes.

### Shared game logic

Your existing `gameLogic` and `types` are in `src/`. The serverless functions need to run the same logic. Options:

1. **Copy** the minimal logic into `api/lib/gameLogic.ts` (or a small “engine” file) and import it from the API handlers. Easiest for Vercel, which often bundles per-function.
2. **Monorepo / shared package**: put `gameLogic` + types in a shared package (e.g. `packages/core`) and import from both `src/` and `api/`. More setup, single source of truth.
3. **Import from `../src`** from the API: possible if your build step compiles the API and includes `src`. Depends on how you build the `api` folder.

For a first version, copying or re-exporting the game logic into something like `api/lib/` is the most reliable.

### Example: GET game state

```ts
// api/games/[id].ts (or similar, depending on Vercel routing)
import { getGameById } from '../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { id } = req.query
  const game = await getGameById(id)
  if (!game) return res.status(404).json({ error: 'Game not found' })
  return res.status(200).json(game.state)
}
```

### Example: POST action

- Read body: `{ playerToken, action: 'production', payload: { cardIndex, commoditiesToTake? } }` (or whatever shape you use locally).
- Load game row by `id`, parse `state`.
- Validate `playerToken` matches the current player (or that it’s their turn and token is correct).
- Call the same function you use in the client, e.g. `actionProduction(state, cardIndex, commoditiesToTake)`.
- If the result is a new `GameState`, save it (e.g. `UPDATE games SET state = $1, updated_at = NOW() WHERE id = $2`) and return it: `res.status(200).json(newState)`.
- If the action is invalid, return 400 with a message.

You’ll do the same for `actionSell`, `actionBuyBuilding`, `startAuction`, `placeBid`, `passAuction`, `actionBuyTown`, `actionDiscard`, etc., by mapping `action` and `payload` to the right function and returning the new state.

---

## Step 3: Frontend changes

1. **Routing / game id**
   - Use the URL for the game id: e.g. `/game/:gameId` (React Router) or `?game=xyz` so joining and reconnects are just a link.
2. **Create game**
   - Call `POST /api/games` with `{ numPlayers, playerName }` (or similar). Response: `{ gameId, playerToken }`. Save `playerToken` in `localStorage` under a key like `marsupial_player_${gameId}`. Redirect to `/game/:gameId`.
3. **Join game**
   - On load of `/game/:gameId`, if there’s no `playerToken` in localStorage, show “Join as” form; on submit call `POST /api/games/[id]/join` with `{ name }`, get back `{ playerToken }`, store it, then fetch state.
4. **Load state**
   - On mount and when it’s not your turn (or on a timer), call `GET /api/games/[id]` and set state from the JSON. When it’s your turn, you can poll less often or only after your own action.
5. **Sending actions**
   - Instead of `setState(actionProduction(state, ...))`, do:
     - `const newState = await postAction(gameId, playerToken, 'production', { cardIndex, commoditiesToTake })`
     - then `setState(newState)` (and optionally show an error if 400).
6. **Discard / auction**
   - Same idea: one endpoint that accepts `action: 'discard' | 'bid' | 'pass'` and the right payload; server runs the same logic and returns updated state.
7. **Polling**
   - `useEffect` with `setInterval(() => fetchGameState(gameId).then(setState), 3000)` when phase is not “your turn” or when you’re in “discardDown” so other players see updates. Clear the interval when the component unmounts or when the game ends.

---

## Step 4: Security and validation

- **Player identity**: Use the `playerToken` returned from `POST /api/games/[id]/join`. Store it only in memory or localStorage; send it in the body or header on every `POST /api/games/[id]/action`. Server checks that the token corresponds to the player index whose turn it is (and that the action is valid).
- **Idempotency**: Optionally store a hash of the last state or an `actionIndex` so you can reject duplicate submissions.
- **Rate limiting**: Vercel has some built-in limits; you can add stricter rate limits per game id in your API if needed.

---

## Step 5: Deploy on Vercel

1. Push the repo to GitHub and import the project in Vercel.
2. Set **Environment Variables** (e.g. `POSTGRES_URL` or `SUPABASE_URL` + `SUPABASE_ANON_KEY`).
3. Build command: keep `npm run build` (or `vite build`). Vercel will detect the Vite app and the `api` folder and deploy both.
4. Root directory: leave as repo root so both `src/` and `api/` are included.

After deploy, your app will be at `https://your-project.vercel.app` and the API at `https://your-project.vercel.app/api/games/...`.

---

## Optional: Real-time updates (no polling)

- **Supabase Realtime**: After saving the new state in Supabase, clients subscribed to that row get an event. On event, refetch `GET /api/games/[id]` (or the state from Supabase) and call `setState`. This reduces polling to almost zero.
- **Pusher / Ably**: From your API, after updating the game, trigger a “game-updated” event with `gameId`. Clients subscribe to the channel for their `gameId` and refetch state when the event fires. Same frontend pattern: event → refetch → setState.

---

## Summary checklist

- [ ] Add a database (Vercel Postgres, Supabase, or KV) and a `games` table (id, state JSON).
- [ ] Add `/api` serverless functions: create game, get game, join game, action.
- [ ] Move or copy game logic so the API can run `initGame`, `actionProduction`, etc.
- [ ] Frontend: create game → get `gameId` + token → redirect to `/game/:gameId`.
- [ ] Frontend: join flow for `/game/:gameId` without a token.
- [ ] Frontend: send actions via `POST .../action` and set state from response; poll `GET ...` when not your turn (or use Supabase Realtime).
- [ ] Deploy on Vercel with env vars set.

If you tell me whether you prefer **Vercel Postgres** or **Supabase** (and if you want to keep Vite or switch to Next.js for the API), I can outline the exact file tree and function signatures for your repo next.
