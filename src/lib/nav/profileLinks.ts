export type AccountType = "club" | "player" | "fan";

export function normalizeAccountType(raw: unknown): AccountType | null {
  if (typeof raw !== "string") return null;

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === "club") return "club";

  const playerAliases = new Set([
    "player",
    "players",
    "athlete",
    "athlet",
    "atleta",
    "atleti",
    "calciatore",
    "giocatore",
    "utente",
    "user",
  ]);

  if (playerAliases.has(normalized)) return "player";
  if (normalized === "fan") return "fan";

  return null;
}

export function profileCanonicalHref(profileId: string, accountType: AccountType): string {
  if (accountType === "club") return `/clubs/${profileId}`;
  if (accountType === "fan") return `/u/${profileId}`;
  return `/players/${profileId}`;
}

export function profileAliasHref(profileId: string, accountType: AccountType): string {
  if (accountType === "club") return `/clubs/${profileId}`;
  return `/players/${profileId}`;
}
