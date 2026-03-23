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
const pushTokens = new Map();
const wss = new WebSocketServer({ noServer: true });

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

  ws.on("message", (raw) => {
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
        console.log("[ping] relayed");
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
        } else {
          console.log("[ping] target offline, no push token");
        }
      }
    } else if (msg.type === "register-push-token") {
      if (msg.token && handle) {
        pushTokens.set(handle, msg.token);
        console.log("[push] token registered");
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
    console.log(`[notify] disconnected (total: ${handles.size})`);
  });

  ws.on("error", () => {
    handles.delete(handle);
  });
});

// ── Single upgrade handler — we control all WebSocket upgrades ──
server.on("upgrade", (req, socket, head) => {
  const { pathname, query } = parse(req.url, true);

  if (pathname === "/notify") {
    const handle = query.handle;
    if (!handle) {
      socket.destroy();
      return;
    }
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
  res.json({ activeUsers: handles.size });
});

server.listen(port, () => {
  console.log(`PeerJS + notification server running on port ${port}`);
});
