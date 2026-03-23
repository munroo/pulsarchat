import { useState, useEffect, useRef } from "react";
import { encrypt, decrypt } from "../utils/crypto";
import { clearUrl } from "../utils/url";
import {
  startFlash,
  stopFlash,
  setScrollingTitle,
  resetTitle,
} from "../utils/notify";
import { compressImage } from "../utils/image";
import { handleShare } from "../utils/share";
import { playNotificationSound } from "../utils/sound";
import EMOJI from "../utils/emoji";
import styles from "../App.module.css";

// ── Emoji Picker ───────────────────────────────────────

function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div className={styles.emojiPicker} ref={ref}>
      {EMOJI.map((cat) => (
        <div key={cat.name}>
          <div className={styles.emojiCategory}>{cat.name}</div>
          <div className={styles.emojiGrid}>
            {cat.emojis.map((e) => (
              <button
                key={e}
                className={styles.emojiBtn}
                onClick={() => onPick(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────

function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className={styles.lightbox} onClick={onClose}>
      <img src={src} alt="full size" />
    </div>
  );
}

// ── Chat ───────────────────────────────────────────────

export default function Chat({
  roomCode,
  conn,
  sharedKey,
  onLeave,
  onToast,
  settings,
  setSetting,
  onOpenSettings,
}) {
  const [messages, setMessages] = useState([
    {
      id: 0,
      type: "sys",
      text: "encrypted connection established \u2726 messages are end-to-end encrypted",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [fingerprint, setFingerprint] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const msgIdRef = useRef(1);
  const imgBufferRef = useRef({});

  // Keep a ref so the stable onData/onClose closures can read latest settings
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // ── Scroll to bottom on new messages ───────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onFocus = () => stopFlash();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Clear hovered state when touching outside a message (mobile)
  useEffect(() => {
    if (!hoveredMsgId) return;
    function handleTouch(e) {
      if (e.target.closest(`[data-msgid="${hoveredMsgId}"]`)) return;
      setHoveredMsgId(null);
    }
    document.addEventListener("touchstart", handleTouch);
    return () => document.removeEventListener("touchstart", handleTouch);
  }, [hoveredMsgId]);

  // ── Security fingerprint ───────────────────────────────

  useEffect(() => {
    if (!sharedKey) return;
    (async () => {
      try {
        // Encrypt a known constant with a fixed IV — deterministic for the same
        // shared key, so both peers will compute the same fingerprint.
        const iv = new Uint8Array(12); // all zeros
        const data = new TextEncoder().encode("pulsarchat-fingerprint");
        const ct = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          sharedKey,
          data,
        );
        const hash = await crypto.subtle.digest("SHA-256", ct);
        const bytes = Array.from(new Uint8Array(hash)).slice(0, 16);
        const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
        setFingerprint(hex.match(/.{4}/g).join("-").toUpperCase());
      } catch {}
    })();
  }, [sharedKey]);

  // ── Helpers ────────────────────────────────────────────

  function now() {
    const d = new Date();
    return (
      d.getHours().toString().padStart(2, "0") +
      ":" +
      d.getMinutes().toString().padStart(2, "0")
    );
  }

  function addMsg(type, text, extra = {}) {
    const id = msgIdRef.current++;
    setMessages((prev) => [...prev, { id, type, text, time: now(), ...extra }]);
    return id;
  }

  function scheduleDelete(id) {
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, fadingOut: true } : m)),
      );
    }, 29000);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 30000);
  }

  // ── Incoming data ──────────────────────────────────────

  useEffect(() => {
    if (!conn || !sharedKey) return;

    const onData = async (data) => {
      if (data?.type === "__pubkey") return;

      if (data.type === "typing") {
        try {
          const text = await decrypt(sharedKey, data.payload);
          if (settingsRef.current.tabTitle) setScrollingTitle(text);
        } catch {}
        setPeerTyping(true);
        if (document.hidden) startFlash();
      } else if (data.type === "clear") {
        resetTitle();
        setPeerTyping(false);
        stopFlash();
      } else if (data.type === "message") {
        resetTitle();
        setPeerTyping(false);
        stopFlash();
        try {
          const plaintext = await decrypt(sharedKey, data.payload);
          let msgText = plaintext;
          let replyTo;
          try {
            const parsed = JSON.parse(plaintext);
            if (parsed && typeof parsed.text === "string") {
              msgText = parsed.text;
              replyTo = parsed.replyTo;
            }
          } catch {
            // plain string — backward compat
          }
          const id = addMsg("theirs", msgText, replyTo ? { replyTo } : {});
          if (settingsRef.current.sounds) playNotificationSound();
          if (settingsRef.current.autoDelete) scheduleDelete(id);
        } catch {
          addMsg("sys", "\u26a0 failed to decrypt a message");
        }
      } else if (data.type === "img-start") {
        imgBufferRef.current[data.id] = { total: data.total, chunks: [] };
      } else if (data.type === "img-chunk") {
        const buf = imgBufferRef.current[data.id];
        if (!buf) return;
        try {
          const piece = await decrypt(sharedKey, data.payload);
          buf.chunks[data.index] = piece;
        } catch {
          addMsg("sys", "\u26a0 failed to decrypt image chunk");
        }
      } else if (data.type === "img-end") {
        resetTitle();
        setPeerTyping(false);
        const buf = imgBufferRef.current[data.id];
        if (buf && buf.chunks.length === buf.total) {
          const dataUrl = buf.chunks.join("");
          const id = addMsg("theirs", "", { image: dataUrl });
          if (settingsRef.current.sounds) playNotificationSound();
          if (settingsRef.current.autoDelete) scheduleDelete(id);
        } else {
          addMsg("sys", "\u26a0 incomplete image received");
        }
        delete imgBufferRef.current[data.id];
      }
    };

    const onClose = () => {
      setDisconnected(true);
      addMsg("sys", "peer disconnected");
      resetTitle();
    };

    conn.on("data", onData);
    conn.on("close", onClose);
    return () => {
      conn.off("data", onData);
      conn.off("close", onClose);
    };
  }, [conn, sharedKey]);

  // ── Text input ─────────────────────────────────────────

  async function handleInput(e) {
    const val = e.target.value;
    setInputVal(val);
    if (val) {
      if (settings.tabTitle) setScrollingTitle(val);
    } else {
      resetTitle();
    }
    if (conn?.open && sharedKey) {
      if (val) {
        const payload = await encrypt(sharedKey, val);
        conn.send({ type: "typing", payload });
      } else {
        conn.send({ type: "clear" });
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function sendMessage() {
    if (pendingImage) {
      await sendImage();
      return;
    }

    const text = inputVal.trim();
    if (!text || !conn?.open || !sharedKey) return;

    const msgData = { text };
    if (replyTarget) {
      msgData.replyTo = { id: replyTarget.id, text: replyTarget.text };
    }

    try {
      const payload = await encrypt(sharedKey, JSON.stringify(msgData));
      conn.send({ type: "message", payload });
      conn.send({ type: "clear" });
    } catch {
      return;
    }

    const id = addMsg(
      "mine",
      text,
      replyTarget
        ? { replyTo: { id: replyTarget.id, text: replyTarget.text } }
        : {},
    );
    if (settings.autoDelete) scheduleDelete(id);
    setInputVal("");
    setReplyTarget(null);
    resetTitle();
  }

  // ── Image handling ─────────────────────────────────────

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const dataUrl = await compressImage(file);
      setPendingImage({ dataUrl, name: file.name });
    } catch {
      addMsg("sys", "\u26a0 could not process that image");
    }
  }

  async function sendImage() {
    if (!pendingImage || !conn?.open || !sharedKey) return;

    try {
      const raw = pendingImage.dataUrl;
      const CHUNK = 12000;
      const total = Math.ceil(raw.length / CHUNK);
      const id = Date.now().toString(36);

      conn.send({ type: "img-start", id, total });

      for (let i = 0; i < total; i++) {
        const piece = raw.slice(i * CHUNK, (i + 1) * CHUNK);
        const payload = await encrypt(sharedKey, piece);
        conn.send({ type: "img-chunk", id, index: i, payload });
      }

      conn.send({ type: "img-end", id });
      conn.send({ type: "clear" });
    } catch (err) {
      console.error("Image send failed:", err);
      addMsg("sys", "\u26a0 failed to send image");
      setPendingImage(null);
      return;
    }

    const id = addMsg("mine", "", { image: pendingImage.dataUrl });
    if (settings.autoDelete) scheduleDelete(id);
    setPendingImage(null);
    resetTitle();
  }

  // ── Emoji ──────────────────────────────────────────────

  function handleEmojiPick(emoji) {
    setInputVal((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  // ── Reply ──────────────────────────────────────────────

  function handleReply(msg) {
    setReplyTarget({
      id: msg.id,
      text: msg.image ? "" : msg.text,
      image: msg.image,
    });
    setHoveredMsgId(null);
    inputRef.current?.focus();
  }

  function handleMsgClick(msgId) {
    setHoveredMsgId((prev) => (prev === msgId ? null : msgId));
  }

  // ── Share ──────────────────────────────────────────────

  function shareRoom() {
    handleShare(
      "pulsarchat",
      `Join my encrypted chat room: ${roomCode}`,
      `https://pulsarchat.space/?room=${roomCode}`,
      onToast,
    );
  }

  // ── Leave ──────────────────────────────────────────────

  function handleLeave() {
    resetTitle();
    onLeave();
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <main
      className={`${styles.chatWrap} ${settings.compact ? styles.compact : ""}`}
    >
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <div className={styles.chatHeader}>
        <button
          className={styles.backBtn}
          onClick={handleLeave}
          title="leave room"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 2L4 8l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
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
              ? "peer is typing\u2026"
              : "encrypted"}
        </div>
        <div className={styles.chatRoom}>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{ marginRight: 4, opacity: 0.5 }}
          >
            <rect
              x="1"
              y="3"
              width="8"
              height="6"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M3 3V2a2 2 0 114 0v1"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
          {roomCode}
        </div>
        <button
          className={styles.iconBtn}
          onClick={() => onOpenSettings(fingerprint)}
          title="settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle
              cx="8"
              cy="8"
              r="2"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((msg, i) => {
          if (msg.type === "sys")
            return (
              <div key={msg.id} className={styles.sysMsg}>
                {msg.text}
              </div>
            );

          const isMine = msg.type === "mine";
          const nextMsg = messages[i + 1];
          const isGroupEnd =
            !nextMsg || nextMsg.type !== msg.type || nextMsg.time !== msg.time;
          const isHovered = hoveredMsgId === msg.id;

          return (
            <div
              key={msg.id}
              data-msgid={msg.id}
              className={`${styles.msg} ${isMine ? styles.mine : styles.theirs}${msg.fadingOut ? " " + styles.fadingOut : ""}`}
              onMouseEnter={() => setHoveredMsgId(msg.id)}
              onMouseLeave={() => setHoveredMsgId(null)}
              onClick={() => handleMsgClick(msg.id)}
            >
              <div className={styles.msgBubbleWrap}>
                {isHovered && (
                  <button
                    className={styles.replyBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReply(msg);
                    }}
                    title="reply"
                  >
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M1 5l3.5-3v1.8C8 3.8 10 5 10 8c-.8-2-2.5-2.8-5.5-2.8V7L1 5z"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </button>
                )}
                {msg.replyTo && (
                  <div className={styles.replyQuote}>
                    {msg.replyTo.text
                      ? msg.replyTo.text.slice(0, 80) +
                        (msg.replyTo.text.length > 80 ? "\u2026" : "")
                      : "\uD83D\uDCF7 image"}
                  </div>
                )}
                {msg.image ? (
                  <div
                    className={styles.imgBubble}
                    onClick={() => setLightboxSrc(msg.image)}
                  >
                    <img src={msg.image} alt="shared" />
                  </div>
                ) : (
                  <div className={styles.bubble}>{msg.text}</div>
                )}
              </div>
              {isGroupEnd && settings.timestamps && (
                <div className={styles.msgTime}>{msg.time}</div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview strip */}
      {replyTarget && (
        <div className={styles.replyPreview}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ flexShrink: 0, color: "var(--accent)" }}
          >
            <path
              d="M1 5l3.5-3v1.8C8 3.8 10 5 10 8c-.8-2-2.5-2.8-5.5-2.8V7L1 5z"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className={styles.replyPreviewText}>
            {replyTarget.image
              ? "\uD83D\uDCF7 image"
              : replyTarget.text.slice(0, 60) +
                (replyTarget.text.length > 60 ? "\u2026" : "")}
          </span>
          <button
            className={styles.imagePreviewCancel}
            onClick={() => setReplyTarget(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Image preview strip */}
      {pendingImage && (
        <div className={styles.imagePreview}>
          <img src={pendingImage.dataUrl} alt="preview" />
          <div className={styles.imagePreviewInfo}>
            {pendingImage.name} &middot; press send or enter
          </div>
          <button
            className={styles.imagePreviewCancel}
            onClick={() => setPendingImage(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Input row */}
      <div className={styles.inputRow}>
        <div className={styles.emojiPickerWrap}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowEmoji((s) => !s)}
            disabled={disconnected}
            title="emoji"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle
                cx="9"
                cy="9"
                r="7.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="6.5" cy="7.5" r="1" fill="currentColor" />
              <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
              <path
                d="M6 11.5c.8 1.2 2.2 1.8 3 1.8s2.2-.6 3-1.8"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
          {showEmoji && (
            <EmojiPicker
              onPick={handleEmojiPick}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleImageSelect}
        />
        <button
          className={styles.iconBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={disconnected}
          title="send image from gallery"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect
              x="2"
              y="3"
              width="14"
              height="12"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle
              cx="6.5"
              cy="7.5"
              r="1.5"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M2 13l4-4 3 3 2-2 5 4"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => cameraInputRef.current?.click()}
          disabled={disconnected}
          title="take photo"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M6.8 3h4.4l1.5 2H16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1h3.3L6.8 3z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="9"
              cy="9.5"
              r="2.5"
              stroke="currentColor"
              strokeWidth="1.1"
            />
          </svg>
        </button>

        <textarea
          ref={inputRef}
          className={styles.msgInput}
          placeholder="Type here..."
          rows={1}
          value={inputVal}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disconnected}
        />

        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={disconnected || (!inputVal.trim() && !pendingImage)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </main>
  );
}
