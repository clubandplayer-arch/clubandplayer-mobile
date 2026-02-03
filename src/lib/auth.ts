import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

const sanitizeAuthUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;

    for (const key of params.keys()) {
      if (key !== "redirect_to") {
        params.set(key, "<redacted>");
      }
    }

    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return url.replace(
      /(access_token|refresh_token|id_token|code)=([^&]+)/g,
      "$1=<redacted>"
    );
  }
};

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL("callback", {
    scheme: "clubandplayer",
  });

  console.log("[auth] redirectTo:", redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Missing OAuth URL");

  console.log("[auth] oauth url:", sanitizeAuthUrl(data.url));

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    throw new Error("Google login cancelled");
  }
}
