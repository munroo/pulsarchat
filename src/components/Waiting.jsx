import { handleShare } from "../utils/share";
import styles from "../App.module.css";

export default function Waiting({
  roomCode,
  onBack,
  onToast,
  loading,
  onOpenSettings,
}) {
  const shareUrl = `${import.meta.env.VITE_APP_URL ?? ""}https://www.pulsarchat.space/?room=${roomCode}`;

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => onToast("code copied!"));
  }

  function copyUrl() {
    navigator.clipboard.writeText(shareUrl).then(() => onToast("link copied!"));
  }

  function shareRoom() {
    handleShare(
      "pulsarchat",
      `Join my encrypted chat room: ${roomCode}`,
      shareUrl,
      onToast,
    );
  }

  return (
    <main className={styles.waiting}>
      <button
        className={styles.floatingSettings}
        onClick={onOpenSettings}
        title="settings"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className={styles.logo}>
        Pulsar<span>chat</span>
      </div>
      <div className={styles.tagline}>waiting for your peer…</div>

      <div className={styles.roomLabel}>your room code</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          className={styles.roomCodeDisplay}
          onClick={copyCode}
          title="click to copy"
        >
          {roomCode}
        </div>
        <button
          className={styles.iconBtn}
          onClick={shareRoom}
          title="share room"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 2v9M6.5 4.5L9 2l2.5 2.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 11v5h12v-5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
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
        {loading || "listening for connection…"}
      </div>

      <button
        className={`${styles.btn} ${styles.btnGhost}`}
        style={{ marginTop: 32, maxWidth: 200 }}
        onClick={onBack}
      >
        ← back
      </button>
    </main>
  );
}
