import { useCallback, useEffect, useRef, useState } from "react";
import {
  DELIVERY_STATUS,
  SAVED_CHAT_STATUS,
} from "../chat/messageModels";
import {
  createOutgoingImageDraft,
  createOutgoingTextDraft,
  loadConversationMessages,
  markConversationRead,
  saveMessageStatus,
  updateConversationProfile,
} from "../services/savedChatRepository";

const HISTORY_LIMIT = 50;

function upsertMessages(list, nextMessage) {
  const existingIndex = list.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex === -1) return [...list, nextMessage];

  const nextList = [...list];
  nextList[existingIndex] = { ...nextList[existingIndex], ...nextMessage };
  return nextList;
}

export function useSavedChat({
  contactHandle,
  contactNickname,
  session,
  onConversationChanged,
  onMessageActivity,
}) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const revisionRef = useRef(session?.revision ?? 0);
  const sessionStatus = session?.status || SAVED_CHAT_STATUS.DISCONNECTED;
  const peerProfile = session?.peerProfile;
  const peerTyping = session?.peerTyping || false;
  const roomCode = session?.roomCode || "";

  useEffect(() => {
    let active = true;
    offsetRef.current = 0;
    setMessages([]);
    setHasMore(false);
    revisionRef.current = session?.revision ?? 0;

    updateConversationProfile(contactHandle, {
      displayName: contactNickname || contactHandle,
      avatar: null,
    }).catch(() => {});

    loadConversationMessages(contactHandle, {
      limit: HISTORY_LIMIT,
      offset: 0,
    }).then((loadedMessages) => {
      if (!active) return;
      setMessages([...loadedMessages].reverse());
      setHasMore(loadedMessages.length === HISTORY_LIMIT);
      offsetRef.current = HISTORY_LIMIT;
    });

    markConversationRead(contactHandle).finally(() => {
      onConversationChanged?.(contactHandle, { bumpRevision: false });
    });

    return () => {
      active = false;
    };
  }, [contactHandle, contactNickname, onConversationChanged]);

  const upsertVisibleMessage = useCallback((message) => {
    setMessages((prev) => upsertMessages(prev, message));
  }, []);

  const updateVisibleMessageStatus = useCallback((messageId, status) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, status } : message,
      ),
    );
  }, []);

  const reloadVisibleMessages = useCallback(async () => {
    const limit = Math.max(offsetRef.current, HISTORY_LIMIT);
    const loadedMessages = await loadConversationMessages(contactHandle, {
      limit,
      offset: 0,
    });
    setMessages([...loadedMessages].reverse());
    setHasMore(loadedMessages.length === limit);
    offsetRef.current = limit;
  }, [contactHandle]);

  useEffect(() => {
    const nextRevision = session?.revision ?? 0;
    if (nextRevision === revisionRef.current) return;
    revisionRef.current = nextRevision;

    reloadVisibleMessages();
    markConversationRead(contactHandle).finally(() => {
      onConversationChanged?.(contactHandle, { bumpRevision: false });
    });
  }, [contactHandle, onConversationChanged, reloadVisibleMessages, session?.revision]);

  const loadMore = useCallback(async () => {
    const olderMessages = await loadConversationMessages(contactHandle, {
      limit: HISTORY_LIMIT,
      offset: offsetRef.current,
    });

    if (olderMessages.length === 0) {
      setHasMore(false);
      return;
    }

    setMessages((prev) => [...[...olderMessages].reverse(), ...prev]);
    offsetRef.current += olderMessages.length;
    setHasMore(olderMessages.length === HISTORY_LIMIT);
  }, [contactHandle]);

  const sendMessage = useCallback(async (text, replyTo = null) => {
    const draft = await createOutgoingTextDraft(contactHandle, {
      text,
      replyTo,
      status:
        sessionStatus === SAVED_CHAT_STATUS.CONNECTED
          ? DELIVERY_STATUS.SENDING
          : DELIVERY_STATUS.QUEUED,
    });

    upsertVisibleMessage(draft);
    onConversationChanged?.(contactHandle, { bumpRevision: false });

    if (sessionStatus !== SAVED_CHAT_STATUS.CONNECTED || !session?.sendMessageNow) return;

    const result = await session.sendMessageNow(draft);
    const saved = await saveMessageStatus(draft.id, result.status);
    if (saved) upsertVisibleMessage(saved);
    else updateVisibleMessageStatus(draft.id, result.status);
    if (result.status === DELIVERY_STATUS.SENT) {
      onMessageActivity?.(contactHandle);
    }
    onConversationChanged?.(contactHandle, { bumpRevision: false });
  }, [
    contactHandle,
    onMessageActivity,
    onConversationChanged,
    session,
    sessionStatus,
    updateVisibleMessageStatus,
    upsertVisibleMessage,
  ]);

  const sendImage = useCallback(async (dataUrl) => {
    const draft = await createOutgoingImageDraft(contactHandle, {
      dataUrl,
      status:
        sessionStatus === SAVED_CHAT_STATUS.CONNECTED
          ? DELIVERY_STATUS.SENDING
          : DELIVERY_STATUS.QUEUED,
    });

    upsertVisibleMessage(draft);
    onConversationChanged?.(contactHandle, { bumpRevision: false });

    if (sessionStatus !== SAVED_CHAT_STATUS.CONNECTED || !session?.sendMessageNow) return;

    const result = await session.sendMessageNow(draft);
    const saved = await saveMessageStatus(draft.id, result.status);
    if (saved) upsertVisibleMessage(saved);
    else updateVisibleMessageStatus(draft.id, result.status);
    if (result.status === DELIVERY_STATUS.SENT) {
      onMessageActivity?.(contactHandle);
    }
    onConversationChanged?.(contactHandle, { bumpRevision: false });
  }, [
    contactHandle,
    onMessageActivity,
    onConversationChanged,
    session,
    sessionStatus,
    updateVisibleMessageStatus,
    upsertVisibleMessage,
  ]);

  return {
    status: sessionStatus,
    peerProfile: peerProfile || {
      displayName: contactNickname || "",
      avatar: null,
    },
    peerTyping,
    messages,
    hasMore,
    roomCode,
    sendMessage,
    sendImage,
    sendTyping: session?.sendTyping || (async () => {}),
    clearTyping: session?.clearTyping || (() => {}),
    loadMore,
    reconnect: session?.reconnect || (() => {}),
  };
}
