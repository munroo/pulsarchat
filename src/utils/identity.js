/**
 * Identity — persistent handle + ECDH key pair stored in IndexedDB.
 *
 * On first visit: generates a random handle (e.g. "NOVA-3KF8") and an
 * ECDH P-256 key pair, serialises them, and persists to IndexedDB.
 * On subsequent visits: loads and returns the stored identity.
 *
 * Falls back to sessionStorage if IndexedDB is unavailable (Firefox private
 * browsing, Samsung Browser quirks, blocked by permissions policy, etc.).
 */

const DB_NAME = "pulsarchat_identity";
const STORE = "identity";
const RECORD_KEY = "self";
const SESSION_KEY = "pulsarchat_identity";

// Exclude visually ambiguous characters (0/O, 1/I/L)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function generateHandle() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let result = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += "-";
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result; // e.g. "NOVA-3KF8"
}

async function createIdentity() {
  const handle = generateHandle();
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyPkcs8 = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey,
  );
  return {
    handle,
    token: generateToken(),
    publicKey: Array.from(new Uint8Array(publicKeyRaw)),
    privateKey: Array.from(new Uint8Array(privateKeyPkcs8)),
  };
}

async function getFromIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(RECORD_KEY);
    req.onsuccess = async (e) => {
      if (e.target.result) {
        const identity = e.target.result;
        if (!identity.token) {
          identity.token = generateToken();
          store.put(identity, RECORD_KEY);
        }
        resolve(identity);
      } else {
        try {
          const identity = await createIdentity();
          store.put(identity, RECORD_KEY);
          resolve(identity);
        } catch (err) {
          reject(err);
        }
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Returns the stored identity, creating and persisting one on first call.
 * Shape: { handle: string, publicKey: number[], privateKey: number[] }
 *
 * Never throws — falls back to sessionStorage if IndexedDB is unavailable.
 */
export async function getIdentity() {
  // Feature-detect IndexedDB before touching it
  if (typeof window !== "undefined" && window.indexedDB) {
    try {
      return await getFromIndexedDB();
    } catch (e) {
      console.warn(
        "[pulsarchat] IndexedDB unavailable, falling back to sessionStorage:",
        e,
      );
    }
  }

  // sessionStorage fallback: works everywhere, lasts for the tab session
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.handle) return parsed;
    }
  } catch {
    // sessionStorage blocked (e.g. some strict private modes) — proceed to generate
  }

  const identity = await createIdentity();
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
  } catch {
    // Can't persist — return ephemeral identity for this page load
  }
  return identity;
}
