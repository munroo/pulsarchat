import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePeer } from "./hooks/usePeer";
import { useNotify } from "./hooks/useNotify";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useSettings } from "./hooks/useSettings";
import { APP_VIEW, useAppNavigation } from "./hooks/useAppNavigation";
import { useActiveSavedChats } from "./hooks/useActiveSavedChats";
import {
  getInitialAddContactHandle,
  getInitialRoomCode,
  getInitialSavedInvite,
} from "./utils/url";
import { APP_TITLE } from "./utils/notify";
import { addContact, getContacts } from "./utils/contacts";
import { getIdentity } from "./utils/identity";
const Background = lazy(() => import("./components/Background"));
import ActiveSavedChatConnection from "./components/ActiveSavedChatConnection";
import Lobby from "./components/Lobby";
import Waiting from "./components/Waiting";
import Chat from "./components/Chat";
import Contacts from "./components/Contacts";
import ConversationList from "./components/ConversationList";
import SavedChat from "./components/SavedChat";
import ProfileEditor from "./components/ProfileEditor";
import Legal from "./components/Legal";
import Feedback from "./components/Feedback";
import Settings from "./components/Settings";
import Toast from "./components/Toast";
import styles from "./App.module.css";

const initialCode = getInitialRoomCode();
const initialSavedInvite = initialCode ? null : getInitialSavedInvite();
const initialAddContactHandle =
  initialCode || initialSavedInvite ? "" : getInitialAddContactHandle();

export default function App() {
  const { screen, roomCode, conn, sharedKey, toast, loading, actions } =
    usePeer();
  const { createRoom, joinRoom, backToLobby, showToast } = actions;
  const notify = useNotify();
  const {
    handle: notifyHandle,
    incomingPing,
    sendPing,
    dismissPing,
    registerPushToken,
  } = notify;
  usePushNotifications(registerPushToken);

  const { settings, setSetting } = useSettings();
  const {
    mode,
    view,
    savedChatContact,
    setView,
    switchToSavedMode,
    switchToGhostMode,
    openSavedChat,
  } = useAppNavigation();

  const [showSettings, setShowSettings] = useState(false);
  const [renderSettings, setRenderSettings] = useState(false);
  const [settingsFingerprint, setSettingsFingerprint] = useState(null);
  const [pendingPingTarget, setPendingPingTarget] = useState(null);
  const processedInitialAddContactRef = useRef(false);
  const showSavedChatRef = useRef(null);
  const savedChatContactRef = useRef(null);
  const feedbackReturnViewRef = useRef(APP_VIEW.LOBBY);
  const {
    sessions: activeSavedSessions,
    refreshKey: savedChatRefreshKey,
    connectedHandles,
    openChat: openActiveSavedChat,
    closeChat: closeActiveSavedChat,
    disconnectAll: disconnectAllSavedChats,
    startQueuedHosts,
    registerSessionState,
    registerSessionControls,
    notifyPersistedChange,
    markMessageActivity,
    getSession: getActiveSavedChat,
  } = useActiveSavedChats();
  const activeSavedChat = savedChatContact
    ? getActiveSavedChat(savedChatContact.handle)
    : null;

  function openSettings(fingerprint = null) {
    setSettingsFingerprint(fingerprint);
    setRenderSettings(true);
    requestAnimationFrame(() => setShowSettings(true));
  }

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleSettingsExited = useCallback(() => {
    setRenderSettings(false);
    setSettingsFingerprint(null);
  }, []);

  const handleOpenFeedback = useCallback(() => {
    feedbackReturnViewRef.current = view;
    setShowSettings(false);
    setView(APP_VIEW.FEEDBACK);
  }, [setView, view]);

  const handleOpenSavedChat = useCallback(
    ({ handle, nickname, initialRoomCode }) => {
      openActiveSavedChat({
        handle,
        nickname,
        initialRoomCode,
        visible: true,
      });
      openSavedChat({ handle, nickname, initialRoomCode });
    },
    [openActiveSavedChat, openSavedChat],
  );

  const handleSwitchToGhostMode = useCallback(() => {
    disconnectAllSavedChats();
    switchToGhostMode();
  }, [disconnectAllSavedChats, switchToGhostMode]);

  useEffect(() => {
    if (initialCode) {
      switchToGhostMode();
      joinRoom(initialCode);
      return;
    }

    if (initialSavedInvite) {
      handleOpenSavedChat({
        handle: initialSavedInvite.handle,
        nickname: initialSavedInvite.handle,
        initialRoomCode: initialSavedInvite.roomCode,
      });
      window.history.replaceState(null, APP_TITLE, window.location.pathname);
    }
  }, [handleOpenSavedChat, joinRoom, switchToGhostMode]);

  useEffect(() => {
    if (!initialAddContactHandle || processedInitialAddContactRef.current) return;

    let cancelled = false;
    processedInitialAddContactRef.current = true;

    async function saveSharedContact() {
      const identity = await getIdentity().catch(() => null);
      if (cancelled) return;

      if (identity?.handle === initialAddContactHandle) {
        showToast("that's your handle");
      } else {
        const existingContacts = await getContacts();
        if (cancelled) return;

        const existingContact = existingContacts.find(
          (contact) => contact.handle === initialAddContactHandle,
        );

        if (existingContact) {
          showToast("contact already added");
        } else {
          await addContact(initialAddContactHandle, initialAddContactHandle);
          if (cancelled) return;
          showToast("contact added");
        }
      }

      switchToGhostMode();
      setView(APP_VIEW.CONTACTS);
      window.history.replaceState(null, APP_TITLE, window.location.pathname);
    }

    saveSharedContact();

    return () => {
      cancelled = true;
    };
  }, [setView, showToast, switchToGhostMode]);

  useEffect(() => {
    if (screen === "waiting" && roomCode && pendingPingTarget && notifyHandle) {
      sendPing(pendingPingTarget.handle, notifyHandle, roomCode, {
        chatMode: "ghost",
      });
      setPendingPingTarget(null);
    }
  }, [notifyHandle, pendingPingTarget, roomCode, screen, sendPing]);

  // Saved-mode pings: reconnect if already in that chat, otherwise deliver in background.
  useEffect(() => {
    if (!incomingPing || incomingPing.chatMode !== "saved") return;
    const ping = incomingPing;
    dismissPing();

    if (showSavedChatRef.current && savedChatContactRef.current?.handle === ping.from) {
      openActiveSavedChat({
        handle: ping.from,
        nickname: savedChatContactRef.current.nickname || ping.from,
        initialRoomCode: ping.room,
        visible: true,
      });
      return;
    }

    openActiveSavedChat({
      handle: ping.from,
      nickname: savedChatContactRef.current?.nickname || ping.from,
      initialRoomCode: ping.room,
      visible: false,
    });
    showToast(`${ping.from} wants to chat`);
  }, [dismissPing, incomingPing, openActiveSavedChat, showToast]);

  useEffect(() => {
    if (mode !== "saved") return;
    startQueuedHosts();
  }, [mode, startQueuedHosts]);

  function handlePingContact(contact) {
    setPendingPingTarget(contact);
    handleSwitchToGhostMode();
    createRoom();
  }

  function handleIncomingJoin() {
    if (!incomingPing) return;
    const ping = incomingPing;
    dismissPing();
    handleSwitchToGhostMode();
    joinRoom(ping.room);
  }

  const activePeerScreen = screen !== "lobby" ? screen : null;
  const showGhostLobby =
    !activePeerScreen &&
    mode === "ghost" &&
    view === APP_VIEW.LOBBY;
  const showContacts =
    !activePeerScreen &&
    mode === "ghost" &&
    view === APP_VIEW.CONTACTS;
  const showLegal =
    !activePeerScreen &&
    mode === "ghost" &&
    view === APP_VIEW.LEGAL;
  const showFeedback =
    !activePeerScreen &&
    view === APP_VIEW.FEEDBACK;
  const showConversations =
    !activePeerScreen &&
    mode === "saved" &&
    view === APP_VIEW.CONVERSATIONS;
  const showSavedChat =
    !activePeerScreen &&
    mode === "saved" &&
    view === APP_VIEW.SAVED_CHAT &&
    savedChatContact;
  const showProfileEditor =
    !activePeerScreen &&
    mode === "saved" &&
    view === APP_VIEW.PROFILE_EDIT;

  // Keep refs up-to-date for use inside effects without stale-closure issues.
  showSavedChatRef.current = showSavedChat;
  savedChatContactRef.current = savedChatContact;

  return (
    <>
      <Suspense fallback={null}>
        <Background />
      </Suspense>

      {renderSettings && (
        <Settings
          isOpen={showSettings}
          settings={settings}
          setSetting={setSetting}
          onClose={closeSettings}
          onExited={handleSettingsExited}
          fingerprint={settingsFingerprint}
          onOpenFeedback={handleOpenFeedback}
          showFeedbackAction={!activePeerScreen}
        />
      )}

      {showGhostLobby && (
        <Lobby
          onCreate={createRoom}
          onJoin={joinRoom}
          onContacts={() => setView(APP_VIEW.CONTACTS)}
          onSavedMode={switchToSavedMode}
          onLegal={() => setView(APP_VIEW.LEGAL)}
          onOpenSettings={() => openSettings()}
          initialCode={initialCode}
        />
      )}

      {showLegal && <Legal onBack={() => setView(APP_VIEW.LOBBY)} />}

      {showFeedback && (
        <Feedback
          onBack={() => setView(feedbackReturnViewRef.current || APP_VIEW.LOBBY)}
          onToast={showToast}
        />
      )}

      {showContacts && (
        <Contacts
          onBack={() => setView(APP_VIEW.LOBBY)}
          onPingContact={handlePingContact}
          notify={notify}
          onToast={showToast}
          onOpenSettings={() => openSettings()}
        />
      )}

      {showConversations && (
        <ConversationList
          onOpenSavedChat={handleOpenSavedChat}
          onEditProfile={() => setView(APP_VIEW.PROFILE_EDIT)}
          onGhostMode={handleSwitchToGhostMode}
          onOpenSettings={() => openSettings()}
          notify={notify}
          refreshKey={savedChatRefreshKey}
          connectedHandles={connectedHandles}
        />
      )}

      {showSavedChat && (
        <SavedChat
          contact={savedChatContact}
          session={activeSavedChat}
          onBack={() => {
            closeActiveSavedChat(savedChatContact.handle);
            setView(APP_VIEW.CONVERSATIONS);
          }}
          onToast={showToast}
          settings={settings}
          onOpenSettings={openSettings}
          onConversationChanged={notifyPersistedChange}
          onMessageActivity={markMessageActivity}
        />
      )}

      {showProfileEditor && (
        <ProfileEditor
          onClose={() => setView(APP_VIEW.CONVERSATIONS)}
          onSaved={() => {
            showToast("profile saved");
            setView(APP_VIEW.CONVERSATIONS);
          }}
          onToast={showToast}
        />
      )}

      {activePeerScreen === "waiting" && (
        <Waiting
          roomCode={roomCode}
          onBack={backToLobby}
          onToast={showToast}
          loading={loading}
          onOpenSettings={() => openSettings()}
        />
      )}

      {activePeerScreen === "chat" && (
        <Chat
          roomCode={roomCode}
          conn={conn}
          sharedKey={sharedKey}
          onLeave={backToLobby}
          settings={settings}
          onOpenSettings={openSettings}
        />
      )}

      <Toast message={toast} />

      {activeSavedSessions.map((session) => (
          <ActiveSavedChatConnection
            key={session.handle}
            session={session}
            notify={notify}
            onStateChange={registerSessionState}
            onControlsChange={registerSessionControls}
            onConversationChanged={notifyPersistedChange}
            onMessageActivity={markMessageActivity}
            onHiddenMessage={(_, message) => showToast(message)}
          />
        ))}

      {incomingPing && incomingPing.chatMode !== "saved" && (
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
                {incomingPing.from}
              </span>{" "}
              wants to chat
            </div>
            <p className={styles.pingSubtitle}>
              {incomingPing.chatMode === "saved"
                ? `saved chat · ${incomingPing.room}`
                : `room · ${incomingPing.room}`}
            </p>
            <div className={styles.pingActions}>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={dismissPing}
              >
                ignore
              </button>
              <button className={styles.btn} onClick={handleIncomingJoin}>
                {incomingPing.chatMode === "saved" ? "open" : "join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
