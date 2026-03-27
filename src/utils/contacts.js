/**
 * Contacts — save / load / delete contacts in IndexedDB.
 *
 * Falls back to an in-memory array if IndexedDB is unavailable (Firefox
 * private browsing, Samsung Browser quirks, etc.). Contacts won't persist
 * across page loads in that case, but the app won't break.
 *
 * Each contact: { handle: string, nickname: string }
 * handle is the primary key.
 */

import { normalizeHandle } from "./handle";

const DB_NAME = "pulsarchat_contacts";
const STORE = "contacts";

// Fallback state — set to true once IDB is confirmed unavailable
let idbFailed = false;
const memContacts = [];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: "handle" });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function idbAvailable() {
  return !idbFailed && typeof window !== "undefined" && !!window.indexedDB;
}

function warnFallback(e) {
  console.warn(
    "[pulsarchat] IndexedDB unavailable for contacts, using in-memory store:",
    e,
  );
  idbFailed = true;
}

export async function getContacts() {
  if (!idbAvailable()) return [...memContacts];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction(STORE, "readonly")
        .objectStore(STORE)
        .getAll();
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    warnFallback(e);
    return [...memContacts];
  }
}

export async function addContact(handle, nickname) {
  const normalizedHandle = normalizeHandle(handle);
  const contact = {
    handle: normalizedHandle,
    nickname: nickname || normalizedHandle,
  };
  if (!idbAvailable()) {
    const idx = memContacts.findIndex((c) => c.handle === normalizedHandle);
    if (idx >= 0) memContacts[idx] = contact;
    else memContacts.push(contact);
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction(STORE, "readwrite")
        .objectStore(STORE)
        .put(contact);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    warnFallback(e);
    const idx = memContacts.findIndex((c) => c.handle === normalizedHandle);
    if (idx >= 0) memContacts[idx] = contact;
    else memContacts.push(contact);
  }
}

export function updateContactNickname(handle, nickname) {
  return addContact(handle, nickname);
}

export async function deleteContact(handle) {
  const normalizedHandle = normalizeHandle(handle);
  if (!idbAvailable()) {
    const idx = memContacts.findIndex((c) => c.handle === normalizedHandle);
    if (idx >= 0) memContacts.splice(idx, 1);
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction(STORE, "readwrite")
        .objectStore(STORE)
        .delete(normalizedHandle);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    warnFallback(e);
    const idx = memContacts.findIndex((c) => c.handle === normalizedHandle);
    if (idx >= 0) memContacts.splice(idx, 1);
  }
}
