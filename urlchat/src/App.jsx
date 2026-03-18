const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

import React, { useState, useEffect, useRef, useCallback } from "react";
import Peer from "peerjs";
import styles from "./App.module.css";

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function escHtml(t) {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return (
    <div className={`${styles.toast} ${message ? styles.toastShow : ""}`}>
      {message}
    </div>
  );
}

// ─── Lobby ───────────────────────────────────────────────────────────────────
function Lobby({ onCreate, onJoin, initialCode }) {
  const [code, setCode] = useState(initialCode || "");

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length >= 4) onJoin(trimmed);
  }

  return (
    <div className={styles.lobby}>
      <div className={styles.logo}>
        url<span>chat</span>
      </div>
      <div className={styles.tagline}>peer-to-peer · real-time · no server</div>

      <div className={styles.card}>
        <h2>Start a room</h2>
        <p>Get a code and share it with your colleague</p>
        <button className={styles.btn} onClick={onCreate}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Create room
        </button>
      </div>

      <div className={styles.divider}>or join</div>

      <div className={styles.card}>
        <h2>Join a room</h2>
        <p>Enter the code your colleague shared</p>
        <input
          className={styles.codeInput}
          placeholder="enter code"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={handleJoin}
        >
          Join
        </button>
      </div>
    </div>
  );
}

// ─── Waiting ─────────────────────────────────────────────────────────────────
function Waiting({ roomCode, onBack, onToast }) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => onToast("code copied!"));
  }
  function copyUrl() {
    navigator.clipboard.writeText(shareUrl).then(() => onToast("link copied!"));
  }

  return (
    <div className={styles.waiting}>
      <div className={styles.logo}>
        url<span>chat</span>
      </div>
      <div className={styles.tagline}>waiting for your colleague…</div>

      <div className={styles.roomLabel}>your room code</div>
      <div
        className={styles.roomCodeDisplay}
        onClick={copyCode}
        title="click to copy"
      >
        {roomCode}
      </div>
      <div className={styles.copyHint}>
        click code to copy · or share the link below
      </div>

      <div
        className={styles.urlShare}
        onClick={copyUrl}
        title="click to copy link"
      >
        {shareUrl}
      </div>

      <div className={styles.listeningRow}>
        <span className={styles.pulseDot} />
        listening for connection…
      </div>

      <button
        className={`${styles.btn} ${styles.btnGhost}`}
        style={{ marginTop: 32, maxWidth: 200 }}
        onClick={onBack}
      >
        ← back
      </button>
    </div>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function Chat({ roomCode, conn }) {
  const [messages, setMessages] = useState([
    {
      id: 0,
      type: "sys",
      text: "connected ✦  start typing — your colleague sees the url bar change live",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const msgIdRef = useRef(1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update OUR URL bar and tab title as we type
  function pushToUrl(text) {
    const params = new URLSearchParams();
    params.set("room", roomCode);
    if (text) params.set("msg", text);
    window.history.replaceState(null, "", `?${params.toString()}`);
    document.title = text ? text : "urlchat";
  }

  // Listen to peer data — update THEIR URL bar on our end
  useEffect(() => {
    if (!conn) return;

    const onData = (data) => {
      if (data.type === "typing") {
        const params = new URLSearchParams();
        params.set("room", roomCode);
        params.set("msg", data.text);
        window.history.replaceState(null, "", `?${params.toString()}`);
        document.title = data.text;
        setPeerTyping(true);
      } else if (data.type === "clear") {
        const params = new URLSearchParams();
        params.set("room", roomCode);
        window.history.replaceState(null, "", `?${params.toString()}`);
        document.title = "urlchat";
        setPeerTyping(false);
      } else if (data.type === "message") {
        const params = new URLSearchParams();
        params.set("room", roomCode);
        window.history.replaceState(null, "", `?${params.toString()}`);
        document.title = "urlchat";
        setPeerTyping(false);
        const now = new Date();
        const time =
          now.getHours().toString().padStart(2, "0") +
          ":" +
          now.getMinutes().toString().padStart(2, "0");
        setMessages((prev) => [
          ...prev,
          { id: msgIdRef.current++, type: "theirs", text: data.text, time },
        ]);
      }
    };

    const onClose = () => {
      setDisconnected(true);
      setMessages((prev) => [
        ...prev,
        { id: msgIdRef.current++, type: "sys", text: "colleague disconnected" },
      ]);
      const params = new URLSearchParams();
      params.set("room", roomCode);
      window.history.replaceState(null, "", `?${params.toString()}`);
      document.title = "urlchat";
    };

    conn.on("data", onData);
    conn.on("close", onClose);
    return () => {
      conn.off("data", onData);
      conn.off("close", onClose);
    };
  }, [conn, roomCode]);

  function handleInput(e) {
    const val = e.target.value;
    setInputVal(val);
    pushToUrl(val);
    if (conn?.open) {
      conn.send(val ? { type: "typing", text: val } : { type: "clear" });
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function sendMessage() {
    const text = inputVal.trim();
    if (!text || !conn?.open) return;
    conn.send({ type: "message", text });
    conn.send({ type: "clear" });
    const now = new Date();
    const time =
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0");
    setMessages((prev) => [
      ...prev,
      { id: msgIdRef.current++, type: "mine", text, time },
    ]);
    setInputVal("");
    pushToUrl("");
  }

  return (
    <div className={styles.chatWrap}>
      <div className={styles.chatHeader}>
        <div
          className={styles.connectedDot}
          style={
            disconnected
              ? { background: "var(--muted)", boxShadow: "none" }
              : {}
          }
        />
        <div className={styles.chatTitle}>
          {disconnected
            ? "disconnected"
            : peerTyping
              ? "colleague is typing…"
              : "connected"}
        </div>
        <div className={styles.chatRoom}>{roomCode}</div>
      </div>

      <div className={styles.urlBarHint}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect
            x="1"
            y="2"
            width="10"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M3 5h6M3 7h4"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
        watch the url bar
      </div>

      <div className={styles.messages}>
        {messages.map((msg) => {
          if (msg.type === "sys")
            return (
              <div key={msg.id} className={styles.sysMsg}>
                {msg.text}
              </div>
            );
          return (
            <div
              key={msg.id}
              className={`${styles.msg} ${msg.type === "mine" ? styles.mine : styles.theirs}`}
            >
              <div className={styles.bubble}>{msg.text}</div>
              <div className={styles.msgTime}>{msg.time}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputRow}>
        <textarea
          ref={inputRef}
          className={styles.msgInput}
          placeholder="type here — appears in the url bar live…"
          rows={1}
          value={inputVal}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disconnected}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={disconnected || !inputVal.trim()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── App (state machine) ──────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("lobby"); // lobby | waiting | chat
  const [roomCode, setRoomCode] = useState("");
  const [conn, setConn] = useState(null);
  const [toast, setToast] = useState("");
  const peerRef = useRef(null);

  // Parse ?room= on load
  const initialCode =
    new URLSearchParams(window.location.search).get("room")?.toUpperCase() ||
    "";

  useEffect(() => {
    if (initialCode) {
      joinRoom(initialCode);
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function destroyPeer() {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  }

  function createRoom() {
    destroyPeer();
    const code = generateCode();
    setRoomCode(code);
    setScreen("waiting");

    window.history.replaceState(null, "", `?room=${code}`);

    const p = new Peer(code, {
      host: "urlchat.onrender.com",
      path: "/peerjs",
      secure: true,
      config: ICE_CONFIG,
    });
    peerRef.current = p;

    p.on("connection", (c) => {
      setConn(c);
      c.on("open", () => setScreen("chat"));
    });

    p.on("error", (e) => {
      if (e.type === "unavailable-id") {
        destroyPeer();
        setTimeout(createRoom, 100);
      }
    });
  }

  function joinRoom(code) {
    destroyPeer();
    const upperCode = code.toUpperCase();
    setRoomCode(upperCode);
    window.history.replaceState(null, "", `?room=${upperCode}`);

    const p = new Peer(undefined, {
      host: "urlchat.onrender.com",
      path: "/peerjs",
      secure: true,
      config: ICE_CONFIG,
    });
    peerRef.current = p;

    p.on("open", () => {
      const c = p.connect(upperCode, { reliable: true });
      setConn(c);
      c.on("open", () => setScreen("chat"));
      c.on("error", () => showToast("could not reach that room"));
    });

    p.on("error", () => showToast("connection failed"));
  }

  function backToLobby() {
    destroyPeer();
    setConn(null);
    setRoomCode("");
    window.history.replaceState(null, "", window.location.pathname);
    setScreen("lobby");
  }

  return (
    <>
      {screen === "lobby" && (
        <Lobby
          onCreate={createRoom}
          onJoin={joinRoom}
          initialCode={initialCode}
        />
      )}
      {screen === "waiting" && (
        <Waiting roomCode={roomCode} onBack={backToLobby} onToast={showToast} />
      )}
      {screen === "chat" && <Chat roomCode={roomCode} conn={conn} />}
      <Toast message={toast} />
    </>
  );
}
