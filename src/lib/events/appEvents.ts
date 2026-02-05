type AppEventHandler<T = unknown> = (payload?: T) => void;

const listeners = new Map<string, Set<AppEventHandler>>();

export function emit<T = unknown>(eventName: string, payload?: T) {
  const handlers = listeners.get(eventName);
  if (!handlers || handlers.size === 0) return;

  handlers.forEach((handler) => {
    handler(payload);
  });
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
