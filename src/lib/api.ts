import { useCallback, useEffect, useState } from "react";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import { resolveItalianLocationLabels } from "./geo/location";
import { devWarn } from "./debug/devLog";
import type { NotificationWithActor } from "../types/notifications";
import type {
  FetchOpportunitiesParams,
  FetchOpportunitiesResult,
  OpportunityDetail,
  OpportunityDetailResponse,
  OpportunitiesListResponse,
} from "../types/opportunity";
import type {
  DirectMessageMarkReadResponse,
  DirectMessagePostResponse,
  DirectMessageThreadsResponse,
  DirectMessagesUnreadCountResponse,
  DirectThreadResponse,
} from "../types/directMessages";

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

// FOLLOW (WEB truth in your note was states array, but your old PR6 uses this shape)
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

export type ClubRosterItem = {
  playerProfileId: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  sport?: string | null;
};

export type ClubRosterGetResponse = {
  ok: true;
  sport?: string | null;
  roster: ClubRosterItem[];
};

export type ClubRosterPostResponse = {
  ok: boolean;
};

// FEED: reactions/comments
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
  type?: string | null;
  role?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  certified?: boolean | null;
  certification_status?: string | null;
  verified_until?: string | null;
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

export type FeedReactionsPostResponse = {
  ok: true;
  postId: string;
  counts: Array<{ post_id: string; reaction: string; count: number }>;
  mine: string | null;
};

export type LinkPreviewResponse = {
  ok: boolean;
  url?: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  code?: string;
  message?: string;
};

export type CreateFeedPostPayload = {
  content: string;
  media: Array<{
    mediaType: "image" | "video";
    url: string;
    posterUrl: string | null;
    width: number;
    height: number;
    position: number;
  }>;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
};

export type CreateFeedPostResult =
  | {
      ok: true;
      item: unknown;
    }
  | {
      ok: false;
      code?: string;
      message: string;
    };

export type SearchKind = "all" | "clubs" | "players" | "opportunities" | "posts" | "events";

export type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string | null;
  href: string;
  kind: Exclude<SearchKind, "all">;
};

export type SearchFilters = {
  country?: string;
  region?: string;
  province?: string;
  city?: string;
  sport?: string;
  role?: string;
  status?: string;
};

export type SearchApiPayload = {
  ok: boolean;
  results?: Partial<Record<SearchKind, SearchItem[]>>;
  counts?: Partial<Record<SearchKind, number>>;
  query?: string;
  type?: SearchKind;
  page?: number;
  limit?: number;
};

export type SearchApiError = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type SearchApiSuccess = {
  ok: true;
  status: number;
  data: SearchApiPayload;
};

export type SearchApiResult = SearchApiSuccess | SearchApiError;

export type NotificationsResponse = {
  ok: true;
  data: NotificationWithActor[];
};

export type NotificationsPatchResponse = {
  ok: true;
  updated: number;
};

export type NotificationsMarkAllReadResponse = {
  ok: true;
  success: true;
  updated: number;
};

export type NotificationsUnreadCountResponse = {
  ok: true;
  count: number;
};

export type ClubVerificationStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | string;

export type ClubVerificationPaymentStatus = "unpaid" | "paid" | "waived" | string;

export type ClubVerificationRequest = {
  id: string;
  status: ClubVerificationStatus;
  certificate_path?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  verified_until?: string | null;
  payment_status?: ClubVerificationPaymentStatus | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClubVerificationStatusResponse = {
  request: ClubVerificationRequest | null;
};

export type ClubVerificationUploadResponse = {
  ok: boolean;
  request: ClubVerificationRequest | null;
};

export type ClubVerificationSubmitResponse = {
  ok: boolean;
  request: ClubVerificationRequest | null;
};

export type NotificationItem = {
  id: string;
  kind: string;
  payload: any;
  created_at: string;
  read?: boolean;
  read_at?: string | null;
  actor_profile_id?: string | null;
  actor?: {
    id?: string;
    display_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    account_type?: string | null;
  } | null;
};

export type ApplicationStatus = "submitted" | "seen" | "accepted" | "rejected";

export type ReceivedApplicationItem = {
  id: string;
  opportunity_id?: string | null;
  athlete_id?: string | null;
  status?: string | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  player_location?: string | null;
  player_headline?: string | null;
  athlete?: {
    id?: string | null;
    full_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    athlete_profile_id?: string | null;
  } | null;
  opportunity?: {
    id?: string | null;
    title?: string | null;
    role?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
  } | null;
};

export type OpportunityApplicationItem = {
  id: string;
  athlete_id?: string | null;
  note?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  athlete?: {
    id?: string | null;
    full_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    athlete_profile_id?: string | null;
  } | null;
};

export type MyApplicationItem = {
  id: string;
  opportunity_id: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ApplyToOpportunityResult = {
  id: string;
  opportunity_id: string;
  athlete_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  club_id?: string | null;
};

export async function fetchDirectMessageThreads(): Promise<ApiResponse<DirectMessageThreadsResponse>> {
  return apiFetch<DirectMessageThreadsResponse>("/api/direct-messages/threads", { method: "GET" });
}

export async function fetchDirectMessageThread(profileId: string): Promise<ApiResponse<DirectThreadResponse>> {
  return apiFetch<DirectThreadResponse>(`/api/direct-messages/${encodeURIComponent(profileId)}`, {
    method: "GET",
  });
}

export async function postDirectMessage(profileId: string, content: string): Promise<ApiResponse<DirectMessagePostResponse>> {
  return apiFetch<DirectMessagePostResponse>(`/api/direct-messages/${encodeURIComponent(profileId)}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function postDirectMessageMarkRead(profileId: string): Promise<ApiResponse<DirectMessageMarkReadResponse>> {
  return apiFetch<DirectMessageMarkReadResponse>(`/api/direct-messages/${encodeURIComponent(profileId)}/mark-read`, {
    method: "POST",
  });
}

export async function fetchDirectMessagesUnreadCount(): Promise<ApiResponse<DirectMessagesUnreadCountResponse>> {
  return apiFetch<DirectMessagesUnreadCountResponse>("/api/direct-messages/unread-count", {
    method: "GET",
  });
}

export async function deleteDirectMessageConversation(profileId: string) {
  return apiFetch(`/api/direct-messages/conversation/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });
}

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

type AvatarUploadInput = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

export function isUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function getWebBaseUrl(): string {
  const extra =
    (Constants.expoConfig as any)?.extra ??
    (Constants.manifest as any)?.extra ??
    {};
  const raw =
    (typeof extra?.webBaseUrl === "string" && extra.webBaseUrl) ||
    DEFAULT_WEB_BASE_URL;
  return String(raw).replace(/\/+$/, "");
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getWebBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const url = buildUrl(path);
  if (__DEV__ && path.includes("/api/auth/whoami")) {
    console.log("[apiFetch][whoami][request]", {
      path,
      baseUrl: getWebBaseUrl(),
      url,
      method: init?.method ?? "GET",
    });
  }
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = isFormData
    ? {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      }
    : {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      };

  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers,
  });

  const status = response.status;
  let responseText = "";

  try {
    responseText = await response.text();
  } catch (error) {
    return { ok: false, status, errorText: String(error) };
  }

  if (!response.ok) {
    if (__DEV__ && path.includes("/api/auth/whoami")) {
      console.log("[apiFetch][whoami][response]", {
        ok: false,
        status,
        errorText: responseText || `HTTP ${status}`,
      });
    }
    return { ok: false, status, errorText: responseText || `HTTP ${status}` };
  }

  if (!responseText) {
    return { ok: true, status };
  }

  try {
    const json = JSON.parse(responseText) as T;
    if (__DEV__ && path.includes("/api/auth/whoami")) {
      const role = typeof (json as any)?.role === "string" ? (json as any).role : null;
      console.log("[apiFetch][whoami][response]", { ok: true, status, role });
    }
    return { ok: true, status, data: json };
  } catch (error) {
    return { ok: false, status, errorText: String(error) };
  }
}

export async function syncSession(input: { access_token: string; refresh_token: string }): Promise<ApiResponse<{ ok: boolean; cleared?: boolean }>> {
  const response = await apiFetch<{ ok: boolean; cleared?: boolean }>("/api/auth/session", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
  });

  if (__DEV__) {
    console.log("[syncSession]", {
      ok: response.ok,
      status: response.status,
      errorText: response.ok ? null : response.errorText ?? null,
    });
  }

  return response;
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

  const payload =
    json && typeof json === "object" && "data" in (json as any) ? (json as any).data : json;

  return { ok: true, status, data: payload as ProfileMe };
}

export async function fetchFeedPosts(params?: {
  scope?: "all" | "following";
  nextPage?: string;
  mine?: boolean;
  limit?: number;
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
  if (params?.mine) sp.set("mine", "true");
  if (typeof params?.limit === "number" && Number.isFinite(params.limit) && params.limit > 0) {
    sp.set("limit", String(Math.trunc(params.limit)));
  }
  const query = sp.toString();
  const path = query ? `/api/feed/posts?${query}` : "/api/feed/posts";
  return apiFetch<FeedPostsApiResponse>(path, { method: "GET" });
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewResponse> {
  const res = await apiFetch<LinkPreviewResponse>("/api/link-preview", {
    method: "POST",
    body: JSON.stringify({ url }),
  });

  if (!res.ok || !res.data) {
    return {
      ok: false,
      message: res.errorText || "Link preview non disponibile",
    };
  }

  return res.data;
}

export async function createFeedPost(payload: CreateFeedPostPayload): Promise<CreateFeedPostResult> {
  const res = await apiFetch<CreateFeedPostResult>("/api/feed/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.data) {
    return {
      ok: false,
      message: res.errorText || "Creazione post non riuscita",
    };
  }

  if (!res.data.ok) {
    const errorData = res.data as { ok: false; code?: string; message?: string };
    return {
      ok: false,
      code: errorData.code,
      message: errorData.message || "Creazione post non riuscita",
    };
  }

  return {
    ok: true,
    item: res.data.item,
  };
}

export async function fetchSearch(params: {
  q: string;
  type?: SearchKind;
  page?: number;
  limit?: number;
  country?: string;
  region?: string;
  province?: string;
  city?: string;
  sport?: string;
  role?: string;
  status?: string;
}): Promise<SearchApiResult> {
  const sp = new URLSearchParams();
  sp.set("q", params.q);
  sp.set("type", params.type ?? "all");
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 10));

  (["country", "region", "province", "city", "sport", "role", "status"] as const).forEach((key) => {
    const value = params[key];
    if (typeof value === "string" && value.trim()) sp.set(key, value.trim());
  });

  const url = buildUrl(`/api/search?${sp.toString()}`);
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


export async function fetchOpportunities(params?: FetchOpportunitiesParams): Promise<ApiResponse<FetchOpportunitiesResult>> {
  const sp = new URLSearchParams();
  sp.set("page", String(params?.page ?? 1));
  sp.set("pageSize", String(params?.pageSize ?? 20));
  sp.set("sort", params?.sort ?? "recent");
  if (typeof params?.q === "string" && params.q.trim()) sp.set("q", params.q.trim());

  const response = await apiFetch<OpportunitiesListResponse>(`/api/opportunities?${sp.toString()}`, { method: "GET" });

  if (!response.ok || !response.data) {
    return { ok: false, status: response.status, errorText: response.errorText || "Errore nel caricamento opportunità" };
  }

  if (!response.data.ok || !Array.isArray(response.data.data)) {
    return { ok: false, status: response.status, errorText: "Formato risposta opportunità non valido" };
  }

  const normalized = (response.data.data ?? []).map((o: any) => {
    const id = String(o?.id_uuid ?? o?.id ?? "");
    return { ...o, id };
  });

  return {
    ok: true,
    status: response.status,
    data: {
      data: normalized,
      page: response.data.page,
      pageSize: response.data.pageSize,
      total: response.data.total,
      pageCount: response.data.pageCount,
      sort: response.data.sort,
    },
  };
}

export async function fetchOpportunityById(id: string): Promise<ApiResponse<OpportunityDetail>> {
  const safeId = encodeURIComponent(String(id).trim());
  const response = await apiFetch<OpportunityDetailResponse>(`/api/opportunities/${safeId}`, { method: "GET" });

  if (!response.ok || !response.data?.data) {
    return {
      ok: false,
      status: response.status,
      errorText: response.errorText || "Opportunità non trovata",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: response.data.data,
  };
}

export async function fetchClubApplicationsReceived(params?: {
  status?: "pending" | "accepted" | "rejected" | "all" | string;
  opportunityId?: string;
}): Promise<ApiResponse<ReceivedApplicationItem[]>> {
  const sp = new URLSearchParams();
  if (typeof params?.status === "string" && params.status.trim()) sp.set("status", params.status.trim());
  if (typeof params?.opportunityId === "string" && params.opportunityId.trim()) {
    sp.set("opportunity_id", params.opportunityId.trim());
  }

  const query = sp.toString();
  const path = query ? `/api/applications/received?${query}` : "/api/applications/received";
  const response = await apiFetch<{ data?: ReceivedApplicationItem[] } | ReceivedApplicationItem[]>(path, { method: "GET" });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorText: response.errorText || "Errore nel caricamento candidature ricevute",
    };
  }

  const payload = response.data;
  const normalized = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: ReceivedApplicationItem[] } | undefined)?.data)
      ? ((payload as { data?: ReceivedApplicationItem[] }).data ?? [])
      : [];

  return { ok: true, status: response.status, data: normalized };
}

export async function fetchOpportunityApplications(opportunityId: string): Promise<ApiResponse<OpportunityApplicationItem[]>> {
  const safeId = encodeURIComponent(String(opportunityId).trim());
  const response = await apiFetch<{ data?: OpportunityApplicationItem[] } | OpportunityApplicationItem[]>(
    `/api/opportunities/${safeId}/applications`,
    { method: "GET" },
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorText: response.errorText || "Errore nel caricamento candidature",
    };
  }

  const payload = response.data;
  const normalized = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: OpportunityApplicationItem[] } | undefined)?.data)
      ? ((payload as { data?: OpportunityApplicationItem[] }).data ?? [])
      : [];

  return { ok: true, status: response.status, data: normalized };
}

export async function patchApplicationStatus(appId: string, status: ApplicationStatus): Promise<ApiResponse<{ ok?: boolean }>> {
  return apiFetch<{ ok?: boolean }>(`/api/applications/${encodeURIComponent(String(appId).trim())}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchMyApplications(params?: {
  status?: "all" | "submitted" | "seen" | "accepted" | "rejected" | string;
}): Promise<ApiResponse<MyApplicationItem[]>> {
  const sp = new URLSearchParams();
  if (typeof params?.status === "string" && params.status.trim()) {
    sp.set("status", params.status.trim());
  }

  const query = sp.toString();
  const path = query ? `/api/applications/me?${query}` : "/api/applications/me";
  const response = await apiFetch<{ data?: MyApplicationItem[] } | MyApplicationItem[]>(path, { method: "GET" });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorText: response.errorText || "Errore nel caricamento candidature utente",
    };
  }

  const payload = response.data;
  const normalized = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: MyApplicationItem[] } | undefined)?.data)
      ? ((payload as { data?: MyApplicationItem[] }).data ?? [])
      : [];

  return { ok: true, status: response.status, data: normalized };
}

export async function fetchMyAppliedOpportunityIds(params?: {
  status?: "all" | "submitted" | "seen" | "accepted" | "rejected" | string;
}): Promise<ApiResponse<string[]>> {
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

  const legacyQuery = sp.toString();
  const legacyPath = legacyQuery ? `/api/applications/mine?${legacyQuery}` : "/api/applications/mine";
  const legacy = await apiFetch<{ data?: MyApplicationItem[] } | MyApplicationItem[]>(legacyPath, { method: "GET" });

  if (!legacy.ok) {
    return {
      ok: false,
      status: primary.status || legacy.status,
      errorText: primary.errorText || legacy.errorText || "Errore nel caricamento candidature utente",
    };
  }

  const payload = legacy.data;
  const normalized = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: MyApplicationItem[] } | undefined)?.data)
      ? ((payload as { data?: MyApplicationItem[] }).data ?? [])
      : [];

  const ids = normalized
    .map((application) => String(application.opportunity_id ?? "").trim())
    .filter(Boolean);

  return { ok: true, status: legacy.status, data: ids };
}


export async function applyToOpportunity(opportunityId: string, note?: string | null): Promise<ApiResponse<ApplyToOpportunityResult>> {
  const cleanId = String(opportunityId ?? "").trim();
  const cleanNote = typeof note === "string" ? note.trim() : "";

  return apiFetch<ApplyToOpportunityResult>("/api/applications", {
    method: "POST",
    body: JSON.stringify({
      opportunity_id: cleanId,
      note: cleanNote ? cleanNote : null,
    }),
  });
}

export async function fetchNotifications(params?: {
  limit?: number;
  page?: number;
  all?: number;
  unread?: boolean;
}): Promise<ApiResponse<NotificationsResponse>> {
  const sp = new URLSearchParams();
  if (typeof params?.limit === "number") sp.set("limit", String(params.limit));
  if (typeof params?.page === "number") sp.set("page", String(params.page));
  if (params?.all === 1) sp.set("all", "1");
  if (params?.unread) sp.set("unread", "true");

  // ✅ cache buster: evita risposte “vecchie” (proxy / fetch / layer intermedi)
  sp.set("_ts", String(Date.now()));

  const query = sp.toString();
  const path = `/api/notifications?${query}`;

  return apiFetch<NotificationsResponse>(path, {
    method: "GET",
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const response = await apiFetch<{ data?: NotificationItem[] }>("/api/notifications", { method: "GET" });
  if (!response.ok) return [];
  return response.data?.data ?? [];
}

export async function patchNotificationsMarkRead(params: {
  ids?: Array<string | number>;
  markAll?: boolean;
}): Promise<ApiResponse<NotificationsPatchResponse>> {
  const normalizedIds = Array.from(
    new Set((params.ids ?? []).map((id) => String(id ?? "").trim()).filter(Boolean)),
  );

  const payload = {
    ...(typeof params.markAll === "boolean" ? { markAll: params.markAll } : {}),
    ids: normalizedIds,
  };

  if (__DEV__) {
    console.log("[TEMP DEBUG][notifications][mark-read][request]", {
      path: "/api/notifications",
      payload,
      idsTypes: normalizedIds.map((id) => typeof id),
    });
  }

  const response = await apiFetch<NotificationsPatchResponse>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (__DEV__) {
    console.log("[TEMP DEBUG][notifications][mark-read][response]", {
      ok: response.ok,
      status: response.status,
      errorText: response.ok ? null : response.errorText ?? null,
      updated: response.data?.updated ?? null,
    });
  }

  return response;
}

export async function postNotificationsMarkAllRead(): Promise<ApiResponse<NotificationsMarkAllReadResponse>> {
  return apiFetch<NotificationsMarkAllReadResponse>("/api/notifications/mark-all-read", {
    method: "POST",
  });
}

export async function fetchNotificationsUnreadCount(): Promise<ApiResponse<NotificationsUnreadCountResponse>> {
  return apiFetch<NotificationsUnreadCountResponse>("/api/notifications/unread-count", { method: "GET" });
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
  for (const targetId of uniq) sp.append("targets", targetId);
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

export async function fetchFollowSuggestions(params?: { limit?: number; kind?: "club" | "player" }): Promise<ApiResponse<FollowListGetResponse>> {
  const sp = new URLSearchParams();
  if (typeof params?.limit === "number") sp.set("limit", String(params.limit));
  if (params?.kind) sp.set("kind", params.kind);
  const query = sp.toString();
  const path = query ? `/api/follows/suggestions?${query}` : "/api/follows/suggestions";
  return apiFetch<FollowListGetResponse>(path, { method: "GET" });
}

function normalizeClubRosterItem(raw: unknown): ClubRosterItem | null {
  const item = (raw ?? {}) as Record<string, unknown>;
  const player = (item.player ?? {}) as Record<string, unknown>;

  const playerProfileIdRaw =
    item.playerProfileId ??
    item.player_profile_id ??
    player.playerProfileId ??
    player.player_profile_id ??
    player.id;
  const playerProfileId = typeof playerProfileIdRaw === "string" ? playerProfileIdRaw.trim() : String(playerProfileIdRaw ?? "").trim();

  if (!playerProfileId) {
    devWarn("fetchClubRoster: roster item missing playerProfileId", { raw: item });
    return null;
  }

  const displayNameRaw = player.display_name ?? player.full_name ?? player.name ?? item.display_name ?? item.full_name;
  const fullNameRaw = player.full_name ?? player.name ?? item.full_name;
  const avatarUrlRaw = player.avatarUrl ?? player.avatar_url ?? item.avatar_url ?? item.avatarUrl;
  const roleRaw = player.role ?? item.role;
  const sportRaw = player.sport ?? item.sport;

  return {
    playerProfileId,
    display_name: typeof displayNameRaw === "string" ? displayNameRaw : null,
    full_name: typeof fullNameRaw === "string" ? fullNameRaw : null,
    avatar_url: typeof avatarUrlRaw === "string" ? avatarUrlRaw : null,
    role: typeof roleRaw === "string" ? roleRaw : null,
    sport: typeof sportRaw === "string" ? sportRaw : null,
  };
}

export async function fetchClubRoster(): Promise<ApiResponse<ClubRosterGetResponse>> {
  const response = await apiFetch<ClubRosterGetResponse>("/api/clubs/me/roster", { method: "GET" });
  if (!response.ok || !response.data) return response;

  if (__DEV__ && response.data?.roster?.[0]) {
    const firstItem = response.data.roster[0] as Record<string, unknown>;
    console.log("[roster][raw keys]", Object.keys(firstItem));
    console.log("[roster][raw sample]", JSON.stringify(firstItem).slice(0, 600));
  }

  const mappedRoster = Array.isArray(response.data.roster)
    ? response.data.roster.map(normalizeClubRosterItem).filter((item): item is ClubRosterItem => item !== null)
    : [];

  return {
    ...response,
    data: {
      ...response.data,
      roster: mappedRoster,
    },
  };
}

export async function updateClubRoster(input: { playerProfileId: string; inRoster: boolean }): Promise<ApiResponse<ClubRosterPostResponse>> {
  return apiFetch<ClubRosterPostResponse>("/api/clubs/me/roster", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchClubVerificationStatus(): Promise<ApiResponse<ClubVerificationStatusResponse>> {
  return apiFetch<ClubVerificationStatusResponse>("/api/club/verification/status", { method: "GET" });
}

type ClubVerificationUploadInput = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

export async function uploadClubVerificationPdf(
  input: ClubVerificationUploadInput,
): Promise<ApiResponse<ClubVerificationUploadResponse>> {
  const form = new FormData();
  form.append("file", {
    uri: input.uri,
    name: input.fileName ?? `club-verification-${Date.now()}.pdf`,
    type: input.mimeType ?? "application/pdf",
  } as any);

  return apiFetch<ClubVerificationUploadResponse>("/api/club/verification/upload", {
    method: "POST",
    body: form,
  });
}

export async function submitClubVerificationRequest(): Promise<ApiResponse<ClubVerificationSubmitResponse>> {
  return apiFetch<ClubVerificationSubmitResponse>("/api/club/verification/submit", { method: "POST" });
}

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
  return apiFetch<{ ok: boolean }>(`/api/feed/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

export async function setPostReaction(postId: string, reaction: "like" | null): Promise<ApiResponse<FeedReactionsPostResponse>> {
  const body = reaction ? { postId, reaction } : { postId, reaction: null };
  return apiFetch<FeedReactionsPostResponse>("/api/feed/reactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function buildProfilePatch(input: Partial<Record<ProfilePatchField, unknown>>): Partial<Record<ProfilePatchField, unknown>> {
  const payload: Partial<Record<ProfilePatchField, unknown>> = {};
  for (const field of PROFILE_PATCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      const value = input[field];
      if (value !== undefined) payload[field] = value;
    }
  }
  return payload;
}

export async function patchProfileMe(input: Partial<Record<ProfilePatchField, unknown>>): Promise<ApiResponse<ProfileMe>> {
  const payload = await normalizeProfilePatch(input);
  return apiFetch<ProfileMe>("/api/profiles/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  const v = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(v)) return true;
  if (["false", "0", "no", "n", "off"].includes(v)) return false;
  return null;
}

function normalizeJsonOrNull(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return value;
}

function normalizeSport(value: unknown): string | null {
  return normalizeOptionalString(value);
}

function toDbSkills(value: unknown): unknown[] | null {
  const parsed = normalizeJsonOrNull(value);
  let arr: unknown[] = [];
  if (Array.isArray(parsed)) arr = parsed;
  else if (typeof parsed === "string") arr = parsed.split(",");
  else return null;

  const normalized = arr
    .map((item) => normalizeOptionalString(item))
    .filter(Boolean)
    .slice(0, 10) as string[];

  return normalized;
}

async function normalizeProfilePatch(input: Partial<Record<ProfilePatchField, unknown>>) {
  const payload = buildProfilePatch(input);

  const stringFields: ProfilePatchField[] = [
    "full_name",
    "display_name",
    "avatar_url",
    "bio",
    "country",
    "region",
    "province",
    "birth_place",
    "city",
    "birth_country",
    "foot",
    "role",
    "visibility",
    "interest_country",
    "interest_region",
    "interest_province",
    "interest_city",
    "account_type",
    "club_stadium",
    "club_stadium_address",
    "club_league_category",
    "club_motto",
  ];

  for (const field of stringFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = normalizeOptionalString(payload[field]);
    }
  }

  const numberFields: ProfilePatchField[] = [
    "birth_year",
    "residence_region_id",
    "residence_province_id",
    "residence_municipality_id",
    "birth_region_id",
    "birth_province_id",
    "birth_municipality_id",
    "height_cm",
    "weight_kg",
    "interest_region_id",
    "interest_province_id",
    "interest_municipality_id",
    "club_foundation_year",
    "club_stadium_lat",
    "club_stadium_lng",
  ];

  for (const field of numberFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = normalizeOptionalNumber(payload[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "notify_email_new_message")) {
    payload.notify_email_new_message = normalizeOptionalBoolean(payload.notify_email_new_message);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "sport")) {
    payload.sport = normalizeSport(payload.sport);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "links")) {
    payload.links = normalizeJsonOrNull(payload.links);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "skills")) {
    payload.skills = toDbSkills(payload.skills);
  }

  if (!payload.interest_country) payload.interest_country = "IT";

  if (payload.country) payload.country = String(payload.country).toUpperCase();
  if (payload.interest_country) payload.interest_country = String(payload.interest_country).toUpperCase();
  if (payload.birth_country) payload.birth_country = String(payload.birth_country).toUpperCase();

  const fullName = normalizeOptionalString(payload.full_name);
  const displayName = normalizeOptionalString(payload.display_name);
  if (fullName && !displayName) payload.display_name = fullName;
  if (displayName && !fullName) payload.full_name = displayName;

  if (String(payload.account_type ?? "").toLowerCase() === "club") {
    payload.role = "Club";
  }

  const labels = await resolveItalianLocationLabels({
    country: (payload.interest_country as string | null | undefined) ?? null,
    regionId: (payload.interest_region_id as number | null | undefined) ?? null,
    provinceId: (payload.interest_province_id as number | null | undefined) ?? null,
    municipalityId: (payload.interest_municipality_id as number | null | undefined) ?? null,
    regionLabel: (payload.interest_region as string | null | undefined) ?? null,
    provinceLabel: (payload.interest_province as string | null | undefined) ?? null,
    cityLabel: (payload.interest_city as string | null | undefined) ?? null,
  });

  if (!payload.interest_region && labels.region) payload.interest_region = labels.region;
  if (!payload.interest_province && labels.province) payload.interest_province = labels.province;
  if (!payload.interest_city && labels.city) payload.interest_city = labels.city;

  return payload;
}

export async function uploadProfileAvatar(file: AvatarUploadInput): Promise<ApiResponse<{ avatar_url: string | null }>> {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.fileName ?? `avatar-${Date.now()}.jpg`,
    type: file.mimeType ?? "image/jpeg",
  } as any);

  const response = await fetch(buildUrl("/api/profiles/avatar"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    body: form,
  });

  const status = response.status;
  let json: any = null;

  try {
    json = await response.json();
  } catch (error) {
    return { ok: false, status, errorText: String(error) };
  }

  if (!response.ok) {
    return {
      ok: false,
      status,
      errorText: typeof json === "string" ? json : `HTTP ${status}`,
    };
  }

  return {
    ok: true,
    status,
    data: {
      avatar_url: typeof json?.avatar_url === "string" ? json.avatar_url : null,
    },
  };
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

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setReady(false);
      setError("Sessione Supabase mancante");
      setLoading(false);
      return;
    }

    const res = await syncSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
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
