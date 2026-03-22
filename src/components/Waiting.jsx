import { handleShare } from "../utils/share";
import styles from "../App.module.css";

export default function Waiting({ roomCode, onBack, onToast, loading }) {
  const shareUrl = `https://pulsarchat.space/?room=${roomCode}`;

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
    <div className={styles.waiting}>
      <div className={styles.logo}>
        pulsar<span>chat</span>
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
    </div>
  );
}
