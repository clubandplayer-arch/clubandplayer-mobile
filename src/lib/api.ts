import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

const DEFAULT_WEB_BASE_URL = "https://www.clubandplayer.com";

export type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
  errorText?: string;
};

export type WhoamiResponse = {
  user: unknown;
  role: string | null;
  profile: unknown;
  clubsAdmin?: boolean;
  admin?: boolean;
};

export type ProfileMe = {
  id?: string;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  birth_year?: number | null;
  birth_place?: string | null;
  city?: string | null;
  residence_region_id?: number | null;
  residence_province_id?: number | null;
  residence_municipality_id?: number | null;
  birth_country?: string | null;
  birth_region_id?: number | null;
  birth_province_id?: number | null;
  birth_municipality_id?: number | null;
  foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  sport?: string | null;
  role?: string | null;
  visibility?: string | null;
  interest_country?: string | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;
  links?: unknown;
  skills?: unknown;
  notify_email_new_message?: boolean | null;
  account_type?: string | null;
  club_foundation_year?: number | null;
  club_stadium?: string | null;
  club_stadium_address?: string | null;
  club_stadium_lat?: number | null;
  club_stadium_lng?: number | null;
  club_league_category?: string | null;
  club_motto?: string | null;
};

export type FeedPostsResponse = {
  items?: unknown[];
  nextPage?: number | string | null;
  _debug?: unknown;
};

export type FeedPostsApiResponse =
  | FeedPostsResponse
  | { data?: FeedPostsResponse | unknown[] };

export type FollowStateGetResponse = {
  ok: true;
  state: Record<string, boolean>;
};

export type FollowTogglePostResponse = {
  ok: true;
  isFollowing: boolean;
  targetProfileId: string;
  self?: boolean;
};

export type FollowListGetResponse = {
  ok: true;
  items: unknown[];
};

// WEB truth:
// GET /api/feed/reactions?ids=...
// => { ok:true, counts:[{post_id,reaction,count}], mine:[{post_id,reaction}], missingTable?:true }
export type FeedReactionsGetResponse = {
  ok: true;
  counts: Array<{ post_id: string; reaction: string; count: number }>;
  mine: Array<{ post_id: string; reaction: string }>;
  missingTable?: boolean;
};

export type FeedCommentsCountsGetResponse = {
  ok: true;
  counts: Array<{ post_id: string; count: number }>;
};

export type FeedCommentAuthor = {
  id?: string | null;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  status?: string | null;
};

export type FeedComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: FeedCommentAuthor | null;
};

export type FeedCommentsGetResponse = {
  comments: FeedComment[];
};

export type FeedCommentPostResponse = {
  comment: FeedComment;
};

// WEB truth:
// POST /api/feed/reactions body: {postId, reaction?: 'like' | ... | '' | null}
// => { ok:true, postId, counts:[{post_id,reaction,count}] (only that post), mine: string|null }
export type FeedReactionsPostResponse = {
  ok: true;
  postId: string;
  counts: Array<{ post_id: string; reaction: string; count: number }>;
  mine: string | null;
};

export const PROFILE_PATCH_FIELDS = [
  "full_name",
  "display_name",
  "avatar_url",
  "bio",
  "country",
  "region",
  "province",
  "birth_year",
  "birth_place",
  "city",
  "residence_region_id",
  "residence_province_id",
  "residence_municipality_id",
  "birth_country",
  "birth_region_id",
  "birth_province_id",
  "birth_municipality_id",
  "foot",
  "height_cm",
  "weight_kg",
  "sport",
  "role",
  "visibility",
  "interest_country",
  "interest_region_id",
  "interest_province_id",
  "interest_municipality_id",
  "interest_region",
  "interest_province",
  "interest_city",
  "links",
  "skills",
  "notify_email_new_message",
  "account_type",
  "club_foundation_year",
  "club_stadium",
  "club_stadium_address",
  "club_stadium_lat",
  "club_stadium_lng",
  "club_league_category",
  "club_motto",
] as const;

export type ProfilePatchField = (typeof PROFILE_PATCH_FIELDS)[number];

export function getWebBaseUrl(): string {
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

  const status = response.status;
  let responseText = "";

  try {
    responseText = await response.text();
  } catch (error) {
    return { ok: false, status, errorText: String(error) };
  }

  if (!response.ok) {
    // DEBUG (temporary): log failed requests (needed to debug like/comment regression)
    console.log("[apiFetch] FAIL", {
      method: init?.method ?? "GET",
      url,
      status: response.status,
      statusText: response.statusText,
      body: responseText.slice(0, 500),
    });
    return { ok: false, status, errorText: responseText || `HTTP ${status}` };
  }

  if (!responseText) {
    return { ok: true, status };
  }

  try {
    const json = JSON.parse(responseText) as T;
    return { ok: true, status, data: json };
  } catch (error) {
    return { ok: false, status, errorText: String(error) };
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
  return apiFetch<WhoamiResponse>("/api/auth/whoami", { method: "GET" });
}

export async function fetchProfileMe(): Promise<ApiResponse<ProfileMe>> {
  const url = buildUrl("/api/profiles/me");
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
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

  const payload = json && typeof json === "object" && "data" in (json as any) ? (json as any).data : json;
  return { ok: true, status, data: payload as ProfileMe };
}

export async function fetchFeedPosts(params?: {
  scope?: "all" | "following";
  nextPage?: string;
}): Promise<ApiResponse<FeedPostsApiResponse>> {
  if (params?.nextPage) {
    const base = getWebBaseUrl();
    const target = params.nextPage;
    let url = "";
    if (target.startsWith("http://") || target.startsWith("https://")) url = target;
    else if (target.startsWith("?")) url = `${base}/api/feed/posts${target}`;
    else if (target.startsWith("/")) url = `${base}${target}`;
    else url = `${base}/${target}`;

    return apiFetch<FeedPostsApiResponse>(url, { method: "GET" });
  }

  const sp = new URLSearchParams();
  if (params?.scope) sp.set("scope", params.scope);
  const query = sp.toString();
  const path = query ? `/api/feed/posts?${query}` : "/api/feed/posts";
  return apiFetch<FeedPostsApiResponse>(path, { method: "GET" });
}

function buildIdsQuery(ids: string[]): string {
  const uniq = Array.from(new Set(ids.map((s) => String(s).trim()).filter(Boolean)));
  const sp = new URLSearchParams();
  sp.set("ids", uniq.join(","));
  return sp.toString();
}

export async function fetchFollowState(targetIds: string[]): Promise<ApiResponse<FollowStateGetResponse>> {
  const uniq = Array.from(new Set(targetIds.map((id) => String(id).trim()).filter(Boolean)));
  const sp = new URLSearchParams();
  for (const targetId of uniq) {
    sp.append("targets", targetId);
  }
  return apiFetch<FollowStateGetResponse>(`/api/follows/state?${sp.toString()}`, { method: "GET" });
}

export async function toggleFollow(targetProfileId: string): Promise<ApiResponse<FollowTogglePostResponse>> {
  return apiFetch<FollowTogglePostResponse>("/api/follows/toggle", {
    method: "POST",
    body: JSON.stringify({ targetProfileId }),
  });
}

export async function fetchFollowingList(): Promise<ApiResponse<FollowListGetResponse>> {
  return apiFetch<FollowListGetResponse>("/api/follows/list", { method: "GET" });
}

export async function fetchFollowersList(): Promise<ApiResponse<FollowListGetResponse>> {
  return apiFetch<FollowListGetResponse>("/api/follows/followers", { method: "GET" });
}

export async function fetchFollowSuggestions(params?: {
  limit?: number;
  kind?: "club" | "player";
}): Promise<ApiResponse<FollowListGetResponse>> {
  const sp = new URLSearchParams();
  if (typeof params?.limit === "number") sp.set("limit", String(params.limit));
  if (params?.kind) sp.set("kind", params.kind);
  const query = sp.toString();
  const path = query ? `/api/follows/suggestions?${query}` : "/api/follows/suggestions";
  return apiFetch<FollowListGetResponse>(path, { method: "GET" });
}

// ✅ WEB parity: ONLY ids=...
export async function fetchReactionsForIds(ids: string[]): Promise<ApiResponse<FeedReactionsGetResponse>> {
  const q = buildIdsQuery(ids);
  return apiFetch<FeedReactionsGetResponse>(`/api/feed/reactions?${q}`, { method: "GET" });
}

export async function fetchCommentCountsForIds(ids: string[]): Promise<ApiResponse<FeedCommentsCountsGetResponse>> {
  const q = buildIdsQuery(ids);
  return apiFetch<FeedCommentsCountsGetResponse>(`/api/feed/comments/counts?${q}`, { method: "GET" });
}

export async function fetchComments(postId: string, limit: number = 50): Promise<ApiResponse<FeedCommentsGetResponse>> {
  const sp = new URLSearchParams();
  sp.set("postId", postId);
  sp.set("limit", String(limit));
  return apiFetch<FeedCommentsGetResponse>(`/api/feed/comments?${sp.toString()}`, { method: "GET" });
}

export async function createComment(postId: string, body: string): Promise<ApiResponse<FeedCommentPostResponse>> {
  return apiFetch<FeedCommentPostResponse>("/api/feed/comments", {
    method: "POST",
    body: JSON.stringify({ postId, body }),
  });
}

export async function editComment(commentId: string, body: string): Promise<ApiResponse<FeedCommentPostResponse>> {
  return apiFetch<FeedCommentPostResponse>(`/api/feed/comments/${encodeURIComponent(commentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

export async function deleteComment(commentId: string): Promise<ApiResponse<{ ok: boolean }>> {
  return apiFetch<{ ok: boolean }>(`/api/feed/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}

export async function setPostReaction(
  postId: string,
  reaction: "like" | null,
): Promise<ApiResponse<FeedReactionsPostResponse>> {
  // ✅ WEB parity:
  // reaction null or '' => remove
  const body = reaction ? { postId, reaction } : { postId, reaction: null };

  return apiFetch<FeedReactionsPostResponse>("/api/feed/reactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function buildProfilePatch(
  input: Partial<Record<ProfilePatchField, unknown>>,
): Partial<Record<ProfilePatchField, unknown>> {
  const payload: Partial<Record<ProfilePatchField, unknown>> = {};
  for (const field of PROFILE_PATCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      const value = input[field];
      if (value !== undefined) payload[field] = value;
    }
  }
  return payload;
}

export async function patchProfileMe(
  input: Partial<Record<ProfilePatchField, unknown>>,
): Promise<ApiResponse<ProfileMe>> {
  const payload = buildProfilePatch(input);
  return apiFetch<ProfileMe>("/api/profiles/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function useWhoami(enabled: boolean = true) {
  const [data, setData] = useState<WhoamiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWhoami();
    if (response.ok) setData(response.data ?? null);
    else {
      setData(null);
      setError(response.errorText ?? "Unknown error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load]);

  return { data, loading, error, reload: load };
}

export function useWebSession() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensure = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await syncSession();
    if (!res.ok) {
      setReady(false);
      setError(res.errorText ?? "Sync session failed");
      setLoading(false);
      return;
    }

    setReady(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  return { ready, loading, error, retry: ensure };
}
