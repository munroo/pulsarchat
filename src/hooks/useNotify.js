/**
 * useNotify — manages the WebSocket connection to the notification server.
 *
 * Responsibilities:
 *  - Connect to wss://urlchat.onrender.com/notify?handle=<myHandle>
 *  - Auto-reconnect on close/error (3 s back-off)
 *  - Expose sendPing(toHandle, fromHandle, room)
 *  - Expose queryStatus(handles[]) → updates onlineHandles set
 *  - Surface incomingPing: { from, room } when a ping arrives
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getIdentity } from "../utils/identity";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const NOTIFY_URL = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/notify`
  : "wss://urlchat.onrender.com/notify";

export function useNotify() {
  const wsRef = useRef(null);
  const activeRef = useRef(true);
  const [handle, setHandle] = useState(null);
  const [incomingPing, setIncomingPing] = useState(null); // { from, room }
  const [onlineHandles, setOnlineHandles] = useState(new Set());
  // Queue a status query to re-send once the socket is open
  const pendingStatusRef = useRef(null);

  useEffect(() => {
    activeRef.current = true;
    let ws;
    let reconnectTimer;

    async function connect() {
      let identity;
      try {
        identity = await getIdentity();
      } catch {
        return;
      }
      if (!activeRef.current) return;

      setHandle(identity.handle);

      ws = new WebSocket(`${NOTIFY_URL}?handle=${identity.handle}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (pendingStatusRef.current) {
          ws.send(
            JSON.stringify({
              type: "status",
              handles: pendingStatusRef.current,
            }),
          );
          pendingStatusRef.current = null;
        }
        if (pendingPushToken.current) {
          ws.send(
            JSON.stringify({
              type: "register-push-token",
              token: pendingPushToken.current,
            }),
          );
          console.log("[notify] queued push token sent");
        }
      };

      ws.onmessage = (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.type === "ping") {
          setIncomingPing({ from: msg.from, room: msg.room });
        } else if (msg.type === "status") {
          setOnlineHandles(new Set(msg.online));
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (activeRef.current) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      activeRef.current = false;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  // Force reconnect when the app returns to the foreground
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener("appStateChange", ({ isActive }) => {
        if (isActive && wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      });
      return () => {
        listener.then((l) => l.remove());
      };
    } else {
      function handleVisibility() {
        if (
          document.visibilityState === "visible" &&
          wsRef.current &&
          wsRef.current.readyState !== WebSocket.OPEN
        ) {
          wsRef.current.close();
          wsRef.current = null;
        }
      }
      document.addEventListener("visibilitychange", handleVisibility);
      return () =>
        document.removeEventListener("visibilitychange", handleVisibility);
    }
  }, []);

  const pendingPushToken = useRef(null);

  const registerPushToken = useCallback((token) => {
    pendingPushToken.current = token;
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "register-push-token", token }));
      console.log("[notify] push token sent");
    } else {
      console.log("[notify] push token queued (ws not ready)");
    }
  }, []);

  const sendPing = useCallback((toHandle, fromHandle, room) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: "ping", to: toHandle, from: fromHandle, room }),
      );
    }
  }, []);

  const queryStatus = useCallback((handleList) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "status", handles: handleList }));
    } else {
      // Will be sent once the socket reconnects
      pendingStatusRef.current = handleList;
    }
  }, []);

  const dismissPing = useCallback(() => setIncomingPing(null), []);

  return {
    handle,
    incomingPing,
    onlineHandles,
    sendPing,
    queryStatus,
    dismissPing,
    registerPushToken,
  };
}
