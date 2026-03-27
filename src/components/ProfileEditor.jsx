import { useEffect, useRef, useState } from "react";
import { saveLocalProfile, getLocalProfile } from "../services/savedChatRepository";
import styles from "../App.module.css";

function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const size = 100;
      const ratio = Math.min(size / image.width, size / image.height);
      const width = Math.round(image.width * ratio);
      const height = Math.round(image.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    image.src = url;
  });
}

export default function ProfileEditor({ onClose, onSaved, onToast }) {
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getLocalProfile().then((profile) => {
      setDisplayName(profile.displayName || "");
      setAvatar(profile.avatar || null);
    });
  }, []);

  async function handleAvatarPick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    try {
      setAvatar(await compressAvatar(file));
    } catch {
      onToast?.("could not process that image");
    }
  }

  async function handleSave() {
    await saveLocalProfile({ displayName, avatar });
    onSaved?.();
  }

  return (
    <main className={styles.profileEditorWrap}>
      <div className={styles.profileEditorHeader}>
        <button className={styles.backBtn} onClick={onClose} title="back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 2L4 8l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className={styles.chatTitle}>profile</span>
      </div>

      <div className={styles.profileEditorBody}>
        <button className={styles.profileAvatarBtn} onClick={() => fileInputRef.current?.click()}>
          {avatar ? <img src={avatar} alt="avatar" /> : <span>{(displayName || "?")[0].toUpperCase()}</span>}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarPick}
        />
        <div className={styles.profileEditorLabel}>display name</div>
        <input
          className={styles.profileEditorInput}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="how contacts will see you"
        />
        <button className={styles.btn} onClick={handleSave}>
          save profile
        </button>
      </div>
    </main>
  );
}
