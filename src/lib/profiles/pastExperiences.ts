import { CATEGORIES_BY_SPORT, SPORTS } from "../opportunities/formOptions";

export type PastExperience = {
  season: string;
  club: string;
  sport: string;
  category: string;
};

export const DEFAULT_CLUB_CATEGORIES = ["Altro", "Amatoriale", "Giovanili"] as const;

const SEASON_REGEX = /^(\d{4})\/(\d{2})$/;

export function getSeasonMaxStartYear(now = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 6 ? year : year - 1;
}

export function buildSeasonOptions(now = new Date()): string[] {
  const min = 2000;
  const max = getSeasonMaxStartYear(now);
  const seasons: string[] = [];
  for (let y = max; y >= min; y -= 1) {
    const end = String((y + 1) % 100).padStart(2, "0");
    seasons.push(`${y}/${end}`);
  }
  return seasons;
}

export function parseSeason(value: string): { startYear: number; endYear: number } | null {
  const trimmed = value.trim();
  const match = SEASON_REGEX.exec(trimmed);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endSuffix = Number(match[2]);
  const expectedEnd = (startYear + 1) % 100;
  if (endSuffix !== expectedEnd) return null;
  return { startYear, endYear: startYear + 1 };
}

export function isValidSeason(value: string, now = new Date()): boolean {
  const parsed = parseSeason(value);
  if (!parsed) return false;
  if (parsed.startYear < 2000) return false;
  if (parsed.startYear > getSeasonMaxStartYear(now)) return false;
  return true;
}

export function normalizeExperience(input: Partial<PastExperience>): PastExperience {
  return {
    season: typeof input.season === "string" ? input.season.trim() : "",
    club: typeof input.club === "string" ? input.club.trim() : "",
    sport: typeof input.sport === "string" ? input.sport.trim() : "",
    category: typeof input.category === "string" ? input.category.trim() : "",
  };
}

export function isExperienceEmpty(input: PastExperience): boolean {
  return !input.season && !input.club && !input.sport && !input.category;
}

export function isExperiencePartial(input: PastExperience): boolean {
  const values = [input.season, input.club, input.sport, input.category];
  const filled = values.filter(Boolean).length;
  return filled > 0 && filled < values.length;
}

export function getSportsOptions(): string[] {
  return [...SPORTS];
}

export function getCategoryOptionsForSport(sport: string): string[] {
  const normalized = sport.trim();
  if (!normalized) return [...DEFAULT_CLUB_CATEGORIES];
  return CATEGORIES_BY_SPORT[normalized] ?? [...DEFAULT_CLUB_CATEGORIES];
}

export function ensureCompatibleCategory(sport: string, category: string): string {
  const options = getCategoryOptionsForSport(sport);
  return options.includes(category.trim()) ? category.trim() : "";
}

export function sortExperiencesBySeasonDesc(items: PastExperience[]): PastExperience[] {
  return [...items].sort((a, b) => {
    const aSeason = parseSeason(a.season)?.startYear ?? -1;
    const bSeason = parseSeason(b.season)?.startYear ?? -1;
    return bSeason - aSeason;
  });
}
