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

export const SPORTS_ROLES: Record<string, readonly string[]> = {
  Calcio: ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
  Futsal: ["Portiere", "Difensore", "Laterale", "Pivot"],
  Volley: ["Palleggiatore", "Schiacciatore", "Centrale", "Libero", "Opposto"],
  Basket: ["Playmaker", "Guardia", "Ala", "Ala grande", "Centro"],
  Pallanuoto: ["Portiere", "Difensore", "Centroboa", "Attaccante"],
  Pallamano: ["Portiere", "Ala", "Terzino", "Centrale", "Pivot"],
  Rugby: ["Pilone", "Tallonatore", "Seconda linea", "Terza linea", "Mediano", "Trequarti"],
  "Hockey su prato": ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
  "Hockey su ghiaccio": ["Portiere", "Difensore", "Centro", "Ala"],
  Baseball: ["Lanciatore", "Ricevitore", "Interno", "Esterno"],
  Softball: ["Lanciatore", "Ricevitore", "Interno", "Esterno"],
  Lacrosse: ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
  "Football americano": ["Quarterback", "Running back", "Wide receiver", "Linebacker", "Defensive back"],
};

export const AGE_BRACKETS = ["17-20", "21-25", "26-30", "31+"] as const;

export const CATEGORIES_BY_SPORT: Record<string, readonly string[]> = {
  Calcio: ["Prima squadra", "Juniores", "Allievi", "Giovanissimi"],
  Futsal: ["Prima squadra", "Under 21", "Under 19", "Under 17"],
  Volley: ["Prima squadra", "Under 19", "Under 17", "Under 15"],
  Basket: ["Prima squadra", "Under 19", "Under 17", "Under 15"],
  Pallanuoto: ["Prima squadra", "Under 20", "Under 18", "Under 16"],
  Pallamano: ["Prima squadra", "Under 20", "Under 18", "Under 16"],
  Rugby: ["Prima squadra", "Under 19", "Under 17", "Under 15"],
  "Hockey su prato": ["Prima squadra", "Under 21", "Under 18", "Under 16"],
  "Hockey su ghiaccio": ["Prima squadra", "Under 20", "Under 18", "Under 16"],
  Baseball: ["Prima squadra", "Under 18", "Under 15"],
  Softball: ["Prima squadra", "Under 18", "Under 15"],
  Lacrosse: ["Prima squadra", "Under 21", "Under 18", "Under 16"],
  "Football americano": ["Prima squadra", "Under 21", "Under 18"],
};

export const COUNTRIES = [
  "Italia",
  "Spagna",
  "Francia",
  "Germania",
  "Regno Unito",
  "Portogallo",
  "Paesi Bassi",
  "Belgio",
  "Svizzera",
  "Austria",
  "Irlanda",
  "Svezia",
  "Norvegia",
  "Danimarca",
  "Finlandia",
  "Croazia",
  "Slovenia",
  "Grecia",
  "Polonia",
  "Romania",
  "Ungheria",
  "Serbia",
  "Repubblica Ceca",
  "Slovacchia",
  "Lituania",
  "Lettonia",
  "Estonia",
  "OTHER / Altro",
] as const;

export const OPPORTUNITY_GENDER_LABELS = ["uomo", "donna", "mixed"] as const;

export const OPPORTUNITY_GENDER_OPTIONS = [
  { value: "uomo", label: "Uomo" },
  { value: "donna", label: "Donna" },
  { value: "mixed", label: "Misto" },
] as const;

export const FOOTBALL_SPORT = "Calcio";
export const ITALY_LABEL = "Italia";
export const OTHER_COUNTRY_LABEL = "OTHER / Altro";

export function ageBracketToRange(ageBracket: string): { age_min: number | null; age_max: number | null } {
  if (ageBracket === "17-20") return { age_min: 17, age_max: 20 };
  if (ageBracket === "21-25") return { age_min: 21, age_max: 25 };
  if (ageBracket === "26-30") return { age_min: 26, age_max: 30 };
  if (ageBracket === "31+") return { age_min: 31, age_max: null };
  return { age_min: null, age_max: null };
}
