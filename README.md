# Marsupial Monopoly

A web implementation of a board game in the spirit of railroad and commodity games. Build railroads, towns, and goods to become the most prosperous critter in Astoria.

## How to run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

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

## Tech

- React 18 + TypeScript
- Vite
- No backend; single-device / pass-and-play

## Online multiplayer (Vercel)

To add online multiplayer and deploy on Vercel, see **[docs/MULTIPLAYER_VERCEL.md](docs/MULTIPLAYER_VERCEL.md)**. It covers:

- Using Vercel + a database (Vercel Postgres, Supabase, or KV) for game state
- Adding `/api` serverless routes for create game, join, get state, and actions
- Frontend changes: create/join flows, sending actions, polling (or Supabase Realtime)
- A starter API skeleton lives in `/api` (in-memory store; replace with a real DB for production)
