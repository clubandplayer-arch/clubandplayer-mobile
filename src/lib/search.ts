import { getWebBaseUrl, type SearchApiPayload, type SearchApiResult, type SearchKind } from "./api";

function buildSearchUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getWebBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchSearchWithFilters(params: {
  q: string;
  type?: SearchKind;
  page?: number;
  limit?: number;
  sport?: string;
  role?: string;
  location?: string;
  category?: string;
  country?: string;
  region?: string;
  province?: string;
  city?: string;
}): Promise<SearchApiResult> {
  const sp = new URLSearchParams();
  sp.set("q", params.q);
  sp.set("type", params.type ?? "all");
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 20));
  if (typeof params.sport === "string" && params.sport.trim()) sp.set("sport", params.sport.trim());
  if (typeof params.role === "string" && params.role.trim()) sp.set("role", params.role.trim());
  if (typeof params.location === "string" && params.location.trim()) sp.set("location", params.location.trim());
  if (typeof params.category === "string" && params.category.trim()) sp.set("category", params.category.trim());
  if (typeof params.country === "string" && params.country.trim()) sp.set("country", params.country.trim());
  if (typeof params.region === "string" && params.region.trim()) sp.set("region", params.region.trim());
  if (typeof params.province === "string" && params.province.trim()) sp.set("province", params.province.trim());
  if (typeof params.city === "string" && params.city.trim()) sp.set("city", params.city.trim());

  const url = buildSearchUrl(`/api/search?${sp.toString()}`);
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const status = response.status;

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const fallbackMessage = status === 429 ? "Too Many Requests" : `HTTP ${status}`;
    const errorCode = typeof json?.code === "string" ? json.code : response.status === 429 ? "RATE_LIMITED" : "ERROR";
    const errorMessage = typeof json?.message === "string" && json.message.trim() ? json.message : fallbackMessage;
    return {
      ok: false,
      status,
      code: errorCode,
      message: errorMessage,
    };
  }

  const payload = (json ?? {}) as SearchApiPayload;
  return { ok: true, status, data: payload };
}
