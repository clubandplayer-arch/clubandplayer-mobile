import { useEffect } from "react";
import { AppState } from "react-native";
import { fetchNotifications } from "./api";
import { on } from "./events/appEvents";
import { setNotificationsBadgeCount } from "./notificationsBadge";
import { isNotificationLocallyRead } from "./notificationsLocalRead";


export function useNotificationsUnreadPoller(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      const res = await fetchNotifications({ unread: true, limit: 100 });
      if (!cancelled && res.ok) {
        const items = res.data?.data ?? [];

        const count = items
          .filter((n) => !n.read_at && n.read !== true)
          .filter((n) => n.kind !== "message" && n.kind !== "new_message")
          .filter((n) => !isNotificationLocallyRead(n.id))
          .length;

        setNotificationsBadgeCount(count);
      }

      if (cancelled) return;
      timer = setTimeout(tick, 15_000);
    }

    function handleNotificationsUpdated() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      void tick();
    }

    void tick();
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      handleNotificationsUpdated();
    });
    const unsubscribe = on("app:notifications-updated", handleNotificationsUpdated);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      appStateSubscription.remove();
      unsubscribe();
    };
  }, [enabled]);
}
