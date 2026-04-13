import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { fetchProfileMe, fetchWhoami, syncSession } from "./api";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

/**
 * Android OAuth note (important):
 * Some devices can resume the app without reliably delivering the deep link URL
 * to the screen via Linking.getInitialURL()/event timing.
 * To avoid race conditions, we:
 *  - start a Linking listener BEFORE opening the browser
 *  - also read result.url from openAuthSessionAsync when available
 *  - exchange the auth code for a session here, not only inside /callback
 */

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

    const subscription = Linking.addEventListener("url", ({ url }) => {
      // Expected: clubandplayer://callback?code=...
      try {
        const parsed = new URL(url);
        if (parsed.protocol.replace(":", "") !== expectedScheme) return;
        if (parsed.host !== expectedHost) return;
      } catch {
        // If URL() fails, still accept the string and let parser try.
      }

      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      resolve(url);
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription.remove();
      resolve(null);
    }, timeoutMs);
  });
}

async function syncWebSessionAndAudit(session: { access_token: string; refresh_token: string }) {
  const syncRes = await syncSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (__DEV__) {
    console.log("[auth][syncSession]", {
      ok: syncRes.ok,
      status: syncRes.status,
      errorText: syncRes.ok ? null : syncRes.errorText ?? null,
    });
  }

  const whoamiRes = await fetchWhoami();
  if (__DEV__) {
    console.log("[auth][whoami]", {
      ok: whoamiRes.ok,
      status: whoamiRes.status,
      role: whoamiRes.ok ? whoamiRes.data?.role ?? null : null,
      errorText: whoamiRes.ok ? null : whoamiRes.errorText ?? null,
    });
  }

  const profileRes = await fetchProfileMe();
  if (__DEV__) {
    console.log("[auth][profiles/me]", {
      ok: profileRes.ok,
      status: profileRes.status,
      errorText: profileRes.ok ? null : profileRes.errorText ?? null,
    });
  }
}

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL("callback", { scheme: "clubandplayer" });

  if (__DEV__) {
    console.log("[auth] redirectTo:", redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Missing OAuth URL");

  if (__DEV__) {
    console.log("[auth] oauth url:", sanitizeAuthUrl(data.url));
  }

  // Listener BEFORE opening the browser (prevents missing event on Android warm resume).
  const redirectPromise = waitForRedirectUrl({
    timeoutMs: 45_000,
    expectedScheme: "clubandplayer",
    expectedHost: "callback",
  });

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  let finalUrl: string | null = null;

  // 1) Prefer result.url if provided
  if (result.type === "success" && "url" in result && result.url) {
    finalUrl = result.url;
    if (__DEV__) console.log("[auth] result.url:", sanitizeAuthUrl(finalUrl));
  } else {
    // 2) Otherwise rely on Linking event (Android warm resume)
    const eventUrl = await redirectPromise;
    if (eventUrl) {
      finalUrl = eventUrl;
      if (__DEV__) console.log("[auth] event.url:", sanitizeAuthUrl(finalUrl));
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

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("Sessione Supabase mancante dopo exchange");

  await syncWebSessionAndAudit({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export async function signInWithApple() {
  const redirectTo = Linking.createURL("callback", { scheme: "clubandplayer" });

  if (__DEV__) {
    console.log("[auth][apple] redirectTo:", redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Missing OAuth URL");

  if (__DEV__) {
    console.log("[auth][apple] oauth url:", sanitizeAuthUrl(data.url));
  }

  const redirectPromise = waitForRedirectUrl({
    timeoutMs: 45_000,
    expectedScheme: "clubandplayer",
    expectedHost: "callback",
  });

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  let finalUrl: string | null = null;

  if (result.type === "success" && "url" in result && result.url) {
    finalUrl = result.url;
    if (__DEV__) console.log("[auth][apple] result.url:", sanitizeAuthUrl(finalUrl));
  } else {
    const eventUrl = await redirectPromise;
    if (eventUrl) {
      finalUrl = eventUrl;
      if (__DEV__) console.log("[auth][apple] event.url:", sanitizeAuthUrl(finalUrl));
    }
  }

  if (!finalUrl) {
    throw new Error("Apple login non completato (URL di ritorno mancante)");
  }

  const code = extractCodeFromUrl(finalUrl);
  if (!code) {
    throw new Error("OAuth code mancante nel ritorno dal browser");
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    throw new Error(`Scambio sessione fallito: ${String(exchangeError)}`);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("Sessione Supabase mancante dopo exchange");

  await syncWebSessionAndAudit({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}
