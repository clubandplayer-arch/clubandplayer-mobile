import { useEffect } from "react";
import { fetchNotifications } from "./api";
import { setNotificationsBadgeCount } from "./notificationsBadge";
import { isNotificationLocallyRead, unmarkNotificationLocallyRead } from "./notificationsLocalRead";

function isReadByServer(item: { read?: boolean; read_at?: string | null }) {
  if (item.read === true) return true;
  if (typeof item.read_at === "string" && item.read_at.trim().length > 0) return true;
  return false;
}

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

        for (const item of items) {
          if (isReadByServer(item)) {
            unmarkNotificationLocallyRead(item.id);
          }
        }

        const count = items
          .filter((n) => !n.read_at && n.read !== true)
          .filter((n) => n.kind !== "message" && n.kind !== "new_message")
          .filter((n) => !isNotificationLocallyRead(n.id))
          .length;

        setNotificationsBadgeCount(count);
      }

      if (cancelled) return;
      timer = setTimeout(tick, 45_000); // parity web: 45s
    }

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
