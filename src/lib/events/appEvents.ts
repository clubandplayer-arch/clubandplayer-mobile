type AppEventHandler<T = unknown> = (payload?: T) => void;

const listeners = new Map<string, Set<AppEventHandler>>();
const activeEmits = new Set<string>();

export const APP_EVENTS = {
  notificationsUpdated: "notifications-updated",
  dmUpdated: "dm-updated",
} as const;

export function emit<T = unknown>(eventName: string, payload?: T) {
  const handlers = listeners.get(eventName);
  if (!handlers || handlers.size === 0) return;
  if (activeEmits.has(eventName)) return;

  activeEmits.add(eventName);
  try {
    handlers.forEach((handler) => {
      handler(payload);
    });
  } finally {
    activeEmits.delete(eventName);
  }
}

export function on<T = unknown>(eventName: string, handler: AppEventHandler<T>) {
  const current = listeners.get(eventName) ?? new Set<AppEventHandler>();
  current.add(handler as AppEventHandler);
  listeners.set(eventName, current);

  return () => {
    const active = listeners.get(eventName);
    if (!active) return;
    active.delete(handler as AppEventHandler);
    if (active.size === 0) {
      listeners.delete(eventName);
    }
  };
}
