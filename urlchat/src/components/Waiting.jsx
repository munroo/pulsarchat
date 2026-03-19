import styles from "../App.module.css";

export default function Waiting({ roomCode, onBack, onToast, loading }) {
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
        pulsar<span>chat</span>
      </div>
      <div className={styles.tagline}>waiting for your peer…</div>

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
