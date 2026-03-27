import Peer from "peerjs";
import { getServerConfig } from "../utils/serverConfig";

const SERVER_CONFIG = getServerConfig();

export function getIceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  if (import.meta.env.VITE_TURN_URL) {
    servers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export async function wakePeerServer() {
  if (!SERVER_CONFIG?.wakeUrl) return;
  await fetch(SERVER_CONFIG.wakeUrl).catch(() => {});
}

export function createPeerClient(id, options = {}) {
  const opts = {
    config: { iceServers: options.iceServers || getIceServers() },
    pingInterval: 5000,
  };

  if (SERVER_CONFIG?.peer) {
    opts.host = SERVER_CONFIG.peer.host;
    opts.port = SERVER_CONFIG.peer.port;
    opts.path = SERVER_CONFIG.peer.path;
    opts.secure = SERVER_CONFIG.peer.secure;
  }

  return id !== undefined ? new Peer(id, opts) : new Peer(opts);
}
