export type AgeBracketOption = {
  label: string;
  ageMin: number | null;
  ageMax: number | null;
};

export const SPORTS = [
  "Calcio",
  "Futsal",
  "Basket",
  "Pallavolo",
  "Rugby",
  "Tennis",
  "Padel",
  "Atletica",
  "Nuoto",
  "Ciclismo",
] as const;

export const SPORTS_ROLES: Record<string, string[]> = {
  Calcio: [
    "Portiere",
    "Difensore centrale",
    "Terzino destro",
    "Terzino sinistro",
    "Centrocampista difensivo",
    "Centrocampista centrale",
    "Trequartista",
    "Esterno destro",
    "Esterno sinistro",
    "Seconda punta",
    "Prima punta",
  ],
  Futsal: ["Portiere", "Laterale", "Centrale", "Pivot", "Universale"],
  Basket: ["Playmaker", "Guardia", "Ala piccola", "Ala grande", "Centro"],
  Pallavolo: ["Palleggiatore", "Opposto", "Schiacciatore", "Centrale", "Libero"],
  Rugby: ["Pilone", "Tallonatore", "Seconda linea", "Flanker", "Numero 8", "Mediano di mischia", "Mediano di apertura", "Centro", "Ala", "Estremo"],
  Tennis: ["Singolare", "Doppio"],
  Padel: ["Lato destro", "Lato sinistro"],
  Atletica: ["Velocista", "Mezzofondista", "Fondista", "Saltatore", "Lanciatore", "Marciatore", "Prove multiple"],
  Nuoto: ["Stile libero", "Dorso", "Rana", "Farfalla", "Misti"],
  Ciclismo: ["Strada", "Pista", "MTB", "BMX", "Ciclocross"],
};

export const CATEGORIES_BY_SPORT: Record<string, string[]> = {
  Calcio: ["Prima Squadra", "Primavera", "Juniores", "Allievi", "Giovanissimi"],
  Futsal: ["Serie A", "Serie A2", "Serie B", "Under 19", "Under 17"],
  Basket: ["Serie A", "Serie A2", "Serie B", "Under 19", "Under 17"],
  Pallavolo: ["Serie A1", "Serie A2", "Serie B", "Under 19", "Under 17"],
  Rugby: ["Top10", "Serie A", "Serie B", "Under 19", "Under 17"],
  Tennis: ["Open", "Terza categoria", "Quarta categoria", "Under 18", "Under 16"],
  Padel: ["Open", "Prima fascia", "Seconda fascia", "Terza fascia"],
  Atletica: ["Assoluti", "Promesse", "Juniores", "Allievi", "Cadetti"],
  Nuoto: ["Assoluti", "Juniores", "Ragazzi", "Esordienti A", "Esordienti B"],
  Ciclismo: ["Elite", "Under 23", "Juniores", "Allievi", "Esordienti"],
};

export const AGE_BRACKETS: AgeBracketOption[] = [
  { label: "Nessuna preferenza", ageMin: null, ageMax: null },
  { label: "Under 14", ageMin: null, ageMax: 14 },
  { label: "Under 16", ageMin: null, ageMax: 16 },
  { label: "Under 18", ageMin: null, ageMax: 18 },
  { label: "Under 21", ageMin: null, ageMax: 21 },
  { label: "Senior", ageMin: 18, ageMax: null },
];

export const OPPORTUNITY_GENDER_LABELS = ["Maschile", "Femminile", "Misto"] as const;

export const COUNTRIES = ["IT", "ES", "FR", "DE", "GB", "PT", "NL", "BE", "CH", "AT"] as const;

export const ROLE_REQUIRED_SPORTS = new Set<string>(SPORTS);
