import { useState, useRef } from "react";
import PulsarLogo from "./PulsarLogo";
import styles from "../App.module.css";

export default function Lobby({ onCreate, onJoin, initialCode }) {
  const [code, setCode] = useState(initialCode || "");
  const infoRef = useRef(null);

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length >= 4) onJoin(trimmed);
  }

  function scrollToInfo() {
    infoRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className={styles.lobby}>
      {/* ── Hero ──────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.pulsarLogoWrap}>
          <PulsarLogo size={250} />
        </div>
        <div className={styles.logo}>
          pulsar<span>chat</span>
        </div>
        <div className={styles.tagline}>
          encrypted peer-to-peer chat · no accounts · no logs · no trace
        </div>

        <div className={styles.cardRow}>
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

          <div className={styles.card}>
            <h2>Join a room</h2>
            <p>Enter the code you received</p>
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

        <button className={styles.learnMore} onClick={scrollToInfo}>
          how does it work?
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* ── Info sections ─────────────────────────────── */}
      <div className={styles.infoSections} ref={infoRef}>
        {/* How it works */}
        <div className={styles.infoBlock}>
          <div className={styles.infoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className={styles.infoTitle}>How it works</h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNum}>1</span>
              <div>
                <strong>Create a room</strong>
                <p>
                  You get a short code. Share it with the person you want to
                  talk to.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <div>
                <strong>They join</strong>
                <p>
                  Your browsers connect directly to each other — peer to peer.
                  No server in between.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <div>
                <strong>Chat privately</strong>
                <p>
                  Messages are encrypted end-to-end and exist only in your
                  browser's memory. Close the tab and they're gone forever.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className={styles.infoBlock}>
          <div className={styles.infoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M7 11V7a5 5 0 0110 0v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h3 className={styles.infoTitle}>Is it secure?</h3>
          <div className={styles.securityGrid}>
            <div className={styles.securityItem}>
              <strong>End-to-end encrypted</strong>
              <p>
                Every message is encrypted with AES-256-GCM. Keys are derived
                via ECDH and never leave your browser.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>No server storage</strong>
              <p>
                Our server only helps browsers find each other. It never sees
                your messages, keys, or content.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>Ephemeral by design</strong>
              <p>
                Nothing is saved to disk. No database, no logs, no message
                history. When you close the tab, it's over.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>Open architecture</strong>
              <p>
                WebRTC peer-to-peer connection with DTLS transport encryption as
                a baseline, plus our own E2EE layer on top.
              </p>
            </div>
          </div>
        </div>

        {/* The tab title feature */}
        <div className={styles.infoBlock}>
          <div className={styles.infoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="2"
                y="4"
                width="20"
                height="16"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M6 9h12M6 13h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className={styles.infoTitle}>The tab title trick</h3>
          <p className={styles.infoDesc}>
            When someone types, their message scrolls live in your browser tab
            title. You can see what they're writing without even switching tabs
            — perfect for discreet conversations at work.
          </p>
        </div>

        <div className={styles.footer}>
          pulsarchat &middot; made by //tedDev
        </div>
      </div>
    </div>
  );
}
