# urlchat

Real-time peer-to-peer chat through the URL bar. No server. Single room per session.

## Setup

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## How it works

1. Click **Create room** — you get a 6-char code and a shareable link like `http://localhost:5173?room=X23GPF`
2. Send that link to your colleague (they must be on the same network, or you can expose it with something like `ngrok`)
3. They open it → you're instantly connected peer-to-peer via WebRTC
4. As either of you types, the other sees it live before you hit send

## Sharing with a colleague not on your local network

Your `localhost` URL won't work from another machine. Easiest options:

**Option A — ngrok (free, one command):**
```bash
npx ngrok http 5173
```
Share the `https://xxxx.ngrok.io` URL they give you.

**Option B — Vite's --host flag:**
```bash
npm run dev -- --host
```
This exposes `http://YOUR_LOCAL_IP:5173` — works if you're on the same Wi-Fi.

**Option C — Deploy to Netlify/Vercel:**
Just `npm run build` and drag the `dist/` folder to netlify.com/drop — free and permanent.
