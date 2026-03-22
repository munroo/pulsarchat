import { useState, useRef } from "react";
import PulsarLogo from "./PulsarLogo";
import styles from "../App.module.css";

export default function Lobby({
  onCreate,
  onJoin,
  onContacts,
  onLegal,
  onFeedback,
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
    <div className={styles.lobby}>
      {/* ── Hero ──────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.pulsarLogoWrap}>
          <PulsarLogo size={250} />
        </div>
        <h1 className={styles.logo}>
          Pulsar<span>chat</span>
        </h1>
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
                <strong>Create a room, get a code</strong>
                <p>
                  One person creates a room and receives a 6-character code. The
                  signaling server (PeerJS) helps the two browsers discover each
                  other — this is the only moment a server is involved.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <div>
                <strong>Direct peer-to-peer connection</strong>
                <p>
                  A WebRTC connection is established directly between the two
                  browsers. From this point, no server relays your data — it
                  travels browser-to-browser only.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <div>
                <strong>ECDH key exchange</strong>
                <p>
                  Both browsers generate a fresh, random key pair (P-256 curve).
                  They swap public keys and derive a shared AES-256-GCM
                  encryption key. This key exists only in browser memory — never
                  stored, never transmitted whole.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>4</span>
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
              <span className={styles.stepNum}>5</span>
              <div>
                <strong>Close the tab, it's gone</strong>
                <p>
                  When you close the tab, the encryption keys and all messages
                  are garbage collected from RAM. Nothing is written to disk, no
                  database, no logs. The conversation ceases to exist.
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
          <h2 className={styles.infoTitle}>The tab title trick</h2>
          <p className={styles.infoDesc}>
            When someone types, their message scrolls live in your browser tab
            title. You can see what they&apos;re writing without even switching
            tabs — perfect for discreet conversations at work.
          </p>
        </section>

        <div className={styles.footer}>
          pulsarchat &middot; made by //tedDev &middot;{" "}
          <button className={styles.legalLink} onClick={onLegal}>
            terms &amp; privacy
          </button>
        </div>
      </div>
      <button
        className={styles.floatingFeedback}
        onClick={onFeedback}
        title="send feedback"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M14 1H2a1 1 0 00-1 1v8a1 1 0 001 1h2v3l3-3h7a1 1 0 001-1V2a1 1 0 00-1-1z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
