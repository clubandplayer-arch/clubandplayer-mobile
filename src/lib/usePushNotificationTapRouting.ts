import * as Notifications from "expo-notifications";
import type { Router } from "expo-router";
import { useEffect, useRef } from "react";

function normalizeDataValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function extractTapTargetProfileId(response: Notifications.NotificationResponse): string {
  const data = response.notification.request.content.data ?? {};
  const kind = normalizeDataValue((data as Record<string, unknown>).kind);
  if (kind !== "message") return "";

  const senderProfileId = normalizeDataValue((data as Record<string, unknown>).sender_profile_id);
  if (senderProfileId) return senderProfileId;

  const threadId = normalizeDataValue((data as Record<string, unknown>).thread_id);
  return threadId;
}

function getResponseKey(response: Notifications.NotificationResponse): string {
  const notificationIdentifier = response.notification.request.identifier;
  const actionIdentifier = response.actionIdentifier;
  return `${notificationIdentifier}:${actionIdentifier}`;
}

export function usePushNotificationTapRouting(router: Router) {
  const handledResponseKeysRef = useRef(new Set<string>());
  const coldStartHandledRef = useRef(false);

  useEffect(() => {
    let active = true;

    const handleTapResponse = (response: Notifications.NotificationResponse) => {
      const key = getResponseKey(response);
      if (handledResponseKeysRef.current.has(key)) return;
      handledResponseKeysRef.current.add(key);

      const data = response.notification.request.content.data ?? {};
      const kind = normalizeDataValue((data as Record<string, unknown>).kind);
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

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!active) return;
      handleTapResponse(response);
    });

    void (async () => {
      if (coldStartHandledRef.current) return;
      coldStartHandledRef.current = true;

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (!active || !lastResponse) return;
      handleTapResponse(lastResponse);
    })();

    return () => {
      active = false;
      responseListener.remove();
    };
  }, [router]);
}
