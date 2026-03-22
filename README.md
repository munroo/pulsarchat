# PulsarChat

**Encrypted peer-to-peer chat. No accounts, no servers, no trace.**

![screenshot](screenshot.png)

---

## ✦ Features

- End-to-end encryption (ECDH + AES-256-GCM)
- Peer-to-peer via WebRTC (no central server)
- Live typing in browser tab title
- Emoji support
- Encrypted image sharing
- Contacts with ping-to-chat
- Security fingerprint verification
- Ephemeral messages (no history, no storage)

---

## ✦ Tech Stack

- React + Vite
- PeerJS
- WebRTC
- Web Crypto API

---

## ✦ Run locally

```bash
git clone https://github.com/your-username/pulsarchat.git
cd pulsarchat
npm install
cp .env.example .env
npm run dev
```

---

## ✦ Deploy

**Frontend** — Vercel  
**Server** — Render

See `.env.example` for required environment variables.

---

## ✦ Environment Variables

Copy `.env.example` to `.env` and fill in your values:

- `VITE_SERVER_URL` — WebSocket server URL
- `VITE_TURN_USERNAME` — ExpressTurn username
- `VITE_TURN_CREDENTIAL` — ExpressTurn credential
- `VITE_WEB3FORMS_KEY` — Web3Forms access key

---

## ✦ License

AGPL-3.0 — see [LICENSE](LICENSE)

---

## ✦ Live

**[pulsarchat.space](https://pulsarchat.space)**

Made by //tedDev
