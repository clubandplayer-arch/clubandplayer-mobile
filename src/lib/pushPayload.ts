export type PushPayload = {
  kind: string | null;
  type: string | null;
  title: string | null;
  body: string | null;
  targetType: string | null;
  targetId: string | null;
  postId: string | null;
  conversationId: string | null;
  opportunityId: string | null;
  applicationId: string | null;
  actorName: string | null;
  createdAt: string | null;
  profileId: string | null;
  status: string | null;
  raw: Record<string, unknown>;
};

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const raw = source[key];
    const value = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw).trim() : "";
    if (value) return value;
  }
  return null;
}

export function normalizePushPayload(input: unknown): PushPayload {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    kind: pickString(raw, ["kind", "type"]),
    type: pickString(raw, ["type", "kind"]),
    title: pickString(raw, ["title"]),
    body: pickString(raw, ["body", "message"]),
    targetType: pickString(raw, ["targetType", "target_type"]),
    targetId: pickString(raw, ["targetId", "target_id"]),
    postId: pickString(raw, ["postId", "post_id", "target_post_id"]),
    conversationId: pickString(raw, ["conversationId", "conversation_id"]),
    opportunityId: pickString(raw, ["opportunityId", "opportunity_id", "id"]),
    applicationId: pickString(raw, ["applicationId", "application_id"]),
    actorName: pickString(raw, ["actorName", "actor_name"]),
    createdAt: pickString(raw, ["createdAt", "created_at"]),
    profileId: pickString(raw, ["profile_id", "other_profile_id", "sender_profile_id", "recipient_profile_id", "actor_profile_id"]),
    status: pickString(raw, ["status", "application_status"]),
    raw,
  };
}

export function resolvePushTargetRoute(payload: PushPayload, fallbackRoute: string = "/(tabs)/notifications"): string {
  const kind = String(payload.kind ?? payload.type ?? "").trim().toLowerCase();

  if (kind === "message" || kind === "new_message" || kind === "dm") {
    if (payload.profileId) return `/(tabs)/messages/${encodeURIComponent(payload.profileId)}`;
    return "/(tabs)/messages";
  }

  if (kind === "comment" || kind === "new_comment" || kind === "reaction" || kind === "new_reaction" || kind === "like") {
    const postId = payload.postId ?? (payload.targetType === "post" ? payload.targetId : null);
    if (postId) return `/posts/${encodeURIComponent(postId)}`;
    return fallbackRoute;
  }

  if (kind === "new_opportunity") {
    if (payload.opportunityId) return `/opportunities/${encodeURIComponent(payload.opportunityId)}`;
    return fallbackRoute;
  }

  if (kind === "application_received" || kind === "new_application_received") {
    if (payload.opportunityId) return `/club/applications?opportunity_id=${encodeURIComponent(payload.opportunityId)}`;
    return "/club/applications";
  }

  if (kind === "application_status" || kind === "application_status_changed") {
    const query = new URLSearchParams();
    if (payload.applicationId) query.set("application_id", payload.applicationId);
    if (payload.opportunityId) query.set("opportunity_id", payload.opportunityId);
    if (payload.status) query.set("status", payload.status);
    const queryString = query.toString();
    return queryString ? `/my/applications?${queryString}` : "/my/applications";
  }

  return fallbackRoute;
}
