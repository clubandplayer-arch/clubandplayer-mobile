export type CountryDisplay = {
  iso2: string | null;
  label: string;
};

export function getCountryDisplay(rawValue?: string | null): CountryDisplay {
  const raw = (rawValue || "").trim();
  if (!raw) return { iso2: null, label: "" };

  const match = raw.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
  if (match) {
    const iso2 = match[1].trim().toUpperCase();
    const label = (match[2]?.trim() || iso2 || "").trim();
    return { iso2, label };
  }

  return { iso2: null, label: raw };
}
