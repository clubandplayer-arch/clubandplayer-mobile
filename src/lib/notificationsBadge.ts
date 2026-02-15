import { useSyncExternalStore } from "react";

let badgeCount = 0;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function setNotificationsBadgeCount(nextCount: number) {
  const normalizedCount = Number.isFinite(nextCount) ? Math.max(0, Math.trunc(nextCount)) : 0;
  if (normalizedCount === badgeCount) return;
  badgeCount = normalizedCount;
  emitChange();
}

export function getNotificationsBadgeCount() {
  return badgeCount;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNotificationsBadgeCount() {
  return useSyncExternalStore(subscribe, getNotificationsBadgeCount, getNotificationsBadgeCount);
}
