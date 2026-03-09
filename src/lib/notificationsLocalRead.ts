const locallyReadNotificationIds = new Set<string>();

function cleanId(input: string): string {
  return String(input ?? "").trim();
}

export function markNotificationLocallyRead(notificationId: string) {
  const id = cleanId(notificationId);
  if (!id) return;
  locallyReadNotificationIds.add(id);
}

export function unmarkNotificationLocallyRead(notificationId: string) {
  const id = cleanId(notificationId);
  if (!id) return;
  locallyReadNotificationIds.delete(id);
}

export function isNotificationLocallyRead(notificationId: string): boolean {
  const id = cleanId(notificationId);
  if (!id) return false;
  return locallyReadNotificationIds.has(id);
}

export function getLocallyReadNotificationIds(): string[] {
  return Array.from(locallyReadNotificationIds);
}
