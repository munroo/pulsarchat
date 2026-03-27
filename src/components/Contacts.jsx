import { useState, useEffect } from "react";
import {
  getContacts,
  addContact,
  deleteContact,
  updateContactNickname,
} from "../utils/contacts";
import { handleShare } from "../utils/share";
import styles from "../App.module.css";

export default function Contacts({ onBack, onPingContact, notify, onToast, onOpenSettings }) {
  const [contacts, setContacts] = useState([]);
  const [handleInput, setHandleInput] = useState("");
  const [nickInput, setNickInput] = useState("");
  const [editingHandle, setEditingHandle] = useState(null);
  const [editingNickname, setEditingNickname] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  // Refresh online status whenever the contact list changes
  useEffect(() => {
    if (contacts.length > 0) {
      notify.queryStatus(contacts.map((c) => c.handle));
    }
  }, [contacts]);

  async function loadContacts() {
    const list = await getContacts();
    setContacts(list);
  }

  async function handleAdd() {
    const h = handleInput.trim().toUpperCase();
    if (h.length < 4) return;
    await addContact(h, nickInput.trim() || h);
    setHandleInput("");
    setNickInput("");
    loadContacts();
  }

  async function handleDelete(h) {
    await deleteContact(h);
    if (editingHandle === h) {
      setEditingHandle(null);
      setEditingNickname("");
    }
    loadContacts();
  }

  function startEditing(contact) {
    setEditingHandle(contact.handle);
    setEditingNickname(contact.nickname || contact.handle);
  }

  function cancelEditing() {
    setEditingHandle(null);
    setEditingNickname("");
  }

  async function handleSaveNickname(handle) {
    await updateContactNickname(handle, editingNickname.trim() || handle);
    setEditingHandle(null);
    setEditingNickname("");
    loadContacts();
  }

  function copyHandle() {
    navigator.clipboard
      .writeText(notify.handle || "")
      .then(() => onToast("handle copied"));
  }

  function shareHandle() {
    handleShare(
      "pulsarchat",
      `Add me on pulsarchat! My handle: ${notify.handle || ""}`,
      import.meta.env.VITE_APP_URL ?? "",
      onToast,
    );
  }

  return (
    <main className={styles.contactsWrap}>
      {/* ── Header ───────────────────────────────────── */}
      <div className={styles.contactsHeader}>
        <button className={styles.backBtn} onClick={onBack} title="back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className={styles.chatTitle}>contacts</span>
        <button
          className={styles.iconBtn}
          onClick={onOpenSettings}
          title="settings"
          style={{ marginLeft: "auto" }}
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
      </div>

      <div className={styles.contactsBody}>
        {/* ── My handle ────────────────────────────────── */}
        <div className={styles.myHandleBlock}>
          <span className={styles.handleLabel}>your handle</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className={styles.handleDisplay}
              onClick={copyHandle}
              title="tap to copy"
            >
              {notify.handle || "…"}
            </button>
            <button
              className={styles.iconBtn}
              onClick={shareHandle}
              title="share handle"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1v8M5.5 3.5L8 1l2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 9v5h10V9"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <span className={styles.handleHint}>
            tap to copy · share this so contacts can ping you
          </span>
        </div>

        {/* ── Add contact ──────────────────────────────── */}
        <div className={styles.addContactBlock}>
          <h3 className={styles.addContactTitle}>add contact</h3>
          <input
            className={styles.contactInput}
            placeholder="handle (e.g. NOVA-3KF8)"
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            className={styles.contactInput}
            placeholder="nickname (optional)"
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button className={styles.btn} onClick={handleAdd}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1v10M1 6h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            add
          </button>
        </div>

        {/* ── Contact list ─────────────────────────────── */}
        {contacts.length === 0 ? (
          <p className={styles.emptyContacts}>no contacts yet</p>
        ) : (
          <div className={styles.contactsList}>
            {contacts.map((c) => (
              <div key={c.handle} className={styles.contactItem}>
                <span
                  className={
                    notify.onlineHandles.has(c.handle)
                      ? styles.dotOnline
                      : styles.dotOffline
                  }
                />
                <div className={styles.contactInfo}>
                  {editingHandle === c.handle ? (
                    <input
                      className={styles.contactNickInput}
                      value={editingNickname}
                      onChange={(e) => setEditingNickname(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveNickname(c.handle);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className={styles.contactNick}>{c.nickname}</span>
                  )}
                  <span className={styles.contactHandle}>{c.handle}</span>
                </div>
                <div className={styles.contactActions}>
                  {editingHandle === c.handle ? (
                    <>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => handleSaveNickname(c.handle)}
                        style={{ width: "auto", padding: "6px 12px" }}
                      >
                        save
                      </button>
                      <button
                        className={styles.iconBtn}
                        onClick={cancelEditing}
                        title="cancel edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2 2l10 10M12 2L2 12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => onPingContact(c)}
                        style={{ width: "auto", padding: "6px 14px" }}
                      >
                        ping
                      </button>
                      <button
                        className={styles.iconBtn}
                        onClick={() => startEditing(c)}
                        title="edit nickname"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2 10.5V12h1.5L11 4.5 9.5 3 2 10.5z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8.5 4l1.5 1.5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <button
                        className={styles.iconBtn}
                        onClick={() => handleDelete(c.handle)}
                        title="remove contact"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2 2l10 10M12 2L2 12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
