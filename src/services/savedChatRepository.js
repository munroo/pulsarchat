import {
  createChatMessage,
  createConversationRecord,
  DELIVERY_STATUS,
  generateMessageId,
  toStoredMessageRecord,
} from "../chat/messageModels";
import {
  deleteConversationRecord,
  getConversationRecord,
  getLocalProfileRecord,
  listConversationRecords,
  listMessageRecords,
  markConversationRecordRead,
  putConversationRecord,
  putMessageRecord,
  setLocalProfileRecord,
  updateMessageRecordStatus,
} from "./savedChatStore";

function toUiMessage(record) {
  return createChatMessage(record);
}

export function listConversations() {
  return listConversationRecords();
}

export async function loadConversationMessages(handle, { limit = 50, offset = 0 } = {}) {
  const records = await listMessageRecords(handle, { limit, offset });
  return records.map(toUiMessage);
}

export async function createOutgoingTextDraft(handle, { text, replyTo, status }) {
  const message = createChatMessage({
    id: generateMessageId(),
    type: "mine",
    text,
    replyTo: replyTo || null,
    status,
  });
  const stored = await putMessageRecord(handle, toStoredMessageRecord(handle, message));
  return toUiMessage(stored);
}

export async function createOutgoingImageDraft(handle, { dataUrl, status }) {
  const message = createChatMessage({
    id: generateMessageId(),
    type: "mine",
    image: dataUrl,
    status,
  });
  const stored = await putMessageRecord(handle, toStoredMessageRecord(handle, message));
  return toUiMessage(stored);
}

export async function saveIncomingMessage(handle, message) {
  const stored = await putMessageRecord(handle, toStoredMessageRecord(handle, message));
  return toUiMessage(stored);
}

export async function saveMessageStatus(messageId, status) {
  const nextMessage = await updateMessageRecordStatus(messageId, status);
  return nextMessage ? toUiMessage(nextMessage) : null;
}

export async function loadQueuedMessages(handle) {
  const messages = await listMessageRecords(handle, { limit: 1000, offset: 0 });
  const replayable = [];

  for (const message of messages) {
    if (
      message.type === "mine" &&
      [DELIVERY_STATUS.QUEUED, DELIVERY_STATUS.SENDING].includes(message.status)
    ) {
      if (message.status === DELIVERY_STATUS.SENDING) {
        await updateMessageRecordStatus(message.id, DELIVERY_STATUS.QUEUED);
        replayable.push({ ...message, status: DELIVERY_STATUS.QUEUED });
      } else {
        replayable.push(message);
      }
    }
  }

  replayable.sort((a, b) => a.timestamp - b.timestamp);
  return replayable.map(toUiMessage);
}

export function markConversationRead(handle) {
  return markConversationRecordRead(handle);
}

export function removeConversation(handle) {
  return deleteConversationRecord(handle);
}

export async function updateConversationProfile(handle, profile) {
  const current = (await getConversationRecord(handle)) || createConversationRecord(handle);
  return putConversationRecord(handle, {
    nickname: profile.displayName || current.nickname,
    avatar: profile.avatar || current.avatar || null,
  });
}

export function getLocalProfile() {
  return getLocalProfileRecord();
}

export function saveLocalProfile(profile) {
  return setLocalProfileRecord(profile);
}
