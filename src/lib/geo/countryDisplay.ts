export type CountryDisplay = {
  iso2: string | null;
  label: string;
};

function extractIso2(text?: string | null) {
  const raw = (text ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/([A-Za-z]{2})\s*$/);
  return match ? match[1].toUpperCase() : null;
}

function getCountryLabel(text?: string | null, iso2?: string | null) {
  const raw = (text ?? "").trim();
  if (!raw) return iso2 ?? "";
  const match = raw.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
  if (match) {
    return match[2]?.trim() || match[1].toUpperCase();
  }
  return raw;
}

export function getCountryDisplay(rawValue?: string | null): CountryDisplay {
  const iso2 = extractIso2(rawValue);
  const label = getCountryLabel(rawValue, iso2);
  return { iso2, label };
}
