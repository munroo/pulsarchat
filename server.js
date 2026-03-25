import { createServer } from "http";
import express from "express";
import { ExpressPeerServer } from "peer";
import { WebSocketServer } from "ws";
import { parse } from "url";
import admin from "firebase-admin";

const port = process.env.PORT || 9000;
const app = express();
const server = createServer(app);

// ── PeerJS (uses Express middleware only, no auto-upgrade) ──
const dummyServer = createServer();
const peerServer = ExpressPeerServer(dummyServer, { path: "/", proxied: true });
app.use("/peerjs", peerServer);

// ── Notification WebSocket ──────────────────────────────────
const handles = new Map();
const handleTokens = new Map(); // handle → token (prevents hijacking)
const pushTokens = new Map();
const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });

// ── Origin allowlist ────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://pulsarchat.space",
  "https://www.pulsarchat.space",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

// ── Connection rate limiting ────────────────────────────────
const connectionRates = new Map();
const MAX_CONNECTIONS_PER_MINUTE = 10;

// Initialize Firebase Admin from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("[firebase] initialized");
} else {
  console.warn("[firebase] no service account — push notifications disabled");
}

wss.on("connection", (ws, handle) => {
  handles.set(handle, ws);
  console.log(`[notify] connected (total: ${handles.size})`);

  let msgCount = 0;
  let msgResetTime = Date.now() + 10000;
  const MAX_MESSAGES_PER_10S = 50;

  ws.on("message", (raw) => {
    const now = Date.now();
    if (now > msgResetTime) {
      msgCount = 0;
      msgResetTime = now + 10000;
    }
    msgCount++;
    if (msgCount > MAX_MESSAGES_PER_10S) return;

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "ping") {
      const target = handles.get(msg.to);
      if (target && target.readyState === ws.OPEN) {
        target.send(
          JSON.stringify({ type: "ping", from: msg.from, room: msg.room }),
        );
      } else {
        const pushToken = pushTokens.get(msg.to);
        if (pushToken && admin.apps.length > 0) {
          admin
            .messaging()
            .send({
              token: pushToken,
              notification: {
                title: "pulsarchat",
                body: `${msg.from} wants to chat`,
              },
              data: {
                type: "ping",
                senderHandle: msg.from,
                room: msg.room,
              },
              android: {
                priority: "high",
                notification: {
                  channelId: "pulsarchat_pings",
                  icon: "ic_launcher",
                },
              },
            })
            .then(() => {
              console.log("[push] notification sent");
            })
            .catch((err) => {
              console.error("[push] notification failed:", err.message);
              pushTokens.delete(msg.to);
            });
        }
      }
    } else if (msg.type === "register-push-token") {
      if (msg.token && handle) {
        pushTokens.set(handle, msg.token);
      }
    } else if (msg.type === "status") {
      const online = (msg.handles || []).filter((h) => {
        const c = handles.get(h);
        return c && c.readyState === ws.OPEN;
      });
      ws.send(JSON.stringify({ type: "status", online }));
    }
  });

  ws.on("close", () => {
    handles.delete(handle);
    handleTokens.delete(handle);
    console.log(`[notify] disconnected (total: ${handles.size})`);
  });

  ws.on("error", () => {
    handles.delete(handle);
    handleTokens.delete(handle);
  });
});

// ── Single upgrade handler — we control all WebSocket upgrades ──
server.on("upgrade", (req, socket, head) => {
  const { pathname, query } = parse(req.url, true);

  if (pathname === "/notify") {
    // Origin check (skip in dev when NODE_ENV is explicitly set)
    if (process.env.NODE_ENV !== "development") {
      const origin = req.headers.origin;
      if (origin) {
        const allowed =
          ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) ||
          origin.includes(".vercel.app");
        if (!allowed) {
          socket.destroy();
          return;
        }
      }
    }

    // Require handle and token
    const handle = query.handle;
    const token = query.token;
    if (!handle || !token) {
      socket.destroy();
      return;
    }

    // Token auth: reject if a different token is already registered for this handle
    const existingToken = handleTokens.get(handle);
    if (existingToken && existingToken !== token) {
      socket.destroy();
      return;
    }

    // Per-IP connection rate limit
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    const rate = connectionRates.get(ip) || { count: 0, reset: now + 60000 };
    if (now > rate.reset) {
      rate.count = 0;
      rate.reset = now + 60000;
    }
    rate.count++;
    connectionRates.set(ip, rate);
    if (rate.count > MAX_CONNECTIONS_PER_MINUTE) {
      socket.destroy();
      return;
    }

    handleTokens.set(handle, token);
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, handle);
    });
  } else if (pathname.startsWith("/peerjs")) {
    dummyServer.emit("upgrade", req, socket, head);
  } else {
    socket.destroy();
  }
});

// ── Stats endpoint ──────────────────────────────────────────
app.get("/stats", (req, res) => {
  if (req.query.key !== process.env.STATS_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ activeUsers: handles.size });
});

server.listen(port, () => {
  console.log(`PeerJS + notification server running on port ${port}`);
});
