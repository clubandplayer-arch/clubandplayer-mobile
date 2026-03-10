export type ProfileDisplayNameInput = {
  account_type?: string | null;
  accountType?: string | null;
  type?: string | null;
  role?: string | null;
  club_name?: string | null;
  company_name?: string | null;
  profile_name?: string | null;
  name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  public_name?: string | null;
  username?: string | null;
  email?: string | null;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function pick(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const value = clean(candidate);
    if (!value) continue;
    if (isEmailLike(value)) continue;
    return value;
  }
  return "";
}

function resolveKind(input?: ProfileDisplayNameInput | null): "club" | "player" | "generic" {
  const raw = clean(input?.account_type ?? input?.accountType ?? input?.type ?? input?.role).toLowerCase();
  if (["club", "clubs", "team"].includes(raw)) return "club";
  if (["athlete", "player", "players"].includes(raw)) return "player";
  return "generic";
}

export function getProfileDisplayName(input?: ProfileDisplayNameInput | null): string {
  const kind = resolveKind(input);
  const fullName = [clean(input?.first_name), clean(input?.last_name)].filter(Boolean).join(" ");

  if (kind === "club") {
    const clubName = pick(
      input?.club_name,
      input?.company_name,
      input?.profile_name,
      input?.public_name,
      input?.name,
      input?.full_name,
      input?.display_name,
      input?.username,
    );
    return clubName || "Club";
  }

  if (kind === "player") {
    const playerName = pick(input?.full_name, fullName, input?.public_name, input?.display_name, input?.username);
    return playerName || "Player";
  }

  const genericName = pick(
    input?.club_name,
    input?.name,
    input?.full_name,
    fullName,
    input?.public_name,
    input?.display_name,
    input?.username,
  );

  return genericName || "Utente";
}