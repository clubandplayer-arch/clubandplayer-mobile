import { Clipboard, Share } from "react-native";

import { devWarn } from "./debug/devLog";
import { createPostShareLink } from "./shareLinks";

type ToastFn = (message: string) => void;

export async function sharePostById(postId: string, toast?: ToastFn) {
  const shareLink = await createPostShareLink(postId);
  const url = shareLink.url;

  try {
    await Share.share({ message: url });
    return { ok: true as const, url };
  } catch (err) {
    devWarn("Share.share failed, falling back to clipboard", err);
    Clipboard.setString(url);
    toast?.("Link copiato");
    return { ok: true as const, url, copied: true as const };
  }
}
