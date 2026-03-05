export function isEmailLike(s: string): boolean {
  return s.includes("@");
}

function normalizeNamePart(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveDisplayName(input: {
  full_name?: unknown;
  display_name?: unknown;
  fallback?: string;
}): string {
  const fullName = normalizeNamePart(input.full_name);
  if (fullName && !isEmailLike(fullName)) return fullName;

  const displayName = normalizeNamePart(input.display_name);
  if (displayName && !isEmailLike(displayName)) return displayName;

  const fallback = (input.fallback ?? "Utente").trim();
  return fallback.length > 0 ? fallback : "Utente";
}
