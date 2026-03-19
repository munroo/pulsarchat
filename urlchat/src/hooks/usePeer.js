import { useState, useRef, useCallback } from "react";
import Peer from "peerjs";
import { generateCode } from "../utils/roomCode";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
} from "../utils/crypto";

/**
 * usePeer — manages PeerJS lifecycle, ICE config, and E2EE handshake.
 *
 * Returns:
 *  { screen, roomCode, conn, sharedKey, actions }
 *
 * `sharedKey` is a CryptoKey (AES-GCM) derived after ECDH handshake.
 * It's null until the handshake completes; Chat should wait for it.
 */

async function fetchIceServers() {
  const res = await fetch(
    "https://urlchat.metered.live/api/v1/turn/credentials?apiKey=3469457bbe4c62c6be926899c183c26a8a7d",
  );
  return res.json();
}

async function wakeServer() {
  await fetch("https://urlchat.onrender.com/peerjs").catch(() => {});
}

function makePeer(id, iceServers) {
  return new Peer(id, {
    host: "urlchat.onrender.com",
    path: "/peerjs",
    secure: true,
    config: { iceServers },
    pingInterval: 5000,
  });
}

// ── E2EE handshake over data channel ───────────────────

function performHandshake(conn, setSharedKey) {
  if (!crypto?.subtle) {
    return Promise.reject(
      new Error(
        "E2EE requires HTTPS or localhost — current origin is insecure",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    let remotePubArray = null;
    let localKeyPair = null;
    let localPubExported = null;
    let retryTimer = null;

    // 1. Register listener FIRST — before any async work
    const onData = (data) => {
      if (data?.type === "__pubkey") {
        conn.off("data", onData);
        remotePubArray = data.key;
        tryDerive();
      }
    };
    conn.on("data", onData);

    // 2. Generate keys (async), then send ours
    generateKeyPair()
      .then(async (kp) => {
        localKeyPair = kp;
        localPubExported = await exportPublicKey(kp.publicKey);
        conn.send({ type: "__pubkey", key: localPubExported });
        retryTimer = setInterval(() => {
          if (!resolved && conn.open) {
            conn.send({ type: "__pubkey", key: localPubExported });
          }
        }, 500);
        tryDerive();
      })
      .catch(reject);

    // 3. Derive shared key once we have BOTH sides
    function tryDerive() {
      if (resolved || !remotePubArray || !localKeyPair) return;
      resolved = true;
      if (retryTimer) clearInterval(retryTimer);
      importPublicKey(remotePubArray)
        .then((remotePub) =>
          deriveSharedKey(localKeyPair.privateKey, remotePub),
        )
        .then((key) => {
          setSharedKey(key);
          resolve(key);
        })
        .catch(reject);
    }

    // 4. Timeout safety
    setTimeout(() => {
      if (!resolved) {
        if (retryTimer) clearInterval(retryTimer);
        conn.off("data", onData);
        reject(new Error("E2EE handshake timed out"));
      }
    }, 15000);
  });
}

// ── Hook ───────────────────────────────────────────────

export function usePeer() {
  const [screen, setScreen] = useState("lobby"); // lobby | waiting | chat
  const [roomCode, setRoomCode] = useState("");
  const [conn, setConn] = useState(null);
  const [sharedKey, setSharedKey] = useState(null);
  const [toast, setToast] = useState("");
  const peerRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function destroyPeer() {
    peerRef.current?.destroy();
    peerRef.current = null;
  }

  // ── Create room (host) ────────────────────────────────

  const createRoom = useCallback(async () => {
    destroyPeer();
    const code = generateCode();
    setRoomCode(code);
    setScreen("waiting");
    window.history.replaceState(null, "", `?room=${code}`);

    await wakeServer();

    let iceServers = [];
    try {
      iceServers = await fetchIceServers();
    } catch {
      iceServers = [];
    }

    const p = makePeer(code, iceServers);
    peerRef.current = p;

    p.on("connection", (c) => {
      setConn(c);
      c.on("open", () => {
        performHandshake(c, setSharedKey)
          .then(() => setScreen("chat"))
          .catch((err) => {
            console.error("Handshake failed (host):", err);
            showToast(err.message || "encryption handshake failed");
          });
      });
    });

    p.on("error", (e) => {
      if (e.type === "unavailable-id") {
        destroyPeer();
        setTimeout(createRoom, 100);
      }
    });
  }, []);

  // ── Join room (guest) ─────────────────────────────────

  const joinRoom = useCallback(async (code) => {
    destroyPeer();
    const upper = code.toUpperCase();
    setRoomCode(upper);
    setScreen("waiting");
    window.history.replaceState(null, "", `?room=${upper}`);

    await wakeServer();

    let iceServers = [];
    try {
      iceServers = await fetchIceServers();
    } catch {
      iceServers = [];
    }

    const p = makePeer(undefined, iceServers);
    peerRef.current = p;

    p.on("open", () => {
      const c = p.connect(upper, { reliable: true });
      setConn(c);

      c.on("open", () => {
        performHandshake(c, setSharedKey)
          .then(() => setScreen("chat"))
          .catch((err) => {
            console.error("Handshake failed (guest):", err);
            showToast(err.message || "encryption handshake failed");
            setScreen("lobby");
          });
      });

      c.on("error", () => {
        showToast("could not reach that room");
        setScreen("lobby");
      });
    });

    p.on("error", () => {
      showToast("connection failed");
      setScreen("lobby");
    });
  }, []);

  // ── Back to lobby ─────────────────────────────────────

  const backToLobby = useCallback(() => {
    destroyPeer();
    setConn(null);
    setSharedKey(null);
    setRoomCode("");
    window.history.replaceState(null, "", window.location.pathname);
    setScreen("lobby");
  }, []);

  return {
    screen,
    roomCode,
    conn,
    sharedKey,
    toast,
    actions: { createRoom, joinRoom, backToLobby, showToast },
  };
}
