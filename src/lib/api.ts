import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

const DEFAULT_WEB_BASE_URL = "https://www.clubandplayer.com";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type WhoamiResponse = {
  user: unknown;
  role: string | null;
  profile: unknown;
  clubsAdmin?: boolean;
  admin?: boolean;
};

function getWebBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_WEB_BASE_URL || DEFAULT_WEB_BASE_URL;
  return raw.replace(/\/+$/, "");
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getWebBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}` };
  }

  try {
    const json = (await response.json()) as T;
    return { ok: true, data: json };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function syncSession(): Promise<ApiResponse<{ ok: boolean; cleared?: boolean }>> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const payload = session
    ? { access_token: session.access_token, refresh_token: session.refresh_token }
    : { access_token: null, refresh_token: null };

  return apiFetch<{ ok: boolean; cleared?: boolean }>("/api/auth/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function clearSession(): Promise<ApiResponse<{ ok: boolean; cleared?: boolean }>> {
  return apiFetch<{ ok: boolean; cleared?: boolean }>("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({ access_token: null, refresh_token: null }),
  });
}

export async function fetchWhoami(): Promise<ApiResponse<WhoamiResponse>> {
  return apiFetch<WhoamiResponse>("/api/auth/whoami", {
    method: "GET",
  });
}

export function useWhoami() {
  const [data, setData] = useState<WhoamiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWhoami();
    if (response.ok) {
      setData(response.data ?? null);
    } else {
      setData(null);
      setError(response.error ?? "Unknown error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
