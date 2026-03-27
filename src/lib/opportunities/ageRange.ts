export type AgeRange = {
  age_min: number | null;
  age_max: number | null;
};

export function rangeFromAgeBracket(ageBracket?: string | null): AgeRange {
  const value = String(ageBracket ?? "").trim();
  if (!value || value.toLowerCase() === "indifferente") return { age_min: null, age_max: null };
  if (value === "17-20") return { age_min: 17, age_max: 20 };
  if (value === "21-25") return { age_min: 21, age_max: 25 };
  if (value === "26-30") return { age_min: 26, age_max: 30 };
  if (value === "31+") return { age_min: 31, age_max: null };
  return { age_min: null, age_max: null };
}

export function ageBracketFromRange(ageMin?: number | null, ageMax?: number | null): string {
  if (ageMin == null && ageMax == null) return "Indifferente";
  if (ageMin === 17 && ageMax === 20) return "17-20";
  if (ageMin === 21 && ageMax === 25) return "21-25";
  if (ageMin === 26 && ageMax === 30) return "26-30";
  if (ageMin === 31 && ageMax == null) return "31+";
  return "Indifferente";
}
