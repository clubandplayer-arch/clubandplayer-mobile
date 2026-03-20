export type ProfileLinksMap = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

export type ProfileSkillItem = {
  name: string;
  endorsementsCount: number;
  endorsedByMe: boolean;
};

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function parseProfileLinks(value: unknown): ProfileLinksMap {
  if (!value) return {};
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  return {
    instagram: asText(record.instagram),
    facebook: asText(record.facebook),
    tiktok: asText(record.tiktok),
    x: asText(record.x),
  };
}

export function stringifyProfileLinks(value: ProfileLinksMap): string {
  return JSON.stringify({
    instagram: asText(value.instagram),
    facebook: asText(value.facebook),
    tiktok: asText(value.tiktok),
    x: asText(value.x),
  });
}

export function parseProfileSkills(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean) as string[];
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => asText(item)).filter(Boolean) as string[];
  }
  return [];
}


export function stringifyProfileSkills(value: unknown): string {
  return parseProfileSkills(value).join("\n");
}

export function normalizeProfileSkills(value: unknown): string[] {
  return parseProfileSkills(value);
}

export function buildProfileSkillItems(skills: unknown, endorsementsRaw: unknown): ProfileSkillItem[] {
  const names = parseProfileSkills(skills);
  const map = new Map<string, ProfileSkillItem>();
  for (const name of names) {
    map.set(name.toLowerCase(), { name, endorsementsCount: 0, endorsedByMe: false });
  }

  if (Array.isArray(endorsementsRaw)) {
    for (const entry of endorsementsRaw) {
      const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
      const name = asText(row?.skill_name ?? row?.name ?? row?.skill);
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = map.get(key) ?? { name, endorsementsCount: 0, endorsedByMe: false };
      const countRaw = row?.endorsementsCount ?? row?.endorsements_count ?? row?.count;
      const count = typeof countRaw === "number" ? countRaw : Number(countRaw ?? 0) || 0;
      existing.endorsementsCount = Math.max(existing.endorsementsCount, count || 0);
      existing.endorsedByMe = existing.endorsedByMe || Boolean(row?.endorsedByMe ?? row?.endorsed_by_me);
      map.set(key, existing);
    }
  } else if (endorsementsRaw && typeof endorsementsRaw === "object") {
    for (const [rawName, rawValue] of Object.entries(endorsementsRaw as Record<string, unknown>)) {
      const name = asText(rawName);
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = map.get(key) ?? { name, endorsementsCount: 0, endorsedByMe: false };
      if (typeof rawValue === "number") {
        existing.endorsementsCount = rawValue;
      } else if (rawValue && typeof rawValue === "object") {
        const row = rawValue as Record<string, unknown>;
        const count = typeof row.count === "number" ? row.count : Number(row.endorsementsCount ?? row.endorsements_count ?? 0) || 0;
        existing.endorsementsCount = count;
        existing.endorsedByMe = Boolean(row.endorsedByMe ?? row.endorsed_by_me);
      }
      map.set(key, existing);
    }
  }

  return Array.from(map.values());
}
