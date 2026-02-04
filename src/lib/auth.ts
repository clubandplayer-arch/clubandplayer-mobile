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

function waitForRedirectUrl({
  timeoutMs,
  expectedScheme,
  expectedHost,
}: {
  timeoutMs: number;
  expectedScheme: string;
  expectedHost: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription.remove();
      resolve(null);
    }, timeoutMs);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      // Esempio atteso: clubandplayer://callback?code=...
      try {
        const parsed = new URL(url);
        if (parsed.protocol.replace(":", "") !== expectedScheme) return;
        if (parsed.host !== expectedHost) return;
      } catch {
        // Se URL() fallisce, proviamo comunque
      }

      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      resolve(url);
    });
  });
}

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL("callback", { scheme: "clubandplayer" });

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

  // 🔥 Listener attivo PRIMA di aprire il browser (così non perdiamo l'evento su Android)
  const redirectPromise = waitForRedirectUrl({
    timeoutMs: 45_000,
    expectedScheme: "clubandplayer",
    expectedHost: "callback",
  });

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  let finalUrl: string | null = null;

  // 1) Se EAS ci dà result.url, usiamo quello
  if (result.type === "success" && "url" in result && result.url) {
    finalUrl = result.url;
    console.log("[auth] result.url:", sanitizeAuthUrl(finalUrl));
  } else {
    // 2) Altrimenti aspettiamo l'evento Linking (warm-resume su Android)
    const eventUrl = await redirectPromise;
    if (eventUrl) {
      finalUrl = eventUrl;
      console.log("[auth] event.url:", sanitizeAuthUrl(finalUrl));
    }
  }

  if (!finalUrl) {
    throw new Error("Google login non completato (URL di ritorno mancante)");
  }

  const code = extractCodeFromUrl(finalUrl);
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
