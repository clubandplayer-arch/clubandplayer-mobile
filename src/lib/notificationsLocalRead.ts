const pendingReadNotificationIds = new Map<string, number>();

const PENDING_READ_TTL_MS = 60_000;

function cleanId(input: string): string {
  return String(input ?? "").trim();
}

function isExpired(markedAt: number): boolean {
  return Date.now() - markedAt > PENDING_READ_TTL_MS;
}

function purgeExpiredPendingReadIds() {
  for (const [id, markedAt] of pendingReadNotificationIds.entries()) {
    if (isExpired(markedAt)) {
      pendingReadNotificationIds.delete(id);
    }
  }
}

export function markNotificationLocallyRead(notificationId: string) {
  const id = cleanId(notificationId);
  if (!id) return;
  pendingReadNotificationIds.set(id, Date.now());
}

export function unmarkNotificationLocallyRead(notificationId: string) {
  const id = cleanId(notificationId);
  if (!id) return;
  pendingReadNotificationIds.delete(id);
}

export function isNotificationLocallyRead(notificationId: string): boolean {
  purgeExpiredPendingReadIds();

  const id = cleanId(notificationId);
  if (!id) return false;

  const markedAt = pendingReadNotificationIds.get(id);
  if (typeof markedAt !== "number") return false;

  if (isExpired(markedAt)) {
    pendingReadNotificationIds.delete(id);
    return false;
  }

  return true;
}

export function settleNotificationReadFromServer(params: {
  notificationId: string;
  read: boolean;
  readAt?: string | null;
}) {
  const id = cleanId(params.notificationId);
  if (!id) return;

  const serverRead = params.read || (typeof params.readAt === "string" && params.readAt.trim().length > 0);
  if (serverRead) {
    pendingReadNotificationIds.delete(id);
  }
}

export function clearAllLocallyReadNotifications() {
  pendingReadNotificationIds.clear();
}

export function getLocallyReadNotificationIds(): string[] {
  purgeExpiredPendingReadIds();
  return Array.from(pendingReadNotificationIds.keys());
}
