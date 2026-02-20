# Deploying with Vercel (client) + local server (ngrok)

You can host the **client** on Vercel and run the **game server** on your machine, exposing it with ngrok so the Vercel app can talk to it.

## 1. Deploy the client to Vercel

1. Push your repo to GitHub and [import the project in Vercel](https://vercel.com/new).
2. In the Vercel project **Settings → Environment Variables**, add:
   - **Name:** `VITE_API_URL`
   - **Value:** your ngrok URL **without** a trailing slash (e.g. `https://abc123.ngrok-free.app`)
   - Apply to **Production**, **Preview**, and **Development** if you use them.
3. Redeploy so the build picks up `VITE_API_URL` (Vite bakes it in at build time).

The app will be served from `https://your-project.vercel.app` (or your custom domain). All API and polling requests will go to `VITE_API_URL` (your ngrok URL).

## 2. Run the server locally and expose with ngrok

1. **Start the game server:**
   ```bash
   npm run server
   ```
   By default it listens on port 3001.

2. **Allow the Vercel app origin in CORS.** Set `ALLOWED_ORIGINS` to your Vercel URL (and optionally your ngrok URL):
   ```bash
   export ALLOWED_ORIGINS="https://your-project.vercel.app,https://your-project-*.vercel.app"
   npm run server
   ```
   Or in a `.env` file (if you use one):
   ```
   ALLOWED_ORIGINS=https://your-project.vercel.app
   ```

3. **Expose the server with ngrok:**
   ```bash
   ngrok http 3001
   ```
   Use the HTTPS URL ngrok prints (e.g. `https://abc123.ngrok-free.app`) as `VITE_API_URL` in Vercel (step 1).

## 3. Optional: use a fixed ngrok domain

With a paid ngrok plan you can use a fixed subdomain so you don’t have to change `VITE_API_URL` after each restart:

```bash
ngrok http 3001 --domain=your-fixed-name.ngrok-free.app
```

Then set `VITE_API_URL` in Vercel to `https://your-fixed-name.ngrok-free.app`.

## Summary

| Where        | What runs |
|-------------|-----------|
| **Vercel**  | Static client (React SPA). Build uses `VITE_API_URL` for the API base. |
| **Your machine** | Express server (`npm run server`) + ngrok. Set `ALLOWED_ORIGINS` to your Vercel URL. |

After each deploy on Vercel, the client keeps using the same `VITE_API_URL` (your ngrok URL). As long as the server is running and ngrok is up, the game will work.
