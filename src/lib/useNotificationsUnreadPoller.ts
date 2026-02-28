import { useEffect } from "react";
import { fetchNotifications } from "./api";
import { setNotificationsBadgeCount } from "./notificationsBadge";

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
          .length;

        setNotificationsBadgeCount(count);
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
