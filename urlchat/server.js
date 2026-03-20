import { createServer } from "http";
import express from "express";
import { ExpressPeerServer } from "peer";
import { WebSocketServer } from "ws";
import { parse } from "url";

const port = process.env.PORT || 9000;

const app = express();
const server = createServer(app);

// ── Notification WebSocket server ─────────────────────────
// In-memory map of handle → WebSocket connection (no disk storage)
const handles = new Map(); // handle → ws

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, handle) => {
  handles.set(handle, ws);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "ping") {
      // { type: "ping", to: "TARGET-HANDLE", from: "SENDER-HANDLE", room: "ROOMCODE" }
      const target = handles.get(msg.to);
      if (target && target.readyState === ws.OPEN) {
        target.send(
          JSON.stringify({ type: "ping", from: msg.from, room: msg.room }),
        );
      }
    } else if (msg.type === "status") {
      // { type: "status", handles: ["HANDLE1", "HANDLE2", ...] }
      const online = (msg.handles || []).filter((h) => {
        const c = handles.get(h);
        return c && c.readyState === ws.OPEN;
      });
      ws.send(JSON.stringify({ type: "status", online }));
    }
  });

  ws.on("close", () => handles.delete(handle));
  ws.on("error", () => handles.delete(handle));
});

// IMPORTANT: register our upgrade handler BEFORE app.use("/peerjs", ...)
// so that /notify is claimed before PeerJS's own upgrade listener runs.
// If PeerJS's listener sees /notify first, it sends a 400 and destroys
// the socket, preventing our handler from ever firing.
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
  }
  // All other upgrade paths (PeerJS) are handled by ExpressPeerServer's listener
});

// ── PeerJS ────────────────────────────────────────────────
// Mount AFTER the notify upgrade handler is registered so PeerJS's
// listener (added on "mount") is in position #2 in the event queue.
const peerServer = ExpressPeerServer(server, { path: "/" });
app.use("/peerjs", peerServer);

server.listen(port, () => {
  console.log(`PeerJS + notification server running on port ${port}`);
});
