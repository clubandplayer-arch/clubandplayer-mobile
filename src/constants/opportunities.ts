export const SPORTS = ["Calcio", "Basket", "Volley", "Tennis", "Atletica"] as const;

export const SPORTS_ROLES: Record<string, readonly string[]> = {
  Calcio: ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
  Basket: ["Playmaker", "Guardia", "Ala", "Centro"],
  Volley: ["Palleggiatore", "Schiacciatore", "Centrale", "Libero", "Opposto"],
  Tennis: [],
  Atletica: [],
};

export const AGE_BRACKETS = ["17-20", "21-25", "26-30", "31+", "Indifferente"] as const;

export const CATEGORIES_BY_SPORT: Record<string, readonly string[]> = {
  Calcio: ["Prima Squadra", "Juniores", "Allievi", "Giovanissimi"],
  Basket: ["Senior", "Under 19", "Under 17"],
  Volley: ["Senior", "Under 18", "Under 16"],
  Tennis: ["Agonistica", "Amatoriale"],
  Atletica: ["Pista", "Strada", "Trail"],
};

export const COUNTRIES = ["Italia", "Spagna", "Francia", "Germania", "Regno Unito", "Portogallo", "Paesi Bassi", "Belgio", "Svizzera", "Austria", "Altro"] as const;

export const OPPORTUNITY_GENDER_LABELS = ["uomo", "donna", "mixed"] as const;

export const FOOTBALL_SPORT = "Calcio";
export const ITALY_LABEL = "Italia";
export const OTHER_COUNTRY_LABEL = "Altro";

export function ageBracketToRange(ageBracket: string): { age_min: number | null; age_max: number | null } {
  if (ageBracket === "17-20") return { age_min: 17, age_max: 20 };
  if (ageBracket === "21-25") return { age_min: 21, age_max: 25 };
  if (ageBracket === "26-30") return { age_min: 26, age_max: 30 };
  if (ageBracket === "31+") return { age_min: 31, age_max: null };
  return { age_min: null, age_max: null };
}
