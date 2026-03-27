import {
  DELIVERY_STATUS,
  createChatMessage,
} from "./messageModels";

export const CHAT_PROTOCOL = {
  PUBLIC_KEY: "__pubkey",
  PROFILE: "__profile",
  ACK: "ack",
  TYPING: "typing",
  CLEAR: "clear",
  MESSAGE: "message",
  IMAGE_START: "img-start",
  IMAGE_CHUNK: "img-chunk",
  IMAGE_END: "img-end",
};

export function serializeMessagePayload({ text, replyTo = null }) {
  return JSON.stringify({ text, replyTo });
}

export function parseMessagePayload(plaintext) {
  let text = plaintext;
  let replyTo = null;

  try {
    const parsed = JSON.parse(plaintext);
    if (parsed?.text !== undefined) {
      text = parsed.text;
      replyTo = parsed.replyTo || null;
    }
  } catch {
    // Backward compatibility with earlier plain-string payloads.
  }

  return { text, replyTo };
}

export function createTextTransportMessage({ msgId, payload }) {
  return { type: CHAT_PROTOCOL.MESSAGE, msgId, payload };
}

export function createAckMessage(msgId) {
  return { type: CHAT_PROTOCOL.ACK, msgId };
}

export function createIncomingImageTransferStore() {
  return Object.create(null);
}

export function startIncomingImageTransfer(store, { id, total }) {
  if (total > 50) return false;
  if (Object.keys(store).length > 3) return false;
  store[id] = {
    total,
    chunks: [],
    startTime: Date.now(),
  };
  return true;
}

export function appendIncomingImageChunk(store, id, index, value) {
  const transfer = store[id];
  if (!transfer) return null;
  if (Date.now() - transfer.startTime > 30000) {
    delete store[id];
    return null;
  }
  transfer.chunks[index] = value;
  return transfer;
}

export function completeIncomingImageTransfer(store, id) {
  const transfer = store[id];
  delete store[id];
  if (!transfer || transfer.chunks.length !== transfer.total) {
    return null;
  }
  return transfer.chunks.join("");
}

export function createIncomingTextMessage({ msgId, plaintext }) {
  const { text, replyTo } = parseMessagePayload(plaintext);
  return createChatMessage({
    id: msgId,
    type: "theirs",
    text,
    replyTo,
    status: DELIVERY_STATUS.RECEIVED,
  });
}

export function createIncomingImageMessage({ msgId, dataUrl }) {
  return createChatMessage({
    id: msgId,
    type: "theirs",
    image: dataUrl,
    status: DELIVERY_STATUS.RECEIVED,
  });
}
