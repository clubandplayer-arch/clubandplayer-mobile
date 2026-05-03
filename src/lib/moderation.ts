const BLOCKED_WORDS = ["bastardo", "stronzo", "troia", "merda", "vaffanculo", "cazzo"];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function containsObjectionableText(value: string): boolean {
  const normalized = normalizeText(value);
  return BLOCKED_WORDS.some((word) => normalized.includes(normalizeText(word)));
}
