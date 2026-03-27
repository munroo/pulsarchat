import { useCallback, useEffect, useRef } from "react";
import { DELIVERY_STATUS } from "../chat/messageModels";
import { useSavedChatSession } from "../hooks/useSavedChatSession";
import {
  loadQueuedMessages,
  markConversationRead,
  saveIncomingMessage,
  saveMessageStatus,
  updateConversationProfile,
} from "../services/savedChatRepository";

function buildHiddenMessageToast(nickname, handle, message) {
  if (message.image) return `${nickname || handle} sent an image`;
  if (message.text) return `${nickname || handle}: ${message.text}`;
  return `${nickname || handle} sent a message`;
}

export default function ActiveSavedChatConnection({
  session,
  notify,
  onStateChange,
  onControlsChange,
  onConversationChanged,
  onMessageActivity,
  onHiddenMessage,
}) {
  const visibleRef = useRef(session.visible);
  const handleRef = useRef(session.handle);
  const nicknameRef = useRef(session.nickname);

  visibleRef.current = session.visible;
  handleRef.current = session.handle;
  nicknameRef.current = session.nickname;

  const loadQueuedMessagesForConversation = useCallback(
    () => loadQueuedMessages(session.handle),
    [session.handle],
  );

  const handleIncomingMessage = useCallback(
    async (message) => {
      const saved = await saveIncomingMessage(session.handle, message);
      onMessageActivity?.(session.handle);
      if (visibleRef.current) {
        await markConversationRead(session.handle);
      }
      onConversationChanged?.(session.handle);
      if (!visibleRef.current) {
        onHiddenMessage?.(
          session.handle,
          buildHiddenMessageToast(
            nicknameRef.current,
            handleRef.current,
            saved,
          ),
        );
      }
    },
    [onConversationChanged, onHiddenMessage, onMessageActivity, session.handle],
  );

  const handleIncomingProfile = useCallback(
    async (profile) => {
      await updateConversationProfile(session.handle, profile);
      onConversationChanged?.(session.handle);
    },
    [onConversationChanged, session.handle],
  );

  const handleDeliveryAck = useCallback(
    async (messageId) => {
      await saveMessageStatus(messageId, DELIVERY_STATUS.DELIVERED);
      onConversationChanged?.(session.handle);
    },
    [onConversationChanged, session.handle],
  );

  const handleQueuedMessageSent = useCallback(
    async (messageId) => {
      await saveMessageStatus(messageId, DELIVERY_STATUS.SENT);
      onMessageActivity?.(session.handle);
      onConversationChanged?.(session.handle);
    },
    [onConversationChanged, onMessageActivity, session.handle],
  );

  const handleQueuedMessageFailed = useCallback(
    async (messageId) => {
      await saveMessageStatus(messageId, DELIVERY_STATUS.QUEUED);
      onConversationChanged?.(session.handle);
    },
    [onConversationChanged, session.handle],
  );

  const savedSession = useSavedChatSession({
    contactHandle: session.handle,
    initialRoomCode: session.initialRoomCode || null,
    notify: session.initialRoomCode ? null : notify,
    loadQueuedMessages: loadQueuedMessagesForConversation,
    onIncomingMessage: handleIncomingMessage,
    onIncomingProfile: handleIncomingProfile,
    onDeliveryAck: handleDeliveryAck,
    onQueuedMessageSent: handleQueuedMessageSent,
    onQueuedMessageFailed: handleQueuedMessageFailed,
  });

  useEffect(() => {
    onControlsChange?.(session.handle, {
      sendTyping: savedSession.sendTyping,
      clearTyping: savedSession.clearTyping,
      sendMessageNow: savedSession.sendMessageNow,
      reconnect: savedSession.reconnect,
      disconnect: savedSession.disconnect,
    });
  }, [
    onControlsChange,
    savedSession.clearTyping,
    savedSession.disconnect,
    savedSession.reconnect,
    savedSession.sendMessageNow,
    savedSession.sendTyping,
    session.handle,
  ]);

  useEffect(() => {
    onStateChange?.(session.handle, {
      status: savedSession.status,
      roomCode: savedSession.roomCode,
      peerProfile: savedSession.peerProfile,
      peerTyping: savedSession.peerTyping,
    });
  }, [
    onStateChange,
    savedSession.peerProfile,
    savedSession.peerTyping,
    savedSession.roomCode,
    savedSession.status,
    session.handle,
  ]);

  return null;
}
