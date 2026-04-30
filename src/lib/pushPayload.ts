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
  actorType: string | null;
  createdAt: string | null;
  profileId: string | null;
  status: string | null;
  priority: "high" | "default" | "low";
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
  const kind = pickString(raw, ["kind", "type"]);
  const type = pickString(raw, ["type", "kind"]);
  const priority = pickString(raw, ["priority", "androidPriority", "android_priority"])?.toLowerCase() ?? null;
  const normalizedKind = String(kind ?? type ?? "").trim().toLowerCase();
  const computedPriority: "high" | "default" | "low" =
    priority === "high" || priority === "default" || priority === "low"
      ? (priority as "high" | "default" | "low")
      : normalizedKind === "message" || normalizedKind === "new_message" || normalizedKind === "dm"
        ? "high"
        : normalizedKind === "application_received" || normalizedKind === "new_application_received"
          ? "high"
          : normalizedKind === "application_status" || normalizedKind === "application_status_changed"
            ? "high"
            : normalizedKind === "reaction" || normalizedKind === "new_reaction" || normalizedKind === "like"
              ? "low"
              : "default";
  return {
    kind,
    type,
    title: pickString(raw, ["title"]),
    body: pickString(raw, ["body", "message"]),
    targetType: pickString(raw, ["targetType", "target_type"]),
    targetId: pickString(raw, ["targetId", "target_id"]),
    postId: pickString(raw, ["postId", "post_id", "target_post_id"]),
    conversationId: pickString(raw, ["conversationId", "conversation_id"]),
    opportunityId: pickString(raw, ["opportunityId", "opportunity_id", "id"]),
    applicationId: pickString(raw, ["applicationId", "application_id"]),
    actorName: pickString(raw, ["actorName", "actor_name"]),
    actorType: pickString(raw, ["actorType", "actor_type", "followerType", "follower_type", "account_type"]),
    createdAt: pickString(raw, ["createdAt", "created_at"]),
    profileId: pickString(raw, ["profile_id", "other_profile_id", "sender_profile_id", "recipient_profile_id", "actor_profile_id", "followerProfileId", "follower_profile_id", "actorProfileId"]),
    status: pickString(raw, ["status", "application_status"]),
    priority: computedPriority,
    raw,
  };
}

export function buildPushCopy(payload: PushPayload): { title: string | null; body: string | null } {
  const kind = String(payload.kind ?? payload.type ?? "").trim().toLowerCase();
  const actor = payload.actorName?.trim() || "Qualcuno";
  const status = String(payload.status ?? "").trim().toLowerCase();
  const normalizedTitle = payload.title?.trim() || null;
  const normalizedBody = payload.body?.trim() || null;

  if (normalizedTitle || normalizedBody) {
    return { title: normalizedTitle, body: normalizedBody };
  }

  if (kind === "message" || kind === "new_message" || kind === "dm") {
    return { title: `Nuovo messaggio da ${actor}`, body: null };
  }
  if (kind === "comment" || kind === "new_comment") {
    return { title: `${actor} ha commentato il tuo post`, body: null };
  }
  if (kind === "reaction" || kind === "new_reaction" || kind === "like") {
    return { title: `${actor} ha reagito al tuo post`, body: null };
  }
  if (kind === "follower" || kind === "follow" || kind === "new_follower") {
    return { title: `${actor} ha iniziato a seguirti`, body: null };
  }
  if (kind === "application_received" || kind === "new_application_received") {
    return { title: "Hai ricevuto una nuova candidatura", body: null };
  }
  if (kind === "application_status" || kind === "application_status_changed") {
    if (status === "accepted") return { title: "La tua candidatura è stata accettata", body: null };
    if (status === "rejected") return { title: "La tua candidatura non è stata accettata", body: null };
    return { title: "La tua candidatura è stata aggiornata", body: null };
  }
  if (kind === "new_opportunity") {
    return { title: "Nuova opportunità pubblicata", body: null };
  }
  return { title: null, body: null };
}

export function resolvePushTargetRoute(payload: PushPayload, fallbackRoute: string = "/(tabs)/notifications"): string {
  const kind = String(payload.kind ?? payload.type ?? "").trim().toLowerCase();
  const targetType = String(payload.targetType ?? "").trim().toLowerCase();
  const directPostId = payload.postId ?? (targetType === "post" ? payload.targetId : null);

  if (targetType === "post" && directPostId) {
    return `/posts/${encodeURIComponent(directPostId)}`;
  }

  if (kind === "message" || kind === "new_message" || kind === "dm") {
    if (payload.profileId) return `/(tabs)/messages/${encodeURIComponent(payload.profileId)}`;
    return "/(tabs)/messages";
  }

  if (kind === "comment" || kind === "new_comment" || kind === "reaction" || kind === "new_reaction" || kind === "like") {
    const postId = directPostId;
    if (postId) return `/posts/${encodeURIComponent(postId)}`;
    return fallbackRoute;
  }


  if (kind === "follower" || kind === "follow" || kind === "new_follower") {
    if (payload.profileId) {
      const actorType = String(payload.actorType ?? "").trim().toLowerCase();
      if (actorType === "club") return `/clubs/${encodeURIComponent(payload.profileId)}`;
      if (actorType === "player" || actorType === "athlete") return `/players/${encodeURIComponent(payload.profileId)}`;
    }
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
