import { useEffect } from "react";
import { fetchNotificationsUnreadCount } from "./api";
import { setNotificationsBadgeCount } from "./notificationsBadge";

export function useNotificationsUnreadPoller(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      const res = await fetchNotificationsUnreadCount();
      if (!cancelled && res.ok) {
        const next = typeof res.data?.count === "number" ? res.data.count : 0;
        setNotificationsBadgeCount(next);
      }

      if (cancelled) return;
      timer = setTimeout(tick, 45_000); // parity web: 45s
    }

    // first run immediately
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}