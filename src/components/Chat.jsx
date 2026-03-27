import { useEffect, useRef, useState } from "react";
import { resetTitle } from "../utils/notify";
import EMOJI from "../utils/emoji";
import { useGhostChatSession } from "../hooks/useGhostChatSession";
import styles from "../App.module.css";

function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div className={styles.emojiPicker} ref={ref}>
      {EMOJI.map((category) => (
        <div key={category.name}>
          <div className={styles.emojiCategory}>{category.name}</div>
          <div className={styles.emojiGrid}>
            {category.emojis.map((emoji) => (
              <button
                key={emoji}
                className={styles.emojiBtn}
                onClick={() => onPick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className={styles.lightbox} onClick={onClose}>
      <img src={src} alt="full size" />
    </div>
  );
}

export default function Chat({
  roomCode,
  conn,
  sharedKey,
  onLeave,
  settings,
  onOpenSettings,
}) {
  const {
    state: {
      messages,
      inputValue,
      disconnected,
      peerTyping,
      pendingImage,
      replyTarget,
      fingerprint,
    },
    actions: {
      updateInput,
      queueImage,
      sendCurrentMessage,
      selectReplyTarget,
      clearReplyTarget,
      setPendingImage,
    },
  } = useGhostChatSession({
    conn,
    sharedKey,
    settings,
  });

  const [showEmoji, setShowEmoji] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!hoveredMessageId) return;

    function handleTouch(event) {
      if (event.target.closest(`[data-msgid="${hoveredMessageId}"]`)) return;
      setHoveredMessageId(null);
    }

    document.addEventListener("touchstart", handleTouch);
    return () => document.removeEventListener("touchstart", handleTouch);
  }, [hoveredMessageId]);

  async function handleInput(event) {
    await updateInput(event.target.value);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendCurrentMessage();
    }
  }

  async function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";
    await queueImage(file);
  }

  function handleEmojiPick(emoji) {
    updateInput(`${inputValue}${emoji}`);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  function handleReply(message) {
    selectReplyTarget(message);
    setHoveredMessageId(null);
    inputRef.current?.focus();
  }

  function handleMessageClick(messageId) {
    setHoveredMessageId((current) =>
      current === messageId ? null : messageId,
    );
  }

  function handleLeave() {
    resetTitle();
    onLeave();
  }

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
              : undefined
          }
        />
        <div className={styles.chatTitle}>
          {disconnected
            ? "disconnected"
            : peerTyping
              ? "peer is typing…"
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

      <div className={styles.messages}>
        {messages.map((message, index) => {
          if (message.type === "sys") {
            return (
              <div key={message.id} className={styles.sysMsg}>
                {message.text}
              </div>
            );
          }

          const isMine = message.type === "mine";
          const nextMessage = messages[index + 1];
          const isGroupEnd =
            !nextMessage ||
            nextMessage.type !== message.type ||
            nextMessage.time !== message.time;
          const isHovered = hoveredMessageId === message.id;

          return (
            <div
              key={message.id}
              data-msgid={message.id}
              className={`${styles.msg} ${isMine ? styles.mine : styles.theirs}${message.fadingOut ? ` ${styles.fadingOut}` : ""}`}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              onClick={() => handleMessageClick(message.id)}
            >
              <div className={styles.msgBubbleWrap}>
                {isHovered && (
                  <button
                    className={styles.replyBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleReply(message);
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
                {message.replyTo && (
                  <div className={styles.replyQuote}>
                    {message.replyTo.text
                      ? `${message.replyTo.text.slice(0, 80)}${message.replyTo.text.length > 80 ? "…" : ""}`
                      : "📷 image"}
                  </div>
                )}
                {message.image ? (
                  <div
                    className={styles.imgBubble}
                    onClick={() => setLightboxSrc(message.image)}
                  >
                    <img src={message.image} alt="shared" />
                  </div>
                ) : (
                  <div className={styles.bubble}>{message.text}</div>
                )}
              </div>
              {isGroupEnd && settings.timestamps && (
                <div className={styles.msgTime}>{message.time}</div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

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
              ? "📷 image"
              : `${replyTarget.text.slice(0, 60)}${replyTarget.text.length > 60 ? "…" : ""}`}
          </span>
          <button
            className={styles.imagePreviewCancel}
            onClick={clearReplyTarget}
          >
            &times;
          </button>
        </div>
      )}

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

      <div className={styles.inputRow}>
        <div className={styles.emojiPickerWrap}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowEmoji((value) => !value)}
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
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disconnected}
        />

        <button
          className={styles.sendBtn}
          onClick={sendCurrentMessage}
          disabled={disconnected || (!inputValue.trim() && !pendingImage)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </main>
  );
}
