import { apiFetch } from "./api";
import { devWarn } from "./debug/devLog";

export type ShareLink = {
  token: string;
  url: string;
  resourceType: "post";
  resourceId: string;
  createdAt?: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
};

type CreateShareLinkResponse =
  | { ok: true; shareLink: ShareLink }
  | { ok: false; error?: string; code?: string };

export async function createPostShareLink(postId: string): Promise<ShareLink> {
  if (!postId) throw new Error("Missing postId");

  const res = await apiFetch<CreateShareLinkResponse>("/api/share-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resourceType: "post",
      resourceId: postId,
    }),
  });

  const json = res.data;

  if (!res.ok || !json || json.ok !== true) {
    devWarn("createPostShareLink failed", { status: res.status, json, errorText: res.errorText });
    const code = (json as any)?.code || (json as any)?.error || res.errorText || "unknown";
    throw new Error(`createPostShareLink failed (${res.status} - ${code})`);
  }

  return json.shareLink;
}
