import type { Router } from "expo-router";
import { useEffect, useRef } from "react";

type NotificationResponse = {
  actionIdentifier?: string;
  notification: {
    request: {
      identifier?: string;
      content: {
        data?: Record<string, unknown>;
      };
    };
  };
};

type NotificationSubscription = {
  remove: () => void;
};

type NotificationsModule = {
  addNotificationResponseReceivedListener: (
    listener: (response: NotificationResponse) => void,
  ) => NotificationSubscription;
  getLastNotificationResponseAsync: () => Promise<NotificationResponse | null>;
};

function normalizeDataValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function extractTapTargetProfileId(response: NotificationResponse): string {
  const data = response.notification.request.content.data ?? {};
  const kind = normalizeDataValue(data.kind);
  if (kind !== "message") return "";

  const senderProfileId = normalizeDataValue(data.sender_profile_id);
  if (senderProfileId) return senderProfileId;

  const threadId = normalizeDataValue(data.thread_id);
  return threadId;
}

function getResponseKey(response: NotificationResponse): string {
  const notificationIdentifier = normalizeDataValue(response.notification.request.identifier);
  const actionIdentifier = normalizeDataValue(response.actionIdentifier);
  return `${notificationIdentifier}:${actionIdentifier}`;
}

export function usePushNotificationTapRouting(router: Router) {
  const handledResponseKeysRef = useRef(new Set<string>());
  const coldStartHandledRef = useRef(false);

  useEffect(() => {
    let active = true;
    let responseListener: NotificationSubscription | null = null;

    const handleTapResponse = (response: NotificationResponse) => {
      const key = getResponseKey(response);
      if (handledResponseKeysRef.current.has(key)) return;
      handledResponseKeysRef.current.add(key);

      const data = response.notification.request.content.data ?? {};
      const kind = normalizeDataValue(data.kind);
      if (kind !== "message") return;

      const profileId = extractTapTargetProfileId(response);
      if (!profileId) {
        if (__DEV__) {
          console.log("[push][tap][message][missing-profile-id]", {
            notificationIdentifier: response.notification.request.identifier,
            kind,
            data,
          });
        }
        return;
      }

      router.push(`/(tabs)/messages/${encodeURIComponent(profileId)}` as never);
    };

    void (async () => {
      let Notifications: NotificationsModule;
      try {
        const dynamicImport = new Function("moduleName", "return import(moduleName);") as (
          moduleName: string,
        ) => Promise<unknown>;
        const module = await dynamicImport("expo-notifications");
        Notifications = module as NotificationsModule;
      } catch (error) {
        if (__DEV__) {
          console.log("[push][tap][notifications-unavailable]", {
            message: error instanceof Error ? error.message : String(error ?? "unknown_error"),
          });
        }
        return;
      }

      if (!active) return;

      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        if (!active) return;
        handleTapResponse(response);
      });

      if (coldStartHandledRef.current) return;
      coldStartHandledRef.current = true;

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (!active || !lastResponse) return;
      handleTapResponse(lastResponse);
    })();

    return () => {
      active = false;
      responseListener?.remove();
      responseListener = null;
    };
  }, [router]);
}
