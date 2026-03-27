import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAVED_CHAT_STATUS } from "../chat/messageModels";
import {
  listConversations,
  loadQueuedMessages,
} from "../services/savedChatRepository";

const MAX_ACTIVE_CONNECTIONS = 4;
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const IDLE_CHECK_MS = 30 * 1000;
const EMPTY_CONTROLS = {
  sendTyping: async () => {},
  clearTyping: () => {},
  sendMessageNow: async () => ({ status: "queued" }),
  reconnect: () => {},
  disconnect: () => {},
};

function createSessionRecord({
  handle,
  nickname,
  initialRoomCode,
  visible = false,
}) {
  const now = Date.now();
  return {
    handle,
    nickname: nickname || handle,
    initialRoomCode: initialRoomCode ?? null,
    visible,
    status: SAVED_CHAT_STATUS.LOADING,
    roomCode: initialRoomCode || "",
    peerProfile: null,
    peerTyping: false,
    revision: 0,
    lastUsedAt: now,
    lastMessageAt: now,
    controls: EMPTY_CONTROLS,
  };
}

function isActiveConnection(session) {
  return session.status !== SAVED_CHAT_STATUS.DISCONNECTED;
}

export function useActiveSavedChats() {
  const [sessions, setSessions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const sessionsRef = useRef(sessions);
  const queueScanRef = useRef(0);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const openChat = useCallback(
    ({ handle, nickname, initialRoomCode, visible = true }) => {
      if (!handle) return;

      setSessions((prev) => {
        const index = prev.findIndex((session) => session.handle === handle);
        if (index === -1) {
          return [
            ...prev,
            createSessionRecord({ handle, nickname, initialRoomCode, visible }),
          ];
        }

        const current = prev[index];
        const nextVisible = visible ?? current.visible;
        const nextInitialRoomCode =
          initialRoomCode !== undefined
            ? initialRoomCode
            : current.status === SAVED_CHAT_STATUS.DISCONNECTED
              ? null
              : current.initialRoomCode;

        const nextSession = {
          ...current,
          nickname: nickname || current.nickname || handle,
          visible: nextVisible,
          initialRoomCode: nextInitialRoomCode,
          roomCode:
            initialRoomCode !== undefined
              ? initialRoomCode || current.roomCode || ""
              : current.roomCode,
          lastUsedAt: Date.now(),
        };

        const next = [...prev];
        next[index] = nextSession;
        return next;
      });
    },
    [],
  );

  const closeChat = useCallback((handle) => {
    if (!handle) return;
    const session = sessionsRef.current.find((entry) => entry.handle === handle);
    if (session?.status === SAVED_CHAT_STATUS.DISCONNECTED) {
      session.controls?.reconnect?.();
    }

    setSessions((prev) =>
      prev.map((entry) =>
        entry.handle === handle
          ? {
              ...entry,
              visible: false,
              initialRoomCode:
                entry.status === SAVED_CHAT_STATUS.DISCONNECTED
                  ? null
                  : entry.initialRoomCode,
              lastUsedAt: Date.now(),
            }
          : entry,
      ),
    );
  }, []);

  const registerSessionState = useCallback((handle, nextState) => {
    if (!handle) return;
    setSessions((prev) =>
      prev.map((session) =>
        session.handle === handle
          ? {
              ...session,
              ...nextState,
            }
          : session,
      ),
    );
  }, []);

  const registerSessionControls = useCallback((handle, controls) => {
    if (!handle) return;
    setSessions((prev) =>
      prev.map((session) =>
        session.handle === handle ? { ...session, controls } : session,
      ),
    );
  }, []);

  const notifyPersistedChange = useCallback((handle, options = {}) => {
    if (options.bumpRevision !== false) {
      setSessions((prev) =>
        prev.map((session) =>
          !handle || session.handle === handle
            ? {
                ...session,
                revision: session.revision + 1,
              }
            : session,
        ),
      );
    }
    setRefreshKey((value) => value + 1);
  }, []);

  const markMessageActivity = useCallback((handle) => {
    if (!handle) return;
    const now = Date.now();
    setSessions((prev) =>
      prev.map((session) =>
        session.handle === handle
          ? {
              ...session,
              lastUsedAt: now,
              lastMessageAt: now,
            }
          : session,
      ),
    );
  }, []);

  const disconnectChat = useCallback((handle) => {
    if (!handle) return;

    const session = sessionsRef.current.find((entry) => entry.handle === handle);
    session?.controls?.disconnect?.();

    setSessions((prev) =>
      prev.flatMap((entry) => {
        if (entry.handle !== handle) return [entry];
        if (!entry.visible) return [];
        return [
          {
            ...entry,
            status: SAVED_CHAT_STATUS.DISCONNECTED,
            peerTyping: false,
            controls: EMPTY_CONTROLS,
            lastUsedAt: Date.now(),
          },
        ];
      }),
    );
  }, []);

  const disconnectAll = useCallback(() => {
    queueScanRef.current += 1;
    for (const session of sessionsRef.current) {
      session.controls?.disconnect?.();
    }
    setSessions([]);
  }, []);

  const startQueuedHosts = useCallback(async () => {
    const scanId = queueScanRef.current + 1;
    queueScanRef.current = scanId;
    const conversations = await listConversations();
    if (queueScanRef.current !== scanId) return;

    for (const conversation of conversations) {
      const queuedMessages = await loadQueuedMessages(conversation.handle);
      if (queueScanRef.current !== scanId) return;
      if (!queuedMessages.length) continue;

      openChat({
        handle: conversation.handle,
        nickname: conversation.nickname,
        visible: false,
      });
    }
  }, [openChat]);

  useEffect(() => {
    function handleBeforeUnload() {
      disconnectAll();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [disconnectAll]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();

      for (const session of sessionsRef.current) {
        if (session.visible) continue;
        if (now - session.lastMessageAt < IDLE_TIMEOUT_MS) continue;
        disconnectChat(session.handle);
      }
    }, IDLE_CHECK_MS);

    return () => window.clearInterval(intervalId);
  }, [disconnectChat]);

  useEffect(() => {
    const activeSessions = sessions.filter(isActiveConnection);
    if (activeSessions.length <= MAX_ACTIVE_CONNECTIONS) return;

    const overflowCount = activeSessions.length - MAX_ACTIVE_CONNECTIONS;
    const evictableSessions = [...activeSessions]
      .filter((session) => !session.visible)
      .sort((a, b) => a.lastUsedAt - b.lastUsedAt);

    for (let index = 0; index < overflowCount && index < evictableSessions.length; index += 1) {
      disconnectChat(evictableSessions[index].handle);
    }
  }, [disconnectChat, sessions]);

  const connectedHandles = useMemo(
    () =>
      new Set(
        sessions
          .filter((session) => session.status === SAVED_CHAT_STATUS.CONNECTED)
          .map((session) => session.handle),
      ),
    [sessions],
  );

  const getSession = useCallback(
    (handle) => {
      const session = sessions.find((entry) => entry.handle === handle);
      if (!session) return null;

      return {
        ...session,
        sendTyping: session.controls.sendTyping,
        clearTyping: session.controls.clearTyping,
        sendMessageNow: session.controls.sendMessageNow,
        reconnect: session.controls.reconnect,
      };
    },
    [sessions],
  );

  return {
    sessions,
    refreshKey,
    connectedHandles,
    openChat,
    closeChat,
    disconnectChat,
    disconnectAll,
    startQueuedHosts,
    registerSessionState,
    registerSessionControls,
    notifyPersistedChange,
    markMessageActivity,
    getSession,
  };
}
