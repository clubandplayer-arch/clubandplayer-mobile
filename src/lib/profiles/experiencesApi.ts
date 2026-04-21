import Constants from "expo-constants";
import { supabase } from "../supabase";
import type { ApiResponse } from "../api";
import type { PastExperience } from "./pastExperiences";

const DEFAULT_WEB_BASE_URL = "https://www.clubandplayer.com";

function getWebBaseUrl(): string {
  const fromExpoExtra =
    (Constants.expoConfig?.extra as { webBaseUrl?: string } | undefined)?.webBaseUrl ??
    (Constants.manifest2?.extra as { expoClient?: { extra?: { webBaseUrl?: string } } } | undefined)?.expoClient?.extra?.webBaseUrl;

  const fromEnv = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  const raw = String(fromEnv || fromExpoExtra || DEFAULT_WEB_BASE_URL).trim();
  return raw.replace(/\/+$/, "");
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getWebBaseUrl()}${normalizedPath}`;
}

async function getSessionAuthorizationHeader(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    const accessToken = data.session?.access_token;
    if (!accessToken) return null;
    return `Bearer ${accessToken}`;
  } catch {
    return null;
  }
}

export async function fetchProfileExperiencesMe(): Promise<ApiResponse<PastExperience[]>> {
  const url = buildUrl("/api/profiles/me/experiences");
  const authorizationHeader = await getSessionAuthorizationHeader();
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
    },
  });

  const status = response.status;
  let json: unknown;

  try {
    json = await response.json();
  } catch (error) {
    return { ok: false, status, errorText: String(error) };
  }

  if (!response.ok) {
    return {
      ok: false,
      status,
      errorText: typeof json === "string" && json ? json : `HTTP ${status}`,
    };
  }

  const payload =
    json && typeof json === "object" && "data" in (json as any) ? (json as any).data : json;

  return { ok: true, status, data: Array.isArray(payload) ? (payload as PastExperience[]) : [] };
}

export async function patchProfileExperiencesMe(experiences: PastExperience[]): Promise<ApiResponse<PastExperience[]>> {
  const url = buildUrl("/api/profiles/me/experiences");
  const authorizationHeader = await getSessionAuthorizationHeader();
  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
    },
    body: JSON.stringify({ experiences }),
  });

  const status = response.status;
  let json: unknown;

  try {
    json = await response.json();
  } catch (error) {
    return { ok: false, status, errorText: String(error) };
  }

  if (!response.ok) {
    const errorMessage =
      json && typeof json === "object" && typeof (json as any).error === "string"
        ? (json as any).error
        : typeof json === "string" && json
          ? json
          : `HTTP ${status}`;
    return { ok: false, status, errorText: errorMessage };
  }

  const payload =
    json && typeof json === "object" && "data" in (json as any) ? (json as any).data : json;
  return { ok: true, status, data: Array.isArray(payload) ? (payload as PastExperience[]) : [] };
}
