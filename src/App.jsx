import { useEffect, useState, lazy, Suspense } from "react";
import { usePeer } from "./hooks/usePeer";
import { useNotify } from "./hooks/useNotify";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useSettings } from "./hooks/useSettings";
import { getInitialRoomCode } from "./utils/url";
const Background = lazy(() => import("./components/Background"));
import Lobby from "./components/Lobby";
import Waiting from "./components/Waiting";
import Chat from "./components/Chat";
import Contacts from "./components/Contacts";
import Legal from "./components/Legal";
import Feedback from "./components/Feedback";
import Settings from "./components/Settings";
import Toast from "./components/Toast";
import styles from "./App.module.css";

const initialCode = getInitialRoomCode();

export default function App() {
  const { screen, roomCode, conn, sharedKey, toast, loading, actions } =
    usePeer();
  const notify = useNotify();
  usePushNotifications(notify.registerPushToken);
  const { settings, setSetting } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsFingerprint, setSettingsFingerprint] = useState(null);

  function openSettings(fp = null) {
    setSettingsFingerprint(fp);
    setShowSettings(true);
  }

  // Track which screen the lobby-level nav is showing
  // "lobby" | "contacts" — the peer screens (waiting/chat) take priority
  const [lobbyView, setLobbyView] = useState("lobby");

  // When a ping is sent, remember the target so we can fire it once
  // the room code is known (after createRoom resolves)
  const [pendingPingTarget, setPendingPingTarget] = useState(null);

  useEffect(() => {
    if (initialCode) {
      actions.joinRoom(initialCode);
    }
  }, []);

  // As soon as we're in the waiting screen with a room code and a pending
  // ping target, send the ping and clear the target
  useEffect(() => {
    if (screen === "waiting" && roomCode && pendingPingTarget) {
      notify.sendPing(pendingPingTarget.handle, notify.handle, roomCode);
      setPendingPingTarget(null);
    }
  }, [screen, roomCode, pendingPingTarget]);

  function handlePingContact(contact) {
    setPendingPingTarget(contact);
    setLobbyView("lobby");
    actions.createRoom();
  }

  function handleIncomingJoin() {
    if (!notify.incomingPing) return;
    const room = notify.incomingPing.room;
    notify.dismissPing();
    actions.joinRoom(room);
  }

  // Peer screens override the lobby-level nav
  const activePeerScreen = screen !== "lobby" ? screen : null;
  const showLobby = !activePeerScreen && lobbyView === "lobby";
  const showContacts = !activePeerScreen && lobbyView === "contacts";
  const showLegal = !activePeerScreen && lobbyView === "legal";
  const showFeedback = !activePeerScreen && lobbyView === "feedback";

  return (
    <>
      <Suspense fallback={null}><Background /></Suspense>

      {showSettings && (
        <Settings
          settings={settings}
          setSetting={setSetting}
          onClose={() => setShowSettings(false)}
          fingerprint={settingsFingerprint}
        />
      )}

      {showLobby && (
        <Lobby
          onCreate={actions.createRoom}
          onJoin={actions.joinRoom}
          onContacts={() => setLobbyView("contacts")}
          onLegal={() => setLobbyView("legal")}
          onFeedback={() => setLobbyView("feedback")}
          onOpenSettings={() => openSettings()}
          initialCode={initialCode}
        />
      )}

      {showLegal && <Legal onBack={() => setLobbyView("lobby")} />}

      {showFeedback && (
        <Feedback
          onBack={() => setLobbyView("lobby")}
          onToast={actions.showToast}
        />
      )}

      {showContacts && (
        <Contacts
          onBack={() => setLobbyView("lobby")}
          onPingContact={handlePingContact}
          notify={notify}
          onToast={actions.showToast}
          onOpenSettings={() => openSettings()}
        />
      )}

      {activePeerScreen === "waiting" && (
        <Waiting
          roomCode={roomCode}
          onBack={actions.backToLobby}
          onToast={actions.showToast}
          loading={loading}
          onOpenSettings={() => openSettings()}
        />
      )}

      {activePeerScreen === "chat" && (
        <Chat
          roomCode={roomCode}
          conn={conn}
          sharedKey={sharedKey}
          onLeave={actions.backToLobby}
          onToast={actions.showToast}
          settings={settings}
          setSetting={setSetting}
          onOpenSettings={openSettings}
        />
      )}

      <Toast message={toast} />

      {/* ── Incoming ping modal ──────────────────────── */}
      {notify.incomingPing && (
        <div className={styles.pingOverlay}>
          <div className={styles.pingCard}>
            <div className={styles.pingIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.pingTitle}>
              <span className={styles.pingFrom}>
                {notify.incomingPing.from}
              </span>{" "}
              wants to chat
            </div>
            <p className={styles.pingSubtitle}>
              room&nbsp;·&nbsp;{notify.incomingPing.room}
            </p>
            <div className={styles.pingActions}>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={notify.dismissPing}
              >
                ignore
              </button>
              <button className={styles.btn} onClick={handleIncomingJoin}>
                join
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
