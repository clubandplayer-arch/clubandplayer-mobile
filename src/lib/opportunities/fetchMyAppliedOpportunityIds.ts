import Constants from "expo-constants";

import { fetchMyApplications } from "../api";

const DEFAULT_WEB_BASE_URL = "https://www.clubandplayer.com";

function resolveWebBaseUrl(): string {
  const expoBase =
    Constants.expoConfig?.extra?.webBaseUrl ??
    (Constants.manifest as any)?.extra?.webBaseUrl ??
    process.env.EXPO_PUBLIC_WEB_BASE_URL;

  const raw = typeof expoBase === "string" ? expoBase.trim() : "";
  if (!raw) return DEFAULT_WEB_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export async function fetchMyAppliedOpportunityIds(params?: {
  status?: "all" | "submitted" | "seen" | "accepted" | "rejected" | string;
}): Promise<{ ok: boolean; status: number; data?: string[]; errorText?: string }> {
  const primary = await fetchMyApplications(params);

  if (primary.ok && primary.data) {
    const ids = primary.data
      .map((application) => String(application.opportunity_id ?? "").trim())
      .filter(Boolean);
    return { ok: true, status: primary.status, data: ids };
  }

  const sp = new URLSearchParams();
  if (typeof params?.status === "string" && params.status.trim()) {
    sp.set("status", params.status.trim());
  }

  const query = sp.toString();
  const path = query ? `/api/applications/mine?${query}` : "/api/applications/mine";
  const response = await fetch(`${resolveWebBaseUrl()}${path}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-store",
    },
  });

  const status = response.status;
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status,
      errorText:
        primary.errorText ||
        (typeof json?.error === "string" ? json.error : null) ||
        (typeof json?.message === "string" ? json.message : null) ||
        `HTTP ${status}`,
    };
  }

  const payload = Array.isArray(json)
    ? json
    : Array.isArray((json as { data?: unknown[] } | null)?.data)
      ? ((json as { data?: unknown[] }).data ?? [])
      : [];

  const ids = payload
    .map((item: any) => String(item?.opportunity_id ?? "").trim())
    .filter(Boolean);

  return { ok: true, status, data: ids };
}
