import { getWebBaseUrl, type ApiResponse } from "./api";

export type ClubRosterPlayer = {
  id: string;
  playerProfileId: string;
  inRoster: boolean;
  fullName: string;
  displayName: string;
  role: string | null;
};

export type ClubRosterResponse = {
  items: ClubRosterPlayer[];
};

function buildUrl(path: string) {
  const base = getWebBaseUrl();
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${base}${path}`;
}

export async function fetchClubRoster(): Promise<ApiResponse<ClubRosterResponse>> {
  const response = await fetch(buildUrl("/api/clubs/me/roster"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const status = response.status;
  let json: unknown = null;

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

  const rawItems = Array.isArray((payload as { roster?: unknown[] })?.roster)
    ? (payload as { roster?: unknown[] }).roster ?? []
    : Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { items?: unknown[] })?.items)
        ? (payload as { items?: unknown[] }).items ?? []
        : [];

  const items: ClubRosterPlayer[] = rawItems.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const playerProfileId =
      typeof row.playerProfileId === "string"
        ? row.playerProfileId
        : typeof row.player_profile_id === "string"
          ? row.player_profile_id
          : typeof row.id === "string"
            ? row.id
            : "";

    const fullName =
      typeof row.fullName === "string"
        ? row.fullName
        : typeof row.full_name === "string"
          ? row.full_name
          : "";

    const displayName =
      typeof row.displayName === "string"
        ? row.displayName
        : typeof row.display_name === "string"
          ? row.display_name
          : "";

    const role =
      typeof row.role === "string"
        ? row.role
        : typeof row.player_role === "string"
          ? row.player_role
          : null;

    const inRoster =
      typeof row.inRoster === "boolean"
        ? row.inRoster
        : typeof row.in_roster === "boolean"
          ? row.in_roster
          : false;

    return {
      id: typeof row.id === "string" ? row.id : `${playerProfileId || "row"}-${index}`,
      playerProfileId,
      inRoster,
      fullName,
      displayName,
      role,
    };
  });

  return { ok: true, status, data: { items } };
}

export async function updateClubRosterPlayer(payload: {
  playerProfileId: string;
  inRoster: boolean;
}): Promise<ApiResponse<{ ok?: boolean }>> {
  const response = await fetch(buildUrl("/api/clubs/me/roster"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const status = response.status;

  if (!response.ok) {
    let text = "";
    try {
      text = await response.text();
    } catch {
      text = "";
    }

    return {
      ok: false,
      status,
      errorText: text || `HTTP ${status}`,
    };
  }

  let data: { ok?: boolean } | undefined;
  try {
    data = (await response.json()) as { ok?: boolean };
  } catch {
    data = undefined;
  }

  return { ok: true, status, data };
}
