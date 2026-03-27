import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
} from "../utils/crypto";
import { CHAT_PROTOCOL } from "./protocol";

export function performSecureHandshake(conn, { onReady } = {}) {
  if (!crypto?.subtle) {
    return Promise.reject(
      new Error("E2EE requires HTTPS or localhost — current origin is insecure"),
    );
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    let remotePublicKey = null;
    let localKeyPair = null;
    let localPublicKey = null;
    let retryTimer = null;

    const onData = (data) => {
      if (data?.type !== CHAT_PROTOCOL.PUBLIC_KEY) return;
      conn.off("data", onData);
      remotePublicKey = data.key;
      tryDerive();
    };
    conn.on("data", onData);

    generateKeyPair()
      .then(async (keyPair) => {
        localKeyPair = keyPair;
        localPublicKey = await exportPublicKey(keyPair.publicKey);
        conn.send({ type: CHAT_PROTOCOL.PUBLIC_KEY, key: localPublicKey });
        retryTimer = setInterval(() => {
          if (!resolved && conn.open) {
            conn.send({ type: CHAT_PROTOCOL.PUBLIC_KEY, key: localPublicKey });
          }
        }, 500);
        tryDerive();
      })
      .catch(reject);

    function tryDerive() {
      if (resolved || !remotePublicKey || !localKeyPair) return;
      resolved = true;
      if (retryTimer) clearInterval(retryTimer);

      importPublicKey(remotePublicKey)
        .then((remoteKey) =>
          deriveSharedKey(localKeyPair.privateKey, remoteKey),
        )
        .then((sharedKey) => {
          onReady?.(sharedKey);
          resolve(sharedKey);
        })
        .catch(reject);
    }

    setTimeout(() => {
      if (!resolved) {
        if (retryTimer) clearInterval(retryTimer);
        conn.off("data", onData);
        reject(new Error("E2EE handshake timed out"));
      }
    }, 15000);
  });
}
