/**
 * useNotify — manages the WebSocket connection to the notification server.
 *
 * Responsibilities:
 *  - Connect to the notify WebSocket with the local identity
 *  - Auto-reconnect on close/error (3 s back-off)
 *  - Expose sendPing(toHandle, fromHandle, room, { chatMode })
 *  - Expose queryStatus(handles[]) → updates onlineHandles set
 *  - Surface incomingPing: { from, room, chatMode } when a ping arrives
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { getIdentity } from "../utils/identity";
import { getServerConfig } from "../utils/serverConfig";

const NOTIFY_URL = getServerConfig()?.notifyUrl || "";

export function useNotify() {
  const wsRef = useRef(null);
  const activeRef = useRef(true);
  const pendingStatusRef = useRef(null);
  const pendingPushTokenRef = useRef(null);

  const [handle, setHandle] = useState(null);
  const [incomingPing, setIncomingPing] = useState(null);
  const [onlineHandles, setOnlineHandles] = useState(new Set());

  useEffect(() => {
    activeRef.current = true;
    let reconnectTimer;

    async function connect() {
      if (!NOTIFY_URL) return;

      let identity;
      try {
        identity = await getIdentity();
      } catch {
        return;
      }
      if (!activeRef.current) return;

      setHandle(identity.handle);

      const ws = new WebSocket(
        `${NOTIFY_URL}?handle=${identity.handle}&token=${identity.token}`,
      );
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

        if (pendingPushTokenRef.current) {
          ws.send(
            JSON.stringify({
              type: "register-push-token",
              token: pendingPushTokenRef.current,
            }),
          );
        }
      };

      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === "ping") {
          setIncomingPing({
            from: message.from,
            room: message.room,
            chatMode: message.chatMode || "ghost",
          });
          return;
        }

        if (message.type === "status") {
          setOnlineHandles(new Set(message.online));
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

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener("appStateChange", ({ isActive }) => {
        if (isActive && wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      });
      return () => {
        listener.then((result) => result.remove());
      };
    }

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
  }, []);

  const registerPushToken = useCallback((token) => {
    pendingPushTokenRef.current = token;
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "register-push-token", token }));
    }
  }, []);

  const sendPing = useCallback((toHandle, fromHandle, room, options = {}) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "ping",
          to: toHandle,
          from: fromHandle,
          room,
          chatMode: options.chatMode || "ghost",
        }),
      );
    }
  }, []);

  const queryStatus = useCallback((handleList) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "status", handles: handleList }));
    } else {
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
