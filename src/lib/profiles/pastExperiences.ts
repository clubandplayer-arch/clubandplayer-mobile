import { CATEGORIES_BY_SPORT, SPORTS } from "../opportunities/formOptions";

export const PAST_EXPERIENCES_START_SEASON_YEAR = 2000;

const SPORT_ALIASES: Record<string, string> = {
  Pallavolo: "Volley",
};

const DEFAULT_CLUB_CATEGORIES: string[] = ["Altro"];

export type PastExperienceInput = {
  season?: string | null;
  club?: string | null;
  sport?: string | null;
  category?: string | null;
};

export type PastExperience = {
  season: string;
  club: string;
  sport: string;
  category: string;
};

export function normalizeSport(input?: string | null): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return SPORT_ALIASES[trimmed] ?? trimmed;
}

export function getLatestAvailableSeasonStartYear(now: Date = new Date()): number {
  const year = now.getFullYear();
  const isFromJuly = now.getMonth() >= 6;
  return isFromJuly ? year : year - 1;
}

export function formatSeasonLabel(startYear: number): string {
  const suffix = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}/${suffix}`;
}

export function getSeasonOptions(now: Date = new Date()): string[] {
  const maxStartYear = getLatestAvailableSeasonStartYear(now);
  const seasons: string[] = [];
  for (let y = PAST_EXPERIENCES_START_SEASON_YEAR; y <= maxStartYear; y += 1) {
    seasons.push(formatSeasonLabel(y));
  }
  return seasons;
}

export function parseSeasonLabel(season: string): { startYear: number; endYear: number } | null {
  const match = season.trim().match(/^(\d{4})\/(\d{2})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const suffix = Number(match[2]);
  if (!Number.isInteger(startYear) || !Number.isInteger(suffix)) return null;
  const endYear = Math.floor(startYear / 100) * 100 + suffix;
  if (endYear !== startYear + 1) return null;
  return { startYear, endYear };
}

export function sanitizePastExperience(input: PastExperienceInput): PastExperience {
  const sport = normalizeSport((input.sport || "").trim()) || (input.sport || "").trim();
  return {
    season: (input.season || "").trim(),
    club: (input.club || "").trim(),
    sport,
    category: (input.category || "").trim(),
  };
}

export function isPastExperienceEmpty(experience: PastExperience): boolean {
  return !experience.season && !experience.club && !experience.sport && !experience.category;
}

export function isPastExperienceComplete(experience: PastExperience): boolean {
  return !!experience.season && !!experience.club && !!experience.sport && !!experience.category;
}

export function getPastExperienceCategoriesBySport(sport: string): string[] {
  const normalizedSport = normalizeSport(sport) || sport;
  return CATEGORIES_BY_SPORT[normalizedSport] ?? DEFAULT_CLUB_CATEGORIES;
}

export function getPastExperienceSportsOptions(): string[] {
  return [...SPORTS];
}

export function ensurePastExperienceCategory(experience: PastExperience): PastExperience {
  if (!experience.sport) return { ...experience, category: "" };
  const categories = getPastExperienceCategoriesBySport(experience.sport);
  if (experience.category && categories.includes(experience.category)) return experience;
  return { ...experience, category: "" };
}
