import { Capacitor } from "@capacitor/core";

let hasWarnedMissingNativeServerUrl = false;

function parseConfiguredServerUrl() {
  const raw = import.meta.env.VITE_SERVER_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const isSecure = url.protocol === "https:" || url.protocol === "wss:";
    const wsProtocol = isSecure ? "wss:" : "ws:";
    const httpProtocol = isSecure ? "https:" : "http:";

    return {
      notifyUrl: `${wsProtocol}//${url.host}/notify`,
      peer: {
        host: url.hostname,
        port: url.port ? Number(url.port) : isSecure ? 443 : 80,
        path: "/peerjs",
        secure: isSecure,
      },
      wakeUrl: `${httpProtocol}//${url.host}/peerjs`,
    };
  } catch {
    return null;
  }
}

function isNativeRuntime() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function getLocalDevServerConfig() {
  if (typeof window === "undefined") return null;
  if (isNativeRuntime()) return null;

  const { hostname, origin, protocol, port } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";

  if (!isLocalHost) return null;

  return {
    notifyUrl: `${origin}/notify`,
    peer: {
      host: hostname,
      port: port ? Number(port) : protocol === "https:" ? 443 : 80,
      path: "/peerjs",
      secure: protocol === "https:",
    },
    wakeUrl: `${origin}/peerjs`,
  };
}

export function getServerConfig() {
  const configured = parseConfiguredServerUrl();
  if (configured) return configured;

  const localDev = getLocalDevServerConfig();
  if (localDev) return localDev;

  if (isNativeRuntime() && !hasWarnedMissingNativeServerUrl) {
    hasWarnedMissingNativeServerUrl = true;
    console.warn(
      "[serverConfig] Native builds require VITE_SERVER_URL. Same-origin localhost proxying only works in browser-local development.",
    );
  }

  return null;
}
