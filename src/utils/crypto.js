/**
 * End-to-End Encryption module using Web Crypto API.
 *
 * Flow:
 *  1. Each peer generates an ephemeral ECDH key pair on connect.
 *  2. Public keys are exchanged over the (already DTLS-encrypted) data channel.
 *  3. A shared AES-GCM key is derived via ECDH.
 *  4. Every message is encrypted before sending, decrypted on receipt.
 *
 * This adds defense-in-depth on top of WebRTC's built-in DTLS,
 * protecting against compromised TURN relays and signaling servers.
 */

const ECDH_PARAMS = { name: "ECDH", namedCurve: "P-256" };
const AES_PARAMS = { name: "AES-GCM", length: 256 };

// ── Key generation ─────────────────────────────────────

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    ECDH_PARAMS,
    true, // extractable – we need to export the public key
    ["deriveKey"],
  );
  return keyPair;
}

export async function exportPublicKey(publicKey) {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return Array.from(new Uint8Array(raw)); // JSON-safe
}

export async function importPublicKey(rawArray) {
  const raw = new Uint8Array(rawArray).buffer;
  return crypto.subtle.importKey("raw", raw, ECDH_PARAMS, true, []);
}

// ── Key derivation ─────────────────────────────────────

export async function deriveSharedKey(privateKey, remotePublicKey) {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: remotePublicKey },
    privateKey,
    AES_PARAMS,
    true, // extractable for fingerprinting
    ["encrypt", "decrypt"],
  );
}

// ── Fingerprint ─────────────────────────────────────────

export async function getFingerprint(sharedKey) {
  const raw = await crypto.subtle.exportKey("raw", sharedKey);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

// ── Encrypt / Decrypt ──────────────────────────────────

export async function encrypt(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    data,
  );
  // Base64 strings instead of number arrays — avoids PeerJS serializer overflow
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ct))),
  };
}

export async function decrypt(sharedKey, { iv, ciphertext }) {
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const ctBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    sharedKey,
    ctBytes,
  );
  return new TextDecoder().decode(pt);
}

// ── Chunked encrypt/decrypt for large data (images) ────

const CHUNK_SIZE = 16000; // safe for DataChannel

export async function encryptChunked(sharedKey, plaintext) {
  const chunks = [];
  for (let i = 0; i < plaintext.length; i += CHUNK_SIZE) {
    const chunk = plaintext.slice(i, i + CHUNK_SIZE);
    const encrypted = await encrypt(sharedKey, chunk);
    chunks.push(encrypted);
  }
  return chunks;
}

export async function decryptChunked(sharedKey, chunks) {
  const parts = [];
  for (const chunk of chunks) {
    parts.push(await decrypt(sharedKey, chunk));
  }
  return parts.join("");
}
