import type { Opportunity, OpportunityDetail } from "../../types/opportunity";

const GENDER_LABELS: Record<string, string> = {
  uomo: "Uomo",
  donna: "Donna",
  mixed: "Misto",
};

export function formatOpportunityGenderLabel(value?: string | null): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  return GENDER_LABELS[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveOpportunityClubAvatarUrl(item?: Opportunity | OpportunityDetail | null): string | null {
  if (!item) return null;
  const raw = item as Record<string, unknown>;
  return (
    pickString(raw.club_avatar_url) ??
    pickString(raw.club_logo_url) ??
    pickString(raw.club_image_url) ??
    pickString(raw.avatar_url) ??
    pickString((raw.club as Record<string, unknown> | undefined)?.avatar_url)
  );
}

export function getOpportunityClubInitial(name?: string | null): string {
  return String(name ?? "Club").trim().slice(0, 1).toUpperCase() || "C";
}
