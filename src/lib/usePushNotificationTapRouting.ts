import type { Router } from "expo-router";
import { useEffect, useRef } from "react";

type NotificationResponse = {
  notification?: {
    request?: {
      identifier?: string;
      content?: {
        data?: Record<string, unknown>;
      };
    };
  };
  actionIdentifier?: string;
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

const DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT";

export function usePushNotificationTapRouting(router: Router) {
  const handledResponsesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    let responseSubscription: NotificationSubscription | null = null;

    const responseKey = (response: NotificationResponse): string => {
      const identifier = response.notification?.request?.identifier;
      if (identifier) return identifier;
      const actionIdentifier = response.actionIdentifier ?? "unknown-action";
      const payload = response.notification?.request?.content?.data ?? {};
      return `${actionIdentifier}:${JSON.stringify(payload)}`;
    };

    const routeFromResponse = (response: NotificationResponse) => {
      const key = responseKey(response);
      if (handledResponsesRef.current.has(key)) {
        return;
      }
      handledResponsesRef.current.add(key);

      const data = response.notification?.request?.content?.data ?? {};
      if (data.kind !== "message") {
        return;
      }

      const senderProfileIdRaw = data.sender_profile_id;
      const profileId =
        typeof senderProfileIdRaw === "string" && senderProfileIdRaw.trim().length > 0
          ? senderProfileIdRaw.trim()
          : null;

      const threadIdRaw = data.thread_id;
      const threadId =
        typeof threadIdRaw === "string" && threadIdRaw.trim().length > 0 ? threadIdRaw.trim() : null;

      if (!profileId) {
        if (__DEV__) {
          console.log("[push][tap-routing] sender_profile_id missing", {
            threadId,
          });
        }
        return;
      }

      router.push(`/(tabs)/messages/${encodeURIComponent(profileId)}` as never);
    };

    const init = async () => {
      let notifications: NotificationsModule;
      try {
        const importer = new Function("moduleName", "return import(moduleName);") as (
          moduleName: string,
        ) => Promise<NotificationsModule>;
        notifications = await importer("expo-notifications");
      } catch (error) {
        if (__DEV__) {
          console.log("[push][tap-routing] expo-notifications unavailable", error);
        }
        return;
      }

      if (!active) {
        return;
      }

      responseSubscription = notifications.addNotificationResponseReceivedListener((response) => {
        const actionIdentifier = response.actionIdentifier;
        if (actionIdentifier && actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) {
          return;
        }
        routeFromResponse(response);
      });

      const lastResponse = await notifications.getLastNotificationResponseAsync();
      if (!active || !lastResponse) {
        return;
      }

      const actionIdentifier = lastResponse.actionIdentifier;
      if (actionIdentifier && actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) {
        return;
      }

      routeFromResponse(lastResponse);
    };

    void init();

    return () => {
      active = false;
      responseSubscription?.remove();
    };
  }, [router]);
}
