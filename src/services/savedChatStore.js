import {
  createConversationRecord,
  getConversationPreview,
} from "../chat/messageModels";

const DB_NAME = "pulsarchat_saved";
const DB_VERSION = 1;
const PROFILE_STORE = "profile";
const PROFILE_KEY = "self";
const CONVERSATIONS_STORE = "conversations";
const MESSAGES_STORE = "messages";

let idbFailed = false;
const memProfile = { displayName: "", avatar: null };
const memConversations = new Map();
const memMessages = new Map();

function idbAvailable() {
  return !idbFailed && typeof window !== "undefined" && !!window.indexedDB;
}

function warnFallback(error) {
  console.warn(
    "[pulsarchat] Saved-mode storage unavailable, using in-memory fallback:",
    error,
  );
  idbFailed = true;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE);
      }

      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        db.createObjectStore(CONVERSATIONS_STORE, { keyPath: "handle" });
      }

      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: "id" });
        store.createIndex("byConversation", "conversationHandle", { unique: false });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function runRequest(storeName, mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    action(tx.objectStore(storeName), resolve, reject);
  });
}

function ensureMemConversation(handle) {
  if (!memConversations.has(handle)) {
    memConversations.set(handle, createConversationRecord(handle));
  }
  return memConversations.get(handle);
}

export async function getLocalProfileRecord() {
  if (!idbAvailable()) return { ...memProfile };
  try {
    const result = await runRequest(PROFILE_STORE, "readonly", (store, resolve, reject) => {
      const req = store.get(PROFILE_KEY);
      req.onsuccess = (event) => resolve(event.target.result || null);
      req.onerror = (event) => reject(event.target.error);
    });
    return result || { displayName: "", avatar: null };
  } catch (error) {
    warnFallback(error);
    return { ...memProfile };
  }
}

export async function setLocalProfileRecord(profile) {
  const nextProfile = {
    displayName: profile.displayName || "",
    avatar: profile.avatar || null,
  };

  if (!idbAvailable()) {
    memProfile.displayName = nextProfile.displayName;
    memProfile.avatar = nextProfile.avatar;
    return nextProfile;
  }

  try {
    await runRequest(PROFILE_STORE, "readwrite", (store, resolve, reject) => {
      const req = store.put(nextProfile, PROFILE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = (event) => reject(event.target.error);
    });
    return nextProfile;
  } catch (error) {
    warnFallback(error);
    memProfile.displayName = nextProfile.displayName;
    memProfile.avatar = nextProfile.avatar;
    return nextProfile;
  }
}

export async function listConversationRecords() {
  if (!idbAvailable()) {
    return [...memConversations.values()].sort((a, b) => b.lastTime - a.lastTime);
  }

  try {
    const records = await runRequest(CONVERSATIONS_STORE, "readonly", (store, resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = (event) => resolve(event.target.result);
      req.onerror = (event) => reject(event.target.error);
    });
    return records.sort((a, b) => b.lastTime - a.lastTime);
  } catch (error) {
    warnFallback(error);
    return [...memConversations.values()].sort((a, b) => b.lastTime - a.lastTime);
  }
}

export async function getConversationRecord(handle) {
  if (!idbAvailable()) {
    return memConversations.get(handle) || null;
  }

  try {
    return await runRequest(CONVERSATIONS_STORE, "readonly", (store, resolve, reject) => {
      const req = store.get(handle);
      req.onsuccess = (event) => resolve(event.target.result || null);
      req.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    warnFallback(error);
    return memConversations.get(handle) || null;
  }
}

export async function putConversationRecord(handle, updates) {
  const current = (await getConversationRecord(handle)) || createConversationRecord(handle);
  const nextConversation = { ...current, ...updates, handle };

  if (!idbAvailable()) {
    memConversations.set(handle, nextConversation);
    return nextConversation;
  }

  try {
    await runRequest(CONVERSATIONS_STORE, "readwrite", (store, resolve, reject) => {
      const req = store.put(nextConversation);
      req.onsuccess = () => resolve();
      req.onerror = (event) => reject(event.target.error);
    });
    return nextConversation;
  } catch (error) {
    warnFallback(error);
    memConversations.set(handle, nextConversation);
    return nextConversation;
  }
}

export async function listMessageRecords(handle, { limit = 50, offset = 0 } = {}) {
  const select = (messages) =>
    messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);

  if (!idbAvailable()) {
    return select([...(memMessages.get(handle) || [])]);
  }

  try {
    const messages = await runRequest(MESSAGES_STORE, "readonly", (store, resolve, reject) => {
      const req = store.index("byConversation").getAll(IDBKeyRange.only(handle));
      req.onsuccess = (event) => resolve(event.target.result);
      req.onerror = (event) => reject(event.target.error);
    });
    return select(messages);
  } catch (error) {
    warnFallback(error);
    return select([...(memMessages.get(handle) || [])]);
  }
}

export async function getMessageRecord(messageId) {
  if (!idbAvailable()) {
    for (const messages of memMessages.values()) {
      const match = messages.find((message) => message.id === messageId);
      if (match) return match;
    }
    return null;
  }

  try {
    return await runRequest(MESSAGES_STORE, "readonly", (store, resolve, reject) => {
      const req = store.get(messageId);
      req.onsuccess = (event) => resolve(event.target.result || null);
      req.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    warnFallback(error);
    for (const messages of memMessages.values()) {
      const match = messages.find((message) => message.id === messageId);
      if (match) return match;
    }
    return null;
  }
}

export async function putMessageRecord(handle, message) {
  const nextMessage = {
    ...message,
    conversationHandle: handle,
  };

  const existingMessage = await getMessageRecord(nextMessage.id);
  const isNewMessage = !existingMessage;
  const conversation = (await getConversationRecord(handle)) || createConversationRecord(handle);
  const preview = getConversationPreview(nextMessage);
  const nextUnread =
    isNewMessage &&
    nextMessage.type === "theirs" &&
    nextMessage.status !== "delivered"
      ? conversation.unread + 1
      : conversation.unread;
  const nextTimestamp = nextMessage.timestamp || Date.now();
  const shouldRefreshPreview =
    isNewMessage &&
    (!conversation.lastTime || nextTimestamp >= conversation.lastTime);

  await putConversationRecord(handle, {
    lastMessage: shouldRefreshPreview ? preview : conversation.lastMessage,
    lastTime: shouldRefreshPreview ? nextTimestamp : conversation.lastTime,
    unread: nextUnread,
  });

  if (!idbAvailable()) {
    if (!memMessages.has(handle)) memMessages.set(handle, []);
    const messages = memMessages.get(handle);
    const index = messages.findIndex((record) => record.id === nextMessage.id);
    if (index >= 0) messages[index] = nextMessage;
    else messages.push(nextMessage);
    return nextMessage;
  }

  try {
    await runRequest(MESSAGES_STORE, "readwrite", (store, resolve, reject) => {
      const req = store.put(nextMessage);
      req.onsuccess = () => resolve();
      req.onerror = (event) => reject(event.target.error);
    });
    return nextMessage;
  } catch (error) {
    warnFallback(error);
    if (!memMessages.has(handle)) memMessages.set(handle, []);
    const messages = memMessages.get(handle);
    const index = messages.findIndex((record) => record.id === nextMessage.id);
    if (index >= 0) messages[index] = nextMessage;
    else messages.push(nextMessage);
    return nextMessage;
  }
}

export async function updateMessageRecordStatus(messageId, status) {
  const message = await getMessageRecord(messageId);
  if (!message) return null;

  const nextMessage = { ...message, status };

  if (!idbAvailable()) {
    const messages = memMessages.get(message.conversationHandle) || [];
    const index = messages.findIndex((record) => record.id === messageId);
    if (index >= 0) messages[index] = nextMessage;
    return nextMessage;
  }

  try {
    await runRequest(MESSAGES_STORE, "readwrite", (store, resolve, reject) => {
      const req = store.put(nextMessage);
      req.onsuccess = () => resolve();
      req.onerror = (event) => reject(event.target.error);
    });
    return nextMessage;
  } catch (error) {
    warnFallback(error);
    const messages = memMessages.get(message.conversationHandle) || [];
    const index = messages.findIndex((record) => record.id === messageId);
    if (index >= 0) messages[index] = nextMessage;
    return nextMessage;
  }
}

export async function markConversationRecordRead(handle) {
  const conversation = await getConversationRecord(handle);
  if (!conversation || conversation.unread === 0) return;
  await putConversationRecord(handle, { unread: 0 });
}

export async function deleteConversationRecord(handle) {
  if (!idbAvailable()) {
    memConversations.delete(handle);
    memMessages.delete(handle);
    return;
  }

  try {
    await runRequest(CONVERSATIONS_STORE, "readwrite", (store, resolve, reject) => {
      const req = store.delete(handle);
      req.onsuccess = () => resolve();
      req.onerror = (event) => reject(event.target.error);
    });

    await runRequest(MESSAGES_STORE, "readwrite", (store, resolve, reject) => {
      const req = store.index("byConversation").openCursor(IDBKeyRange.only(handle));
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    warnFallback(error);
    memConversations.delete(handle);
    memMessages.delete(handle);
  }
}
