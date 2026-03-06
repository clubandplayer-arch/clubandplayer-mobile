import { Share } from "react-native";

import { devWarn } from "./debug/devLog";
import { createPostShareLink } from "./shareLinks";

type ToastFn = (message: string) => void;

function getWebBaseUrl() {
  const base = (process.env.EXPO_PUBLIC_WEB_BASE_URL || "https://www.clubandplayer.com").trim();
  return base.replace(/\/+$/, "");
}

function buildFallbackPostUrl(postId: string) {
  const base = getWebBaseUrl();
  return `${base}/posts/${encodeURIComponent(postId)}`;
}

function buildShareMessage(url: string) {
  return `Guarda questo post su Club&Player:\n${url}`;
}

export async function sharePostById(postId: string, toast?: ToastFn) {
  if (!postId) {
    toast?.("Condivisione non disponibile");
    return { ok: false as const, url: null };
  }

  let url = buildFallbackPostUrl(postId);

  try {
    const shareLink = await createPostShareLink(postId);
    if (typeof shareLink?.url === "string" && shareLink.url.trim()) {
      url = shareLink.url.trim();
    }
  } catch (err) {
    devWarn("createPostShareLink failed in sharePostById", { postId, err });
    toast?.("Link pubblico non disponibile, condivido un link alternativo");
  }

  try {
    await Share.share({ message: buildShareMessage(url), url });
    return { ok: true as const, url };
  } catch (err) {
    devWarn("Share.share failed", err);
    toast?.("Condivisione non disponibile");
    return { ok: false as const, url };
  }
}
