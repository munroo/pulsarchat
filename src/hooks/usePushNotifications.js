import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";

/**
 * usePushNotifications — registers for FCM push notifications on Android.
 *
 * @param {(token: string) => void} registerPushToken  callback from useNotify
 */
export function usePushNotifications(registerPushToken) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    let appStateListener;

    function buildPingUrl(data) {
      if (data.chatMode === "saved" && data.senderHandle && data.room) {
        const params = new URLSearchParams({
          savedRoom: data.room,
          contact: data.senderHandle.toUpperCase(),
        });
        return `/?${params.toString()}`;
      }

      if (data.room) {
        const params = new URLSearchParams({ room: data.room });
        return `/?${params.toString()}`;
      }

      return null;
    }

    async function setup() {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        // Create notification channel (required for Android 8+)
        await PushNotifications.createChannel({
          id: "pulsarchat_pings",
          name: "Pings",
          description: "Notifications when someone wants to chat",
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: "default",
        }).catch(() => {});

        // Send token to server
        registerPushToken(token.value);
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("[push] registration failed:", error);
      });

      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          const data = action.notification.data;
          const targetUrl = buildPingUrl(data);
          if (targetUrl) {
            window.location.href = targetUrl;
          }
        },
      );

      // Re-register on app resume so the token stays fresh
      appStateListener = await App.addListener(
        "appStateChange",
        ({ isActive }) => {
          if (isActive) {
            PushNotifications.register();
          }
        },
      );
    }

    setup().catch(() => {});

    return () => {
      PushNotifications.removeAllListeners();
      appStateListener?.remove();
    };
  }, [registerPushToken]);
}
