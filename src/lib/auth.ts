import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

const sanitizeAuthUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;

    for (const key of Array.from(params.keys())) {
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

function extractCodeFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;
    return typeof code === "string" && code.length > 0 ? code : null;
  } catch {
    return null;
  }
}

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
    throw new Error("Google login non completato (browser chiuso o annullato)");
  }

  if (!("url" in result) || !result.url) {
    throw new Error("Google login non completato (URL di ritorno mancante)");
  }

  console.log("[auth] result.url:", sanitizeAuthUrl(result.url));

  const code = extractCodeFromUrl(result.url);
  if (!code) {
    throw new Error("OAuth code mancante nel ritorno dal browser");
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    throw new Error(`Scambio sessione fallito: ${String(exchangeError)}`);
  }
}
