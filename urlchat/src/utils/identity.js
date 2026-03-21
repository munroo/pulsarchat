/**
 * Identity — persistent handle + ECDH key pair stored in IndexedDB.
 *
 * On first visit: generates a random handle (e.g. "NOVA-3KF8") and an
 * ECDH P-256 key pair, serialises them, and persists to IndexedDB.
 * On subsequent visits: loads and returns the stored identity.
 *
 * Nothing is ever written to localStorage or sent to the server.
 */

const DB_NAME = "pulsarchat_identity";
const STORE = "identity";
const RECORD_KEY = "self";

// Exclude visually ambiguous characters (0/O, 1/I/L)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
    publicKey: Array.from(new Uint8Array(publicKeyRaw)),
    privateKey: Array.from(new Uint8Array(privateKeyPkcs8)),
  };
}

/**
 * Returns the stored identity, creating and persisting one on first call.
 * Shape: { handle: string, publicKey: number[], privateKey: number[] }
 */
export async function getIdentity() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(RECORD_KEY);
    req.onsuccess = async (e) => {
      if (e.target.result) {
        resolve(e.target.result);
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
