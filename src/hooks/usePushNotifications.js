import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";

/**
 * usePushNotifications — registers for FCM push notifications on Android.
 *
 * @param {(token: string) => void} registerPushToken  callback from useNotify
 */
export function usePushNotifications(registerPushToken) {
  useEffect(() => {
    let appStateListener;

    async function setup() {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        console.log("[push] FCM token received:", token.value);
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
          if (data.room) {
            window.location.href = `/?room=${data.room}`;
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
