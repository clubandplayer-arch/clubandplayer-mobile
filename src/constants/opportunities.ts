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

export const SPORTS_ROLES: Record<(typeof SPORTS)[number], readonly string[]> = {
  Calcio: [
    "Portiere",
    "Difensore centrale",
    "Terzino/Esterno difensivo",
    "Mediano",
    "Centrocampista centrale",
    "Trequartista",
    "Esterno offensivo/Ala",
    "Seconda punta",
    "Punta centrale",
  ],
  Futsal: ["Portiere", "Fixo", "Ala", "Pivot", "Universale"],
  Volley: ["Palleggiatore", "Opposto", "Schiacciatore", "Centrale", "Libero"],
  Basket: ["Playmaker (PG)", "Guardia (SG)", "Ala piccola (SF)", "Ala grande (PF)", "Centro (C)"],
  Pallanuoto: ["Portiere", "Centroboa", "Marcatore (Hole-D)", "Driver/Perimetrale", "Ala", "Punto/Regista"],
  Pallamano: ["Portiere", "Ala sinistra", "Terzino sinistro", "Centrale", "Terzino destro", "Ala destra", "Pivot"],
  Rugby: [
    "Pilone",
    "Tallonatore",
    "Seconda linea",
    "Flanker",
    "Numero 8",
    "Mediano di mischia",
    "Apertura",
    "Centro",
    "Ala",
    "Estremo",
  ],
  "Hockey su prato": ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
  "Hockey su ghiaccio": ["Portiere", "Difensore", "Ala sinistra", "Centro", "Ala destra"],
  Baseball: [
    "Pitcher",
    "Catcher",
    "Prima base",
    "Seconda base",
    "Terza base",
    "Interbase",
    "Esterno sinistro",
    "Esterno centro",
    "Esterno destro",
    "Battitore designato",
  ],
  Softball: [
    "Pitcher",
    "Catcher",
    "Prima base",
    "Seconda base",
    "Terza base",
    "Interbase",
    "Esterno sinistro",
    "Esterno centro",
    "Esterno destro",
  ],
  Lacrosse: ["Portiere", "Difensore", "Centrocampista", "Attaccante", "LSM", "Faceoff specialist"],
  "Football americano": [
    "Quarterback",
    "Running back",
    "Wide receiver",
    "Tight end",
    "Offensive lineman",
    "Defensive lineman",
    "Linebacker",
    "Cornerback",
    "Safety",
    "Kicker/Punter",
  ],
};

export const CATEGORIES_BY_SPORT: Record<(typeof SPORTS)[number], readonly string[]> = {
  Calcio: ["Serie D", "Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria", "Terza Categoria", "Giovanili", "CSI", "ELITE", "Amatoriale"],
  Futsal: ["Serie A", "A2", "B", "C1", "C2", "Amatoriale", "Giovanili", "Altro"],
  Volley: ["SuperLega", "A2", "A3", "B", "C", "D", "Amatoriale", "Amatoriale Misto", "Giovanili"],
  Basket: ["Serie A", "A2", "B", "C Gold", "C Silver", "D", "Amatoriale", "Giovanili", "Altro"],
  Pallanuoto: ["Serie A1", "A2", "B", "C", "Amatoriale", "Giovanili", "Altro"],
  Pallamano: ["Serie A Gold", "A Silver", "B", "A2 Femminile", "Amatoriale", "Giovanili", "Altro"],
  Rugby: ["Top10", "Serie A", "Serie B", "Serie C", "Amatoriale", "Giovanili", "Altro"],
  "Hockey su prato": ["Serie A1", "A2", "Serie B", "Amatoriale", "Giovanili", "Altro"],
  "Hockey su ghiaccio": ["Serie A", "Italian Hockey League", "IHL - Division I", "U19", "Amatoriale", "Altro"],
  Baseball: ["Serie A", "Serie B", "Serie C", "Amatoriale", "Giovanili", "Altro"],
  Softball: ["Serie A1", "Serie A2", "Serie B", "Amatoriale", "Giovanili", "Altro"],
  Lacrosse: ["Serie A", "Serie B", "Amatoriale", "Giovanili", "Altro"],
  "Football americano": ["Prima Divisione", "Seconda Divisione", "Terza Divisione", "College", "Amatoriale", "Giovanili", "Altro"],
};

export const AGE_BRACKETS = ["17-20", "21-25", "26-30", "31+", "Indifferente"] as const;

export const GENDERS = [
  { value: "uomo", label: "Uomo" },
  { value: "donna", label: "Donna" },
  { value: "mixed", label: "Misto" },
] as const;

export const COUNTRIES = [
  { value: "IT", label: "Italia" },
  { value: "OTHER", label: "Altro…" },
] as const;

export function ageBracketToRange(ageBracket: string): { age_min: number | null; age_max: number | null } {
  switch (ageBracket) {
    case "17-20":
      return { age_min: 17, age_max: 20 };
    case "21-25":
      return { age_min: 21, age_max: 25 };
    case "26-30":
      return { age_min: 26, age_max: 30 };
    case "31+":
      return { age_min: 31, age_max: null };
    case "Indifferente":
    default:
      return { age_min: null, age_max: null };
  }
}
