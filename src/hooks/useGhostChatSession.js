import { useEffect, useRef, useState } from "react";
import { encrypt, decrypt, getFingerprint } from "../utils/crypto";
import { compressImage } from "../utils/image";
import { playNotificationSound } from "../utils/sound";
import {
  startFlash,
  stopFlash,
  setScrollingTitle,
  resetTitle,
} from "../utils/notify";
import {
  CHAT_PROTOCOL,
  appendIncomingImageChunk,
  completeIncomingImageTransfer,
  createIncomingImageTransferStore,
  parseMessagePayload,
  serializeMessagePayload,
  startIncomingImageTransfer,
} from "../chat/protocol";
import { createChatMessage, createSystemMessage } from "../chat/messageModels";

function createUiIdGenerator(start = 1) {
  let current = start;
  return () => current++;
}

export function useGhostChatSession({ conn, sharedKey, settings }) {
  const [messages, setMessages] = useState([
    createSystemMessage(
      0,
      "encrypted connection established ✦ messages are end-to-end encrypted",
    ),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [fingerprint, setFingerprint] = useState("");

  const nextUiIdRef = useRef(createUiIdGenerator());
  const imageTransfersRef = useRef(createIncomingImageTransferStore());
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!sharedKey) return;
    getFingerprint(sharedKey).then(setFingerprint).catch(() => {});
  }, [sharedKey]);

  useEffect(() => {
    const onFocus = () => stopFlash();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function appendMessage(message) {
    setMessages((prev) => [...prev, message]);
    return message.id;
  }

  function appendSystemMessage(text) {
    appendMessage(createSystemMessage(nextUiIdRef.current(), text));
  }

  function scheduleDelete(id) {
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, fadingOut: true } : message,
        ),
      );
    }, 29000);
    setTimeout(() => {
      setMessages((prev) => prev.filter((message) => message.id !== id));
    }, 30000);
  }

  useEffect(() => {
    if (!conn || !sharedKey) return;

    const onData = async (data) => {
      if (data?.type === CHAT_PROTOCOL.PUBLIC_KEY) return;

      if (data?.type === CHAT_PROTOCOL.TYPING) {
        try {
          const text = await decrypt(sharedKey, data.payload);
          if (settingsRef.current.tabTitle) setScrollingTitle(text);
        } catch {}
        setPeerTyping(true);
        if (document.hidden) startFlash();
        return;
      }

      if (data?.type === CHAT_PROTOCOL.CLEAR) {
        resetTitle();
        setPeerTyping(false);
        stopFlash();
        return;
      }

      if (data?.type === CHAT_PROTOCOL.MESSAGE) {
        resetTitle();
        setPeerTyping(false);
        stopFlash();
        try {
          const plaintext = await decrypt(sharedKey, data.payload);
          const { text, replyTo } = parseMessagePayload(plaintext);
          const id = appendMessage(
            createChatMessage({
              id: nextUiIdRef.current(),
              type: "theirs",
              text,
              replyTo,
            }),
          );
          if (settingsRef.current.sounds) playNotificationSound();
          if (settingsRef.current.autoDelete) scheduleDelete(id);
        } catch {
          appendSystemMessage("\u26a0 failed to decrypt a message");
        }
        return;
      }

      if (data?.type === CHAT_PROTOCOL.IMAGE_START) {
        startIncomingImageTransfer(imageTransfersRef.current, data);
        return;
      }

      if (data?.type === CHAT_PROTOCOL.IMAGE_CHUNK) {
        try {
          const piece = await decrypt(sharedKey, data.payload);
          appendIncomingImageChunk(
            imageTransfersRef.current,
            data.id,
            data.index,
            piece,
          );
        } catch {
          appendSystemMessage("\u26a0 failed to decrypt image chunk");
        }
        return;
      }

      if (data?.type === CHAT_PROTOCOL.IMAGE_END) {
        resetTitle();
        setPeerTyping(false);
        const dataUrl = completeIncomingImageTransfer(imageTransfersRef.current, data.id);
        if (!dataUrl) {
          appendSystemMessage("\u26a0 incomplete image received");
          return;
        }
        const id = appendMessage(
          createChatMessage({
            id: nextUiIdRef.current(),
            type: "theirs",
            image: dataUrl,
          }),
        );
        if (settingsRef.current.sounds) playNotificationSound();
        if (settingsRef.current.autoDelete) scheduleDelete(id);
      }
    };

    const onClose = () => {
      setDisconnected(true);
      appendSystemMessage("peer disconnected");
      resetTitle();
    };

    conn.on("data", onData);
    conn.on("close", onClose);

    return () => {
      conn.off("data", onData);
      conn.off("close", onClose);
    };
  }, [conn, sharedKey]);

  async function updateInput(value) {
    setInputValue(value);
    if (value) {
      if (settingsRef.current.tabTitle) setScrollingTitle(value);
    } else {
      resetTitle();
    }

    if (!conn?.open || !sharedKey) return;
    if (value) {
      const payload = await encrypt(sharedKey, value);
      conn.send({ type: CHAT_PROTOCOL.TYPING, payload });
    } else {
      conn.send({ type: CHAT_PROTOCOL.CLEAR });
    }
  }

  async function queueImage(file) {
    if (!file) return false;

    try {
      const dataUrl = await compressImage(file);
      setPendingImage({ dataUrl, name: file.name });
      return true;
    } catch {
      appendSystemMessage("\u26a0 could not process that image");
      return false;
    }
  }

  async function sendCurrentMessage() {
    if (pendingImage) {
      await sendPendingImage();
      return true;
    }

    const text = inputValue.trim();
    if (!text || !conn?.open || !sharedKey) return false;

    try {
      const payload = await encrypt(
        sharedKey,
        serializeMessagePayload({
          text,
          replyTo: replyTarget
            ? { id: replyTarget.id, text: replyTarget.text }
            : null,
        }),
      );
      conn.send({ type: CHAT_PROTOCOL.MESSAGE, payload });
      conn.send({ type: CHAT_PROTOCOL.CLEAR });
    } catch {
      return false;
    }

    const id = appendMessage(
      createChatMessage({
        id: nextUiIdRef.current(),
        type: "mine",
        text,
        replyTo: replyTarget
          ? { id: replyTarget.id, text: replyTarget.text }
          : null,
      }),
    );
    if (settingsRef.current.autoDelete) scheduleDelete(id);
    setInputValue("");
    setReplyTarget(null);
    resetTitle();
    return true;
  }

  async function sendPendingImage() {
    if (!pendingImage || !conn?.open || !sharedKey) return false;

    try {
      const chunkSize = 12000;
      const transferId = Date.now().toString(36);
      const total = Math.ceil(pendingImage.dataUrl.length / chunkSize);

      conn.send({ type: CHAT_PROTOCOL.IMAGE_START, id: transferId, total });
      for (let i = 0; i < total; i += 1) {
        const piece = pendingImage.dataUrl.slice(i * chunkSize, (i + 1) * chunkSize);
        const payload = await encrypt(sharedKey, piece);
        conn.send({
          type: CHAT_PROTOCOL.IMAGE_CHUNK,
          id: transferId,
          index: i,
          payload,
        });
      }
      conn.send({ type: CHAT_PROTOCOL.IMAGE_END, id: transferId });
      conn.send({ type: CHAT_PROTOCOL.CLEAR });
    } catch {
      appendSystemMessage("\u26a0 failed to send image");
      setPendingImage(null);
      return false;
    }

    const id = appendMessage(
      createChatMessage({
        id: nextUiIdRef.current(),
        type: "mine",
        image: pendingImage.dataUrl,
      }),
    );
    if (settingsRef.current.autoDelete) scheduleDelete(id);
    setPendingImage(null);
    resetTitle();
    return true;
  }

  function selectReplyTarget(message) {
    setReplyTarget({
      id: message.id,
      text: message.image ? "" : message.text,
      image: message.image,
    });
  }

  function clearReplyTarget() {
    setReplyTarget(null);
  }

  return {
    state: {
      messages,
      inputValue,
      disconnected,
      peerTyping,
      pendingImage,
      replyTarget,
      fingerprint,
    },
    actions: {
      updateInput,
      queueImage,
      sendCurrentMessage,
      selectReplyTarget,
      clearReplyTarget,
      setPendingImage,
    },
  };
}
