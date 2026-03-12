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
  const club = raw.club as Record<string, unknown> | undefined;

  return (
    pickString(raw.club_avatar_url) ??
    pickString(raw.clubAvatarUrl) ??
    pickString(raw.club_logo_url) ??
    pickString(raw.clubLogoUrl) ??
    pickString(raw.club_image_url) ??
    pickString(raw.clubImageUrl) ??
    pickString(raw.club_profile_avatar_url) ??
    pickString(raw.clubProfileAvatarUrl) ??
    pickString(raw.avatar_url) ??
    pickString(raw.avatarUrl) ??
    pickString(raw.image_url) ??
    pickString(raw.imageUrl) ??
    pickString(club?.avatar_url) ??
    pickString(club?.avatarUrl) ??
    pickString(club?.logo_url) ??
    pickString(club?.logoUrl) ??
    pickString(club?.image_url) ??
    pickString(club?.imageUrl)
  );
}

export function getOpportunityClubInitial(name?: string | null): string {
  return String(name ?? "Club").trim().slice(0, 1).toUpperCase() || "C";
}
