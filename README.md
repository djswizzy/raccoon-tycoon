# Marsupial Monopoly

A web implementation of a board game in the spirit of railroad and commodity games. Build railroads, towns, and goods to become the most prosperous critter in Astoria.

## How to run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (or the port Vite prints).

### Testing locally without pushing to GitHub

To try changes locally with **online multiplayer** (client + game server on your machine):

1. **Start the game server:** `npm run server` (runs on port 3001).
2. **Start the client:** `npm run dev` (Vite on 5173 or 5174).
3. Open **http://localhost:5173** (or 5174) in your browser. With no `VITE_API_URL` set, the app uses the current origin; Vite’s proxy (see `vite.config.ts`) forwards `/api` to the server, so create/join and gameplay hit your local server.

Or run both in one go: `npm run dev:all`, then open the URL Vite prints.

No deploy or GitHub push needed—edit code and refresh to see changes.

### Running the game server in Docker (Linux)

To run only the **game server** in a container on a Linux server:

1. **Build the image** (from the project root):
   ```bash
   docker build -t marsupial-monopoly-server .
   ```

2. **Run the container** (expose port 3001 and set CORS origins for your frontend):
   ```bash
   docker run -d \
     --name game-server \
     -p 3001:3001 \
     -e ALLOWED_ORIGINS="https://your-vercel-app.vercel.app,https://www.yourdomain.com" \
     marsupial-monopoly-server
   ```
   Replace the URLs with the exact origin(s) of your client (e.g. your Vercel app URL). Use a comma-separated list for multiple origins.

3. **Optional:** Override port inside the container:
   ```bash
   -e PORT=3001 -p 8080:3001
   ```
   Then the server listens on 3001 inside the container and you map it to host port 8080.

4. **View logs:** `docker logs -f game-server`  
   **Stop:** `docker stop game-server`  
   **Remove:** `docker rm game-server`

Point your frontend at the server (e.g. set `VITE_API_URL` to `https://your-server:3001` or use a reverse proxy in front of the container).

## How to play

- **Setup:** Choose 2–5 players and enter names.
- **On your turn** you take one action:
  1. **Production** — Play a card from your hand to take commodities from the supply (up to 3, or 4/5 with buildings) and raise the market price of the commodities shown on the card.
  2. **Sell** — Sell any amount of one commodity type for the current market price; the price then drops by the number sold.
  3. **Start a railroad auction** — Choose one of the two face-up railroads and start an auction; minimum bid is on the card. Highest bidder wins and pays; if you didn’t win, you get another action.
  4. **Buy a building** — Pay the cost and take one of the four face-up buildings (extra production, hand size, or storage).
  5. **Buy the town** — Pay the required commodities (either the exact mix or “any” amount shown) to take the current town card.
- **Game end:** When the last railroad is auctioned or the last town is bought, the current round is finished, then the game ends.
- **Scoring:** Sum VP on your towns + VP on your railroads + 2 VP per town/railroad pair + 1 VP per building. Tiebreaker: most money.

## Assets

- **Facedown deck backs:** Put `Town.png` and `Railroad.png` in the **`public/`** folder. They are used as the background images for the town deck and railroad deck piles.

## Tech

- React 18 + TypeScript (Vite frontend)
- Node.js + Express + Socket.IO game server in `server/index.ts`
  - REST API: `POST /api/room/create`, `POST /api/room/join`, `GET /api/room/:roomCode`, `POST /api/room/:roomCode/start`, `POST /api/room/:roomCode/action`
  - Join now **only succeeds** if the room already exists; joining a non-existent room returns `404 Room not found`
  - CORS origins are controlled via the `ALLOWED_ORIGINS` environment variable
- Docker support for running the game server (and optional ngrok tunnel) on a Linux host

## Online multiplayer (Vercel)

To add online multiplayer and deploy on Vercel, see **[docs/MULTIPLAYER_VERCEL.md](docs/MULTIPLAYER_VERCEL.md)**. It covers:

- Using Vercel + a database (Vercel Postgres, Supabase, or KV) for game state
- Adding `/api` serverless routes for create game, join, get state, and actions
- Frontend changes: create/join flows, sending actions, polling (or Supabase Realtime)
- A starter API skeleton lives in `/api` (in-memory store; replace with a real DB for production)
