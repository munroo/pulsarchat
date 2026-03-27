import { useEffect, useRef, useState } from "react";
import { compressImage } from "../utils/image";
import { playNotificationSound } from "../utils/sound";
import EMOJI from "../utils/emoji";
import { useSavedChat } from "../hooks/useSavedChat";
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
              <button key={emoji} className={styles.emojiBtn} onClick={() => onPick(emoji)}>
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

function Avatar({ src, name, size = 32 }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      className={styles.conversationAvatar}
      style={{ width: size, height: size, fontSize: size * 0.42, flexShrink: 0 }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
    </div>
  );
}

function DeliveryIcon({ status }) {
  if (status === "queued" || status === "sending") {
    return (
      <span className={styles.deliveryStatus} title={status}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" />
          <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className={styles.deliveryStatus} title="sent">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M1 4l3 3 7-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className={`${styles.deliveryStatus} ${styles.deliveryStatusDelivered}`} title="delivered">
        <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
          <path d="M1 4l3 3 7-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 4l3 3 7-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (status === "failed") {
    return <span className={styles.deliveryStatus} title="failed">!</span>;
  }

  return null;
}

function statusLabel(status, peerName) {
  switch (status) {
    case "loading":
    case "connecting":
      return "connecting…";
    case "waiting":
      return `waiting for ${peerName}…`;
    case "connected":
      return "online";
    case "disconnected":
      return "offline";
    default:
      return "";
  }
}

export default function SavedChat({
  contact,
  session,
  onBack,
  onToast,
  settings,
  onOpenSettings,
  onConversationChanged,
  onMessageActivity,
}) {
  const {
    status,
    peerProfile,
    peerTyping,
    messages,
    hasMore,
    sendMessage,
    sendImage,
    sendTyping,
    clearTyping,
    loadMore,
  } = useSavedChat({
    contactHandle: contact.handle,
    contactNickname: contact.nickname,
    session,
    onConversationChanged,
    onMessageActivity,
  });

  const [inputValue, setInputValue] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const settingsRef = useRef(settings);
  const prevIncomingCountRef = useRef(0);
  const prevMessageCountRef = useRef(0);
  const hasMeasuredIncomingRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
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

  useEffect(() => {
    const incomingCount = messages.filter((message) => message.type === "theirs").length;
    if (
      hasMeasuredIncomingRef.current &&
      incomingCount > prevIncomingCountRef.current &&
      settingsRef.current?.sounds
    ) {
      playNotificationSound();
    }
    prevIncomingCountRef.current = incomingCount;
    hasMeasuredIncomingRef.current = true;
  }, [messages]);

  async function handleInput(event) {
    const value = event.target.value;
    setInputValue(value);
    if (value) await sendTyping(value);
    else clearTyping();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  async function handleSend() {
    if (pendingImage) {
      await handleSendImage();
      return;
    }

    const text = inputValue.trim();
    if (!text) return;

    clearTyping();
    await sendMessage(
      text,
      replyTarget ? { id: replyTarget.id, text: replyTarget.text } : null,
    );
    setInputValue("");
    setReplyTarget(null);
  }

  async function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    try {
      const dataUrl = await compressImage(file);
      setPendingImage({ dataUrl, name: file.name });
    } catch {
      onToast?.("\u26a0 could not process that image");
    }
  }

  async function handleSendImage() {
    if (!pendingImage) return;
    await sendImage(pendingImage.dataUrl);
    setPendingImage(null);
  }

  function handleEmojiPick(emoji) {
    setInputValue((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  function handleReply(message) {
    setReplyTarget({
      id: message.id,
      text: message.image ? "" : message.text,
      image: message.image,
    });
    setHoveredMessageId(null);
    inputRef.current?.focus();
  }

  const peerName = peerProfile?.displayName || contact.nickname || contact.handle;

  return (
    <main className={`${styles.chatWrap} ${settings?.compact ? styles.compact : ""}`}>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <div className={styles.chatHeader}>
        <button className={styles.backBtn} onClick={onBack} title="back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 2L4 8l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Avatar src={peerProfile?.avatar} name={peerName} size={28} />
        <div className={styles.savedChatHeaderInfo}>
          <div className={styles.chatTitle}>{peerName}</div>
          <div className={styles.savedChatStatus}>
            <span className={`${styles.statusDot} ${status === "connected" ? styles.statusDotOnline : ""}`} />
            {peerTyping ? "typing…" : statusLabel(status, peerName)}
          </div>
        </div>
        <button className={styles.iconBtn} onClick={() => onOpenSettings?.(null)} title="settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={styles.messages}>
        {hasMore && (
          <button className={styles.loadMore} onClick={loadMore}>
            load older messages
          </button>
        )}

        {messages.map((message, index) => {
          if (message.type === "sys") {
            return <div key={message.id || index} className={styles.sysMsg}>{message.text}</div>;
          }

          const isMine = message.type === "mine";
          const nextMessage = messages[index + 1];
          const isGroupEnd =
            !nextMessage ||
            nextMessage.type !== message.type ||
            nextMessage.time !== message.time;
          const isHovered = hoveredMessageId === message.id;
          const isQueued = ["queued", "sending"].includes(message.status);

          return (
            <div
              key={message.id || index}
              data-msgid={message.id}
              className={`${styles.msg} ${isMine ? styles.mine : styles.theirs}${isQueued ? ` ${styles.messageQueue}` : ""}`}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              onClick={() => setHoveredMessageId((prev) => (prev === message.id ? null : message.id))}
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
                      <path d="M1 5l3.5-3v1.8C8 3.8 10 5 10 8c-.8-2-2.5-2.8-5.5-2.8V7L1 5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
                    </svg>
                  </button>
                )}
                {message.replyTo && (
                  <div className={styles.replyQuote}>
                    {message.replyTo.text
                      ? message.replyTo.text.slice(0, 80) + (message.replyTo.text.length > 80 ? "\u2026" : "")
                      : "\uD83D\uDCF7 image"}
                  </div>
                )}
                {message.image ? (
                  <div className={styles.imgBubble} onClick={() => setLightboxSrc(message.image)}>
                    <img src={message.image} alt="shared" />
                  </div>
                ) : (
                  <div className={styles.bubble}>{message.text}</div>
                )}
              </div>
              {isGroupEnd && (
                <div className={styles.msgMeta}>
                  {settings?.timestamps && <span className={styles.msgTime}>{message.time}</span>}
                  {isMine && <DeliveryIcon status={message.status} />}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {replyTarget && (
        <div className={styles.replyPreview}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: "var(--accent)" }}>
            <path d="M1 5l3.5-3v1.8C8 3.8 10 5 10 8c-.8-2-2.5-2.8-5.5-2.8V7L1 5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
          </svg>
          <span className={styles.replyPreviewText}>
            {replyTarget.image ? "\uD83D\uDCF7 image" : replyTarget.text.slice(0, 60) + (replyTarget.text.length > 60 ? "\u2026" : "")}
          </span>
          <button className={styles.imagePreviewCancel} onClick={() => setReplyTarget(null)}>&times;</button>
        </div>
      )}

      {pendingImage && (
        <div className={styles.imagePreview}>
          <img src={pendingImage.dataUrl} alt="preview" />
          <div className={styles.imagePreviewInfo}>{pendingImage.name} &middot; press send or enter</div>
          <button className={styles.imagePreviewCancel} onClick={() => setPendingImage(null)}>&times;</button>
        </div>
      )}

      <div className={styles.inputRow}>
        <div className={styles.emojiPickerWrap}>
          <button className={styles.iconBtn} onClick={() => setShowEmoji((value) => !value)} title="emoji">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="6.5" cy="7.5" r="1" fill="currentColor" />
              <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
              <path d="M6 11.5c.8 1.2 2.2 1.8 3 1.8s2.2-.6 3-1.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none" />
            </svg>
          </button>
          {showEmoji && <EmojiPicker onPick={handleEmojiPick} onClose={() => setShowEmoji(false)} />}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleImageSelect} />
        <button className={styles.iconBtn} onClick={() => fileInputRef.current?.click()} title="send image">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1" />
            <path d="M2 13l4-4 3 3 2-2 5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        <button className={styles.iconBtn} onClick={() => cameraInputRef.current?.click()} title="take photo">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.8 3h4.4l1.5 2H16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1h3.3L6.8 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>

        <textarea
          ref={inputRef}
          className={styles.msgInput}
          placeholder="Type here…"
          rows={1}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
        />

        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!inputValue.trim() && !pendingImage}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </main>
  );
}
