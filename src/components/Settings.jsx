import { useState } from "react";
import styles from "../App.module.css";

function Toggle({ on, onToggle }) {
  return (
    <button
      className={`${styles.settingsToggle} ${on ? styles.settingsToggleActive : ""}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
    >
      <span className={styles.settingsToggleKnob} />
    </button>
  );
}

export default function Settings({ settings, setSetting, onClose, fingerprint }) {
  const [copied, setCopied] = useState(false);

  async function copyFingerprint() {
    try {
      await navigator.clipboard.writeText(fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className={styles.settingsOverlay} onClick={onClose}>
      <div className={styles.settingsPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.settingsHeader}>
          <span className={styles.settingsTitle}>Settings</span>
          <button className={styles.iconBtn} onClick={onClose} title="close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.settingsBody}>
          <div className={styles.settingsSection}>
            <div className={styles.settingsSectionLabel}>Interface</div>

            <div className={styles.settingsRow}>
              <div>
                <div className={styles.settingsLabel}>Live tab title</div>
                <div className={styles.settingsSubLabel}>Show peer typing in browser tab</div>
              </div>
              <Toggle
                on={settings.tabTitle}
                onToggle={() => setSetting("tabTitle", !settings.tabTitle)}
              />
            </div>

            <div className={styles.settingsRow}>
              <div>
                <div className={styles.settingsLabel}>Show timestamps</div>
                <div className={styles.settingsSubLabel}>Time below each message group</div>
              </div>
              <Toggle
                on={settings.timestamps}
                onToggle={() => setSetting("timestamps", !settings.timestamps)}
              />
            </div>

            <div className={styles.settingsRow}>
              <div>
                <div className={styles.settingsLabel}>Compact mode</div>
                <div className={styles.settingsSubLabel}>Smaller text and tighter spacing</div>
              </div>
              <Toggle
                on={settings.compact}
                onToggle={() => setSetting("compact", !settings.compact)}
              />
            </div>
          </div>

          <div className={styles.settingsSection}>
            <div className={styles.settingsSectionLabel}>Behavior</div>

            <div className={styles.settingsRow}>
              <div>
                <div className={styles.settingsLabel}>Notification sounds</div>
                <div className={styles.settingsSubLabel}>Subtle beep on incoming messages</div>
              </div>
              <Toggle
                on={settings.sounds}
                onToggle={() => setSetting("sounds", !settings.sounds)}
              />
            </div>

            <div className={styles.settingsRow}>
              <div>
                <div className={styles.settingsLabel}>Auto-delete messages</div>
                <div className={styles.settingsSubLabel}>Messages vanish 30s after arrival</div>
              </div>
              <Toggle
                on={settings.autoDelete}
                onToggle={() => setSetting("autoDelete", !settings.autoDelete)}
              />
            </div>
          </div>

          <div className={styles.settingsSection}>
            <div className={styles.settingsSectionLabel}>Security</div>
            <div className={styles.settingsFingerprint}>
              <div className={styles.settingsFingerprintLabel}>Session fingerprint</div>
              <div className={styles.settingsFingerprintValue}>
                {fingerprint || "computing\u2026"}
              </div>
              <div className={styles.settingsFingerprintHint}>
                Compare with your peer to verify the connection is secure.
              </div>
              <button
                className={styles.settingsCopyBtn}
                onClick={copyFingerprint}
                disabled={!fingerprint}
              >
                {copied ? "copied!" : "copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}