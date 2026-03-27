import { useState, useRef } from "react";
import styles from "../App.module.css";

export default function Lobby({
  onCreate,
  onJoin,
  onContacts,
  onSavedMode,
  onLegal,
  onOpenSettings,
  initialCode,
}) {
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
    <main className={styles.lobby}>
      {/* ── Hero ──────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.pulsarLogoWrap}>
          <img src="/logo.svg" width="200" alt="" fetchpriority="high" />
        </div>
        <h1 className={styles.logo}>
          Pulsar<span>chat</span>
        </h1>
        <div className={styles.tagline}>
          encrypted peer-to-peer chat · no accounts · no logs · no trace
        </div>

        <a
          href="https://github.com/munroo/pulsarchat"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.openSourceBadge}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          open source
        </a>

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

        <div className={styles.heroQuickActions}>
          <button className={styles.contactsBtn} onClick={onContacts}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            contacts
          </button>
          <button className={styles.savedModeBtn} onClick={onSavedMode}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4h10a2 2 0 012 2v12l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            saved chats
          </button>
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
        {/* How pulsarchat works */}
        <section className={styles.infoBlock}>
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
          <h2 className={styles.infoTitle}>How pulsarchat works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNum}>1</span>
              <div>
                <strong>Choose ghost mode or saved chats</strong>
                <p>
                  Ghost mode is the original room-code flow: anonymous,
                  temporary, and history-free. Saved chats keep conversation
                  history only on your device, with no cloud inbox and no
                  server-side message storage.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <div>
                <strong>The server only helps peers find each other</strong>
                <p>
                  In ghost mode, one person creates a room and shares a short
                  code. In saved mode, a contact ping can wake the other side.
                  The signaling layer helps the two devices discover each other,
                  then gets out of the way.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <div>
                <strong>WebRTC connects the two devices directly</strong>
                <p>
                  Once discovery is done, chat traffic moves over a direct
                  peer-to-peer WebRTC data channel. Message content is not
                  relayed through a central chat server.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>4</span>
              <div>
                <strong>Fresh session keys are negotiated per connection</strong>
                <p>
                  Both browsers generate a fresh, random key pair (P-256 curve).
                  They swap public keys and derive a shared AES-256-GCM
                  encryption key. This key exists only in browser memory — never
                  stored, never transmitted whole.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>5</span>
              <div>
                <strong>Everything is encrypted</strong>
                <p>
                  Every message, image, and typing indicator is encrypted with
                  AES-256-GCM before being sent. The recipient decrypts it
                  locally. Nobody in between — not us, not your ISP, not the
                  signaling server — can read the content.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>6</span>
              <div>
                <strong>Persistence stays local</strong>
                <p>
                  Ghost chats disappear when the session ends. Saved chats write
                  history only to your local browser storage, so clearing browser
                  data or switching devices removes that history by design.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Is it really encrypted? */}
        <section className={styles.infoBlock}>
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
          <h2 className={styles.infoTitle}>Is it really encrypted?</h2>
          <div className={styles.securityGrid}>
            <div className={styles.securityItem}>
              <strong>Same primitives as Signal</strong>
              <p>
                We use ECDH P-256 for key exchange and AES-256-GCM for message
                encryption — the same cryptographic primitives as Signal and
                WhatsApp.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>Ephemeral keys</strong>
              <p>
                Keys are generated fresh for every session and destroyed when
                you close the tab. Past conversations cannot be decrypted even
                if our server were compromised.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>Server sees nothing</strong>
              <p>
                The signaling server sees only temporary peer IDs to help
                browsers find each other. It never sees message content,
                encryption keys, or room contents.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>Open architecture</strong>
              <p>
                WebRTC with DTLS transport encryption as a baseline, plus our
                own E2EE layer on top. You can verify your connection by
                comparing the security fingerprint shown on both sides.
              </p>
            </div>
          </div>
        </section>

        {/* Contacts & pinging */}
        <section className={styles.infoBlock}>
          <div className={styles.infoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className={styles.infoTitle}>Contacts &amp; pinging</h2>
          <div className={styles.securityGrid}>
            <div className={styles.securityItem}>
              <strong>Anonymous handles</strong>
              <p>
                Your handle (e.g. NOVA-3KF8) is generated randomly and stored
                locally in your browser&apos;s IndexedDB. It&apos;s not linked
                to any name, email, or account.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>Local contact list</strong>
              <p>
                Your contact list lives entirely on your device. Our server
                never sees who you&apos;ve saved or who your contacts are.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>Pings are forwarded, not stored</strong>
              <p>
                When you ping a contact, the notification server relays one
                message: &quot;handle X wants to chat in room Y.&quot; It does
                not store this — it&apos;s forwarded and forgotten.
              </p>
            </div>
            <div className={styles.securityItem}>
              <strong>What the server knows</strong>
              <p>
                The notification server knows that two handles communicated,
                similar to how a phone company knows two numbers called each
                other. It never knows what was said.
              </p>
            </div>
          </div>
        </section>

        {/* The tab title feature */}
        <section className={styles.infoBlock}>
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
          <h2 className={styles.infoTitle}>The tab title indicator</h2>
          <p className={styles.infoDesc}>
            If you enable it, the browser tab shows a generic typing indicator
            when there is live activity. It does not include message text, which
            helps keep typed content out of browser history and tab previews.
          </p>
        </section>

        <div className={styles.footer}>
          pulsarchat &middot; made by //tedDev &middot;{" "}
          <button className={styles.legalLink} onClick={onLegal}>
            terms &amp; privacy
          </button>{" "}
          &middot;{" "}
          <a
            href="https://github.com/munroo/pulsarchat"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
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
    </main>
  );
}
