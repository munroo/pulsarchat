import { useCallback, useEffect, useState } from "react";
import { getContacts } from "../utils/contacts";
import {
  listConversations,
  markConversationRead,
  removeConversation,
  getLocalProfile,
} from "../services/savedChatRepository";
import styles from "../App.module.css";

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (messageDay === todayStart) {
    return (
      date.getHours().toString().padStart(2, "0") +
      ":" +
      date.getMinutes().toString().padStart(2, "0")
    );
  }
  if (messageDay === todayStart - 86400000) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ src, name, size = 44 }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      className={styles.conversationAvatar}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
    </div>
  );
}

export default function ConversationList({
  onOpenSavedChat,
  onEditProfile,
  onGhostMode,
  onOpenSettings,
  notify,
  refreshKey,
  connectedHandles,
}) {
  const [conversations, setConversations] = useState([]);
  const [profile, setProfile] = useState({ displayName: "", avatar: null });
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newHandleInput, setNewHandleInput] = useState("");
  const [deletingHandle, setDeletingHandle] = useState(null);

  const load = useCallback(async () => {
    const [savedConversations, localProfile] = await Promise.all([
      listConversations(),
      getLocalProfile(),
    ]);
    setConversations(savedConversations);
    setProfile(localProfile);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function openNewChat() {
    const savedContacts = await getContacts();
    notify?.queryStatus?.(savedContacts.map((contact) => contact.handle));
    setContacts(savedContacts);
    setNewHandleInput("");
    setShowNewChat(true);
  }

  function startChatWith(handle, nickname) {
    setShowNewChat(false);
    onOpenSavedChat({ handle, nickname: nickname || handle });
  }

  function handleNewHandleSubmit() {
    const handle = newHandleInput.trim().toUpperCase();
    if (handle.length >= 4) {
      startChatWith(handle, handle);
    }
  }

  async function handleDelete(handle) {
    await removeConversation(handle);
    setDeletingHandle(null);
    load();
  }

  const filteredConversations = search
    ? conversations.filter(
        (conversation) =>
          conversation.handle.includes(search.toUpperCase()) ||
          conversation.nickname.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  return (
    <main className={styles.conversationListWrap}>
      <div className={styles.conversationListHeader}>
        <button className={styles.profileHeaderBtn} onClick={onEditProfile} title="edit profile">
          <Avatar src={profile.avatar} name={profile.displayName || notify?.handle || "?"} size={36} />
          <div className={styles.profileHeaderInfo}>
            <div className={styles.profileHeaderName}>
              {profile.displayName || "Set display name"}
            </div>
            <div className={styles.profileHeaderHandle}>{notify?.handle || "…"}</div>
          </div>
        </button>
        <button className={styles.iconBtn} onClick={onOpenSettings} title="settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={styles.conversationSearch}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: "var(--muted)" }}>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          className={styles.conversationSearchInput}
          placeholder="search conversations"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className={styles.conversationList}>
        {filteredConversations.length === 0 && (
          <div className={styles.conversationEmpty}>
            {search ? "no matches" : "no saved chats yet · tap + to start one"}
          </div>
        )}

        {filteredConversations.map((conversation) => (
          <div
            key={conversation.handle}
            className={styles.conversationItem}
            onClick={() => {
              if (deletingHandle === conversation.handle) {
                setDeletingHandle(null);
                return;
              }
              markConversationRead(conversation.handle);
              onOpenSavedChat({
                handle: conversation.handle,
                nickname: conversation.nickname,
              });
            }}
          >
            <Avatar src={conversation.avatar} name={conversation.nickname || conversation.handle} />
            <div className={styles.conversationInfo}>
              <div className={styles.conversationName}>
                {conversation.nickname || conversation.handle}
              </div>
              <div className={styles.conversationPreview}>
                {conversation.lastMessage || "no messages yet"}
              </div>
            </div>
            <div className={styles.conversationMeta}>
              <div className={styles.conversationTime}>{formatTime(conversation.lastTime)}</div>
              {connectedHandles?.has(conversation.handle) && (
                <span className={styles.dotOnline} title="connected" />
              )}
              {conversation.unread > 0 && (
                <div className={styles.unreadBadge}>
                  {conversation.unread > 99 ? "99+" : conversation.unread}
                </div>
              )}
              {deletingHandle === conversation.handle ? (
                <button
                  className={styles.deleteConfirmBtn}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(conversation.handle);
                  }}
                >
                  delete
                </button>
              ) : (
                <button
                  className={styles.conversationDeleteBtn}
                  title="delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeletingHandle(conversation.handle);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className={styles.ghostModeBtn} onClick={onGhostMode}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C8.13 2 5 5.13 5 9v7l-2 2v1h18v-1l-2-2V9c0-3.87-3.13-7-7-7zm0 20c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"
            fill="currentColor"
            opacity="0.6"
          />
        </svg>
        anonymous ghost mode
      </button>

      <button className={styles.fab} onClick={openNewChat} title="new chat">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {showNewChat && (
        <div className={styles.newChatOverlay} onClick={() => setShowNewChat(false)}>
          <div className={styles.newChatPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.newChatHeader}>
              <span className={styles.newChatTitle}>new chat</span>
              <button className={styles.iconBtn} onClick={() => setShowNewChat(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className={styles.newChatInputRow}>
              <input
                className={styles.newChatInput}
                placeholder="handle (e.g. NOVA-3KF8)"
                value={newHandleInput}
                onChange={(event) => setNewHandleInput(event.target.value.toUpperCase())}
                onKeyDown={(event) => event.key === "Enter" && handleNewHandleSubmit()}
                autoFocus
              />
              <button className={styles.btn} onClick={handleNewHandleSubmit}>
                chat
              </button>
            </div>
            {contacts.length > 0 && (
              <>
                <div className={styles.newChatDivider}>or pick a contact</div>
                <div className={styles.newChatContacts}>
                  {contacts.map((contact) => (
                    <button
                      key={contact.handle}
                      className={styles.newChatContactItem}
                      onClick={() => startChatWith(contact.handle, contact.nickname)}
                    >
                      <Avatar src={null} name={contact.nickname || contact.handle} size={32} />
                      <div className={styles.newChatContactInfo}>
                        <div className={styles.contactNick}>{contact.nickname}</div>
                        <div className={styles.contactHandle}>{contact.handle}</div>
                      </div>
                      {notify?.onlineHandles?.has(contact.handle) && <span className={styles.dotOnline} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
