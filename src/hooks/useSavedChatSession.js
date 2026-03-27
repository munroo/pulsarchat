import { useCallback, useEffect, useRef, useState } from "react";
import { encrypt, decrypt } from "../utils/crypto";
import { getIdentity } from "../utils/identity";
import { generateCode } from "../utils/roomCode";
import { createPeerClient, wakePeerServer } from "../chat/peerClient";
import { performSecureHandshake } from "../chat/secureHandshake";
import {
  CHAT_PROTOCOL,
  appendIncomingImageChunk,
  completeIncomingImageTransfer,
  createAckMessage,
  createIncomingImageMessage,
  createIncomingImageTransferStore,
  createIncomingTextMessage,
  createTextTransportMessage,
  serializeMessagePayload,
  startIncomingImageTransfer,
} from "../chat/protocol";
import { DELIVERY_STATUS, SAVED_CHAT_STATUS } from "../chat/messageModels";
import { getLocalProfile } from "../services/savedChatRepository";

async function sendImageMessageOverConnection(conn, sharedKey, message) {
  const chunkSize = 12000;
  const total = Math.ceil(message.image.length / chunkSize);
  conn.send({ type: CHAT_PROTOCOL.IMAGE_START, id: message.id, total });

  for (let i = 0; i < total; i += 1) {
    const piece = message.image.slice(i * chunkSize, (i + 1) * chunkSize);
    const payload = await encrypt(sharedKey, piece);
    conn.send({
      type: CHAT_PROTOCOL.IMAGE_CHUNK,
      id: message.id,
      index: i,
      payload,
    });
  }

  conn.send({ type: CHAT_PROTOCOL.IMAGE_END, id: message.id });
  conn.send({ type: CHAT_PROTOCOL.CLEAR });
}

async function sendTextMessageOverConnection(conn, sharedKey, message) {
  const payload = await encrypt(
    sharedKey,
    serializeMessagePayload({ text: message.text, replyTo: message.replyTo }),
  );
  conn.send(createTextTransportMessage({ msgId: message.id, payload }));
  conn.send({ type: CHAT_PROTOCOL.CLEAR });
}

export function useSavedChatSession({
  contactHandle,
  initialRoomCode,
  notify,
  loadQueuedMessages,
  onIncomingMessage,
  onIncomingProfile,
  onDeliveryAck,
  onQueuedMessageSent,
  onQueuedMessageFailed,
}) {
  const [status, setStatus] = useState(SAVED_CHAT_STATUS.LOADING);
  const [roomCode, setRoomCode] = useState("");
  const [peerProfile, setPeerProfile] = useState(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const sharedKeyRef = useRef(null);
  const imageTransfersRef = useRef(createIncomingImageTransferStore());
  const notifyRef = useRef(notify);
  const loadQueuedMessagesRef = useRef(loadQueuedMessages);
  const onIncomingMessageRef = useRef(onIncomingMessage);
  const onIncomingProfileRef = useRef(onIncomingProfile);
  const onDeliveryAckRef = useRef(onDeliveryAck);
  const onQueuedMessageSentRef = useRef(onQueuedMessageSent);
  const onQueuedMessageFailedRef = useRef(onQueuedMessageFailed);

  notifyRef.current = notify;
  loadQueuedMessagesRef.current = loadQueuedMessages;
  onIncomingMessageRef.current = onIncomingMessage;
  onIncomingProfileRef.current = onIncomingProfile;
  onDeliveryAckRef.current = onDeliveryAck;
  onQueuedMessageSentRef.current = onQueuedMessageSent;
  onQueuedMessageFailedRef.current = onQueuedMessageFailed;

  const teardownSession = useCallback(({ updateState = true } = {}) => {
    const conn = connRef.current;
    const peer = peerRef.current;

    peerRef.current = null;
    connRef.current = null;
    sharedKeyRef.current = null;
    imageTransfersRef.current = createIncomingImageTransferStore();
    conn?.close?.();
    peer?.destroy?.();
    if (updateState) {
      setPeerTyping(false);
      setStatus(SAVED_CHAT_STATUS.DISCONNECTED);
    }
  }, []);

  const resetConnection = useCallback(() => {
    teardownSession();
  }, [teardownSession]);

  useEffect(() => {
    let active = true;
    setStatus(SAVED_CHAT_STATUS.LOADING);
    setRoomCode(initialRoomCode || "");
    setPeerProfile(null);
    setPeerTyping(false);

    async function flushQueuedMessages(conn, sharedKey) {
      const queuedMessages = await loadQueuedMessagesRef.current?.();
      if (!queuedMessages?.length) return;

      for (const message of queuedMessages) {
        try {
          if (message.image) {
            await sendImageMessageOverConnection(conn, sharedKey, message);
          } else {
            await sendTextMessageOverConnection(conn, sharedKey, message);
          }
          await onQueuedMessageSentRef.current?.(message.id);
        } catch {
          await onQueuedMessageFailedRef.current?.(message.id);
          break;
        }
      }
    }

    async function initializeSession() {
      const identity = await getIdentity().catch(() => null);
      if (!identity || !active) return;

      await wakePeerServer();
      if (!active) return;

      async function handleData(data) {
        if (!active || !data || data.type === CHAT_PROTOCOL.PUBLIC_KEY) return;

        if (data.type === CHAT_PROTOCOL.PROFILE) {
          const profile = {
            displayName: data.displayName || "",
            avatar: data.avatar || null,
          };
          setPeerProfile(profile);
          await onIncomingProfileRef.current?.(profile);
          return;
        }

        if (data.type === CHAT_PROTOCOL.ACK) {
          await onDeliveryAckRef.current?.(data.msgId);
          return;
        }

        const sharedKey = sharedKeyRef.current;
        if (!sharedKey) return;

        if (data.type === CHAT_PROTOCOL.TYPING) {
          setPeerTyping(true);
          return;
        }

        if (data.type === CHAT_PROTOCOL.CLEAR) {
          setPeerTyping(false);
          return;
        }

        if (data.type === CHAT_PROTOCOL.MESSAGE) {
          setPeerTyping(false);
          try {
            const plaintext = await decrypt(sharedKey, data.payload);
            const message = createIncomingTextMessage({
              msgId: data.msgId,
              plaintext,
            });
            await onIncomingMessageRef.current?.(message);
            if (connRef.current?.open) {
              connRef.current.send(createAckMessage(message.id));
            }
          } catch {}
          return;
        }

        if (data.type === CHAT_PROTOCOL.IMAGE_START) {
          startIncomingImageTransfer(imageTransfersRef.current, data);
          return;
        }

        if (data.type === CHAT_PROTOCOL.IMAGE_CHUNK) {
          try {
            const piece = await decrypt(sharedKey, data.payload);
            appendIncomingImageChunk(
              imageTransfersRef.current,
              data.id,
              data.index,
              piece,
            );
          } catch {}
          return;
        }

        if (data.type === CHAT_PROTOCOL.IMAGE_END) {
          setPeerTyping(false);
          const dataUrl = completeIncomingImageTransfer(
            imageTransfersRef.current,
            data.id,
          );
          if (!dataUrl) return;

          const message = createIncomingImageMessage({
            msgId: data.id,
            dataUrl,
          });
          await onIncomingMessageRef.current?.(message);
          if (connRef.current?.open) {
            connRef.current.send(createAckMessage(message.id));
          }
        }
      }

      async function onConnectionOpen(conn) {
        if (!active) return;
        setStatus(SAVED_CHAT_STATUS.CONNECTING);

        try {
          const sharedKey = await performSecureHandshake(conn);
          if (!active) return;

          sharedKeyRef.current = sharedKey;
          setStatus(SAVED_CHAT_STATUS.CONNECTED);

          const profile = await getLocalProfile();
          conn.send({
            type: CHAT_PROTOCOL.PROFILE,
            displayName: profile.displayName || "",
            avatar: profile.avatar || null,
          });

          await flushQueuedMessages(conn, sharedKey);
        } catch {
          if (active) setStatus(SAVED_CHAT_STATUS.DISCONNECTED);
        }
      }

      function bindConnection(conn) {
        if (connRef.current && connRef.current !== conn) {
          conn.close();
          return;
        }
        connRef.current = conn;
        conn.on("open", () => onConnectionOpen(conn));
        conn.on("data", handleData);
        conn.on("close", resetConnection);
        conn.on("error", resetConnection);
      }

      if (initialRoomCode) {
        setStatus(SAVED_CHAT_STATUS.CONNECTING);
        const peer = createPeerClient();
        peerRef.current = peer;
        peer.on("open", () => {
          if (!active) return;
          const conn = peer.connect(initialRoomCode, { reliable: true });
          bindConnection(conn);
        });
        peer.on("error", () => {
          if (active) setStatus(SAVED_CHAT_STATUS.DISCONNECTED);
        });
        return;
      }

      let nextRoomCode = generateCode();
      setRoomCode(nextRoomCode);

      function startHost(code) {
        const peer = createPeerClient(code);
        peerRef.current = peer;

        peer.on("open", () => {
          if (!active) return;
          setStatus(SAVED_CHAT_STATUS.WAITING);
          notifyRef.current?.sendPing(contactHandle, identity.handle, code, {
            chatMode: "saved",
          });
        });

        peer.on("connection", (conn) => {
          if (!active) return;
          bindConnection(conn);
        });

        peer.on("error", (error) => {
          if (error?.type === "unavailable-id") {
            peer.destroy();
            nextRoomCode = generateCode();
            setRoomCode(nextRoomCode);
            startHost(nextRoomCode);
            return;
          }
          if (active) setStatus(SAVED_CHAT_STATUS.DISCONNECTED);
        });
      }

      startHost(nextRoomCode);
    }

    initializeSession();

    return () => {
      active = false;
      teardownSession({ updateState: false });
    };
  }, [
    contactHandle,
    initialRoomCode,
    reconnectKey,
    resetConnection,
    teardownSession,
  ]);

  const sendTyping = useCallback(async (text) => {
    const sharedKey = sharedKeyRef.current;
    const conn = connRef.current;
    if (!sharedKey || !conn?.open) return;
    try {
      const payload = await encrypt(sharedKey, text);
      conn.send({ type: CHAT_PROTOCOL.TYPING, payload });
    } catch {}
  }, []);

  const clearTyping = useCallback(() => {
    if (connRef.current?.open) {
      connRef.current.send({ type: CHAT_PROTOCOL.CLEAR });
    }
  }, []);

  const sendMessageNow = useCallback(async (message) => {
    const sharedKey = sharedKeyRef.current;
    const conn = connRef.current;
    if (!sharedKey || !conn?.open) {
      return { status: DELIVERY_STATUS.QUEUED };
    }

    try {
      if (message.image) {
        await sendImageMessageOverConnection(conn, sharedKey, message);
      } else {
        await sendTextMessageOverConnection(conn, sharedKey, message);
      }
      return { status: DELIVERY_STATUS.SENT };
    } catch {
      return { status: DELIVERY_STATUS.QUEUED };
    }
  }, []);

  const reconnect = useCallback(() => {
    teardownSession();
    setReconnectKey((value) => value + 1);
  }, [teardownSession]);

  const disconnect = useCallback(() => {
    teardownSession();
  }, [teardownSession]);

  return {
    status,
    roomCode,
    peerProfile,
    peerTyping,
    sendTyping,
    clearTyping,
    sendMessageNow,
    reconnect,
    disconnect,
  };
}
