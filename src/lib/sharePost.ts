import { Share } from "react-native";

import { devWarn } from "./debug/devLog";
import { createPostShareLink } from "./shareLinks";

type ToastFn = (message: string) => void;

const shareUrlByPostId = new Map<string, string>();

function getCachedShareUrl(postId: string) {
  const cached = shareUrlByPostId.get(postId);
  if (!cached) return null;
  const normalized = cached.trim();
  return normalized || null;
}

async function resolveShareUrl(postId: string) {
  const cachedUrl = getCachedShareUrl(postId);
  if (cachedUrl) return cachedUrl;

  const shareLink = await createPostShareLink(postId);
  const url = typeof shareLink?.url === "string" ? shareLink.url.trim() : "";

  if (!url) {
    throw new Error("shareLink url mancante");
  }

  shareUrlByPostId.set(postId, url);
  return url;
}

export async function sharePostById(postId: string, toast?: ToastFn) {
  if (!postId) {
    toast?.("Condivisione non disponibile");
    return { ok: false as const, url: null };
  }

  let url: string;

  try {
    url = await resolveShareUrl(postId);
  } catch (err) {
    devWarn("createPostShareLink failed in sharePostById", { postId, err });
    toast?.("Impossibile generare il link di condivisione");
    return { ok: false as const, url: null };
  }

  try {
    await Share.share({ message: url, url });
    return { ok: true as const, url };
  } catch (err) {
    devWarn("Share.share failed", err);
    toast?.("Condivisione non disponibile");
    return { ok: false as const, url };
  }
}
