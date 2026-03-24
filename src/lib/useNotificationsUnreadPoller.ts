import { useEffect } from "react";
import { fetchNotifications } from "./api";
import { setNotificationsBadgeCount } from "./notificationsBadge";
import { isNotificationLocallyRead } from "./notificationsLocalRead";
import { APP_EVENTS, on } from "./events/appEvents";


export function useNotificationsUnreadPoller(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;

    async function refreshUnreadCount() {
      if (inFlight) return;
      inFlight = true;

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
      inFlight = false;
    }

    async function tick() {
      await refreshUnreadCount();

      if (cancelled) return;
      timer = setTimeout(tick, 45_000); // parity web: 45s
    }

    void tick();
    const unsubscribe = on(APP_EVENTS.notificationsUpdated, () => {
      void refreshUnreadCount();
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
