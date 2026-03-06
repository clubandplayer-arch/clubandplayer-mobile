function normalizeIso2CountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

export function iso2ToFlagEmoji(countryCode: unknown): string | null {
  const iso2 = normalizeIso2CountryCode(countryCode);
  if (!iso2) return null;

  const first = iso2.codePointAt(0);
  const second = iso2.codePointAt(1);
  if (!first || !second) return null;

  return String.fromCodePoint(127397 + first, 127397 + second);
}

export function readCountryCodeFromCandidates(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const normalized = normalizeIso2CountryCode(candidate);
    if (normalized) return normalized;
  }
  return null;
}

