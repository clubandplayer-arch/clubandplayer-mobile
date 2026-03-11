export const SPORTS = [
  "Calcio",
  "Futsal",
  "Volley",
  "Basket",
  "Pallanuoto",
  "Pallamano",
  "Rugby",
  "Hockey su prato",
  "Hockey su ghiaccio",
  "Baseball",
  "Softball",
  "Lacrosse",
  "Football americano",
] as const;

export type OpportunitySport = (typeof SPORTS)[number];

export const SPORTS_ROLES: Record<OpportunitySport, readonly string[]> = {
  Calcio: [],
  Futsal: [],
  Volley: [],
  Basket: [],
  Pallanuoto: [],
  Pallamano: [],
  Rugby: [],
  "Hockey su prato": [],
  "Hockey su ghiaccio": [],
  Baseball: [],
  Softball: [],
  Lacrosse: [],
  "Football americano": [],
};

export const CATEGORIES_BY_SPORT: Record<OpportunitySport, readonly string[]> = {
  Calcio: [],
  Futsal: [],
  Volley: [],
  Basket: [],
  Pallanuoto: [],
  Pallamano: [],
  Rugby: [],
  "Hockey su prato": [],
  "Hockey su ghiaccio": [],
  Baseball: [],
  Softball: [],
  Lacrosse: [],
  "Football americano": [],
};

export const AGE_BRACKETS = ["U15", "U17", "U19", "U21", "Senior"] as const;

export const OPPORTUNITY_GENDER_LABELS = ["Maschile", "Femminile"] as const;

export const COUNTRIES = ["IT"] as const;
