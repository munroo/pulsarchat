import styles from "../App.module.css";

export default function Legal({ onBack }) {
  return (
    <div className={styles.legalWrap}>
      <div className={styles.legalInner}>
        <div className={styles.legalHeader}>
          <button className={styles.backBtn} onClick={onBack} title="back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 2L4 8l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className={styles.legalHeaderTitle}>Terms &amp; Privacy</span>
        </div>

        <div className={styles.legalContent}>
          <section className={styles.legalSection}>
            <h2 className={styles.legalSectionTitle}>Terms of Service</h2>
            <p>pulsarchat is provided as-is, without warranty of any kind, express or implied. Your use of the service is at your own risk.</p>
            <p>Users must not use pulsarchat for any illegal purposes, including but not limited to harassment, distribution of illegal content, or violation of applicable laws.</p>
            <p>We reserve the right to terminate access to the service at any time, for any reason, without notice.</p>
            <p>We accept no liability for damages or data loss arising from use of this service. In no event shall we be liable for any indirect, incidental, special, or consequential damages.</p>
            <p>Messages are ephemeral by design and cannot be recovered once a session ends. Do not rely on pulsarchat for storing important information.</p>
            <p>To the maximum extent permitted by applicable law, our total liability for any claims relating to this service is limited to zero, as the service is provided free of charge.</p>
          </section>

          <section className={styles.legalSection}>
            <h2 className={styles.legalSectionTitle}>Privacy Policy</h2>
            <p>We do not collect, store, or process any personal data. There are no accounts, no sign-ups, and no user profiles.</p>
            <p>Messages are end-to-end encrypted and exist only in browser memory. They are never transmitted to or stored on any server.</p>
            <p>We use Vercel Analytics, which is privacy-friendly and does not collect personal data, create tracking profiles, or use cookies for advertising. No individual user data is stored or shared.</p>
            <p>The signaling server sees only temporary connection metadata (peer IDs) required to establish a WebRTC connection. This metadata is not stored and is discarded immediately after the connection is established.</p>
            <p>No data is shared with third parties. We do not sell, rent, or otherwise disclose your information to anyone.</p>
            <p>pulsarchat is GDPR compliant by design. Since we collect no personal data, there is nothing to request, export, or delete under GDPR, CCPA, or similar privacy regulations.</p>
          </section>
        </div>

        <div className={styles.footer}>
          pulsarchat &middot; made by //tedDev
        </div>
      </div>
    </div>
  );
}
