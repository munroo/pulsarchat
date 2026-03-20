import { createServer } from "http";
import express from "express";
import { ExpressPeerServer } from "peer";
import { WebSocketServer } from "ws";
import { parse } from "url";

const port = process.env.PORT || 9000;
const app = express();
const server = createServer(app);

// ── PeerJS (uses Express middleware only, no auto-upgrade) ──
const dummyServer = createServer();
const peerServer = ExpressPeerServer(dummyServer, { path: "/", proxied: true });
app.use("/peerjs", peerServer);

// ── Notification WebSocket ──────────────────────────────────
const handles = new Map();
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, handle) => {
  handles.set(handle, ws);
  console.log(`[+] ${handle} connected (total: ${handles.size})`);

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
        console.log(`[ping] ${msg.from} → ${msg.to} room=${msg.room}`);
      } else {
        console.log(`[ping] ${msg.from} → ${msg.to} (offline)`);
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
    console.log(`[-] ${handle} disconnected (total: ${handles.size})`);
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
    // Forward to PeerJS's internal WebSocket server
    peerServer._wss.handleUpgrade(req, socket, head, (ws) => {
      peerServer._wss.emit("connection", ws, req);
    });
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
