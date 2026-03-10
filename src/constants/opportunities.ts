export const SPORTS = ["Calcio", "Basket", "Volley", "Tennis", "Atletica"] as const;

export const SPORTS_ROLES: Record<string, readonly string[]> = {
  Calcio: ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
  Basket: ["Playmaker", "Guardia", "Ala", "Centro"],
  Volley: ["Palleggiatore", "Schiacciatore", "Centrale", "Libero", "Opposto"],
  Tennis: [],
  Atletica: [],
};

export const AGE_BRACKETS = ["U13", "U15", "U17", "U19", "U21", "Senior"] as const;

export const CATEGORIES_BY_SPORT: Record<string, readonly string[]> = {
  Calcio: ["Prima Squadra", "Juniores", "Allievi", "Giovanissimi"],
  Basket: ["Senior", "Under 19", "Under 17"],
  Volley: ["Senior", "Under 18", "Under 16"],
  Tennis: ["Agonistica", "Amatoriale"],
  Atletica: ["Pista", "Strada", "Trail"],
};

export const COUNTRIES = ["IT", "ES", "FR", "DE", "GB", "PT", "NL", "BE", "CH", "AT"] as const;

export const OPPORTUNITY_GENDER_LABELS = ["uomo", "donna", "mixed"] as const;

export const FOOTBALL_SPORT = "Calcio";
export const DEFAULT_COUNTRY = "IT";
