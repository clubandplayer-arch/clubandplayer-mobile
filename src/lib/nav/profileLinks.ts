export type AccountType = "club" | "player";

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

  return null;
}

export function profileCanonicalHref(profileId: string, accountType: AccountType): string {
  return accountType === "club" ? `/clubs/${profileId}` : `/players/${profileId}`;
}

export function profileAliasHref(profileId: string, accountType: AccountType): string {
  return accountType === "club" ? `/c/${profileId}` : `/u/${profileId}`;
}
