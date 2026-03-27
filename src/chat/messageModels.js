const TIME_FORMATTER = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const DELIVERY_STATUS = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  DELIVERED: "delivered",
  RECEIVED: "received",
  FAILED: "failed",
};

export const SAVED_CHAT_STATUS = {
  LOADING: "loading",
  WAITING: "waiting",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
};

export function generateMessageId(prefix = "msg") {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const randomPart = Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function formatMessageTime(timestamp = Date.now()) {
  return TIME_FORMATTER.format(new Date(timestamp));
}

export function createChatMessage({
  id,
  type,
  text = "",
  image = null,
  replyTo = null,
  timestamp = Date.now(),
  time,
  status,
}) {
  return {
    id,
    type,
    text,
    image,
    replyTo,
    timestamp,
    time: time || formatMessageTime(timestamp),
    ...(status ? { status } : {}),
  };
}

export function createSystemMessage(id, text) {
  return { id, type: "sys", text };
}

export function toStoredMessageRecord(conversationHandle, message) {
  return {
    id: message.id,
    conversationHandle,
    type: message.type,
    text: message.text ?? "",
    image: message.image ?? null,
    replyTo: message.replyTo ?? null,
    timestamp: message.timestamp ?? Date.now(),
    time: message.time || formatMessageTime(message.timestamp),
    status: message.status || DELIVERY_STATUS.SENT,
  };
}

export function createConversationRecord(handle, overrides = {}) {
  return {
    handle,
    nickname: handle,
    avatar: null,
    lastMessage: "",
    lastTime: 0,
    unread: 0,
    ...overrides,
  };
}

export function getConversationPreview(message) {
  return message.image ? "\uD83D\uDCF7 image" : (message.text || "").slice(0, 60);
}
