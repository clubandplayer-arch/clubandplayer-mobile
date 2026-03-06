import { Share } from "react-native";

import { devWarn } from "./debug/devLog";
import { createPostShareLink } from "./shareLinks";

type ToastFn = (message: string) => void;

export async function sharePostById(postId: string, toast?: ToastFn) {
  const shareLink = await createPostShareLink(postId);
  const url = shareLink.url;
  const shareMessage = url.trim();

  try {
    // Keep a single URL in the payload to avoid duplication on WhatsApp/Android.
    await Share.share({ message: shareMessage });
    return { ok: true as const, url };
  } catch (err) {
    devWarn("Share.share failed", err);
    toast?.("Condivisione non disponibile");
    return { ok: false as const, url };
  }
}
