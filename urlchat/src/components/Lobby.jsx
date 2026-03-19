import { useState } from "react";
import styles from "../App.module.css";

export default function Lobby({ onCreate, onJoin, initialCode }) {
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
      <div className={styles.tagline}>peer-to-peer · encrypted · no server</div>

      <div className={styles.card}>
        <h2>Start a room</h2>
        <p>Get a code and share it with someone</p>
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
        <p>Enter the code you got</p>
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
