import { useState } from "react";
import styles from "../App.module.css";

export default function Feedback({ onBack, onToast }) {
  const [type, setType] = useState("bug");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const subject =
        type === "bug"
          ? "[pulsarchat] Bug report"
          : "[pulsarchat] Feature request";
      const formData = new FormData();
      formData.append("access_key", "6914caff-0b38-4e31-8643-b6b158351ecd");
      formData.append("subject", subject);
      formData.append("message", description);
      formData.append("contact", email);
      formData.append("botcheck", "");
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        onToast("thanks for your feedback!");
        setDescription("");
        setEmail("");
        onBack();
      } else {
        onToast("something went wrong, please try again");
      }
    } catch {
      onToast("something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.feedbackWrap}>
      <div className={styles.feedbackInner}>
        <div className={styles.legalHeader}>
          <button className={styles.backBtn} onClick={onBack} title="back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 2L4 8l6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className={styles.legalHeaderTitle}>feedback</span>
        </div>

        <div className={styles.feedbackCard}>
          <form onSubmit={handleSubmit}>
            <input type="checkbox" name="botcheck" style={{ display: "none" }} />
            <div className={styles.feedbackToggle}>
              <button
                type="button"
                className={
                  type === "bug"
                    ? `${styles.feedbackToggleBtn} ${styles.feedbackToggleActive}`
                    : styles.feedbackToggleBtn
                }
                onClick={() => setType("bug")}
              >
                bug report
              </button>
              <button
                type="button"
                className={
                  type === "feature"
                    ? `${styles.feedbackToggleBtn} ${styles.feedbackToggleActive}`
                    : styles.feedbackToggleBtn
                }
                onClick={() => setType("feature")}
              >
                feature request
              </button>
            </div>

            <textarea
              className={styles.feedbackTextarea}
              placeholder={
                type === "bug" ? "Describe the bug…" : "Describe your idea…"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />

            <input
              className={styles.feedbackInput}
              type="email"
              placeholder="optional — how can we reach you?"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="submit"
              className={styles.btn}
              disabled={submitting || !description.trim()}
              style={{ width: "100%", marginTop: 4 }}
            >
              {submitting ? "sending…" : "send feedback"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
