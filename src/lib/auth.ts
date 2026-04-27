import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { fetchProfileMe, fetchWhoami, syncSession } from "./api";
import { supabase } from "./supabase";
import { registerPushToken } from "./registerPushToken";

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

type AuthSessionOutcome =
  | { kind: "success-url"; url: string }
  | { kind: "non-success" }
  | { kind: "timeout" };

let hasRegisteredPushToken = false;

async function registerPushTokenOnceForSession() {
  if (hasRegisteredPushToken) return;
  hasRegisteredPushToken = true;

  try {
    await registerPushToken();
  } catch (error) {
    if (__DEV__) {
      console.log("[auth][push][warn]", String(error));
    }
  }
}

async function resolveOAuthRedirectUrl(oauthUrl: string, redirectTo: string): Promise<string | null> {
  const redirectPromise = waitForRedirectUrl({
    timeoutMs: 45_000,
    expectedScheme: "clubandplayer",
    expectedHost: "callback",
  });

  const authPromise = WebBrowser.openAuthSessionAsync(oauthUrl, redirectTo).then((result) => {
    if (result.type === "success" && "url" in result && result.url) {
      return { kind: "success-url", url: result.url } as const;
    }
    return { kind: "non-success" } as const;
  });

  // Android (dev-client) can occasionally deliver the deep link event while
  // openAuthSessionAsync is still pending. We race both channels so login can
  // complete as soon as one provides the callback URL.
  const firstSettled = await Promise.race([
    redirectPromise.then((url) => ({ source: "event" as const, url })),
    authPromise.then((outcome) => ({ source: "auth" as const, outcome })),
  ]);

  if (firstSettled.source === "event") {
    if (firstSettled.url) {
      if (__DEV__) console.log("[auth] event.url:", sanitizeAuthUrl(firstSettled.url));
      return firstSettled.url;
    }
    const authOutcome: AuthSessionOutcome = await Promise.race([
      authPromise,
      new Promise<AuthSessionOutcome>((resolve) => {
        setTimeout(() => resolve({ kind: "timeout" }), 3_000);
      }),
    ]);
    if (authOutcome.kind === "success-url") {
      if (__DEV__) console.log("[auth] result.url:", sanitizeAuthUrl(authOutcome.url));
      return authOutcome.url;
    }
    return null;
  }

  if (firstSettled.outcome.kind === "success-url") {
    if (__DEV__) console.log("[auth] result.url:", sanitizeAuthUrl(firstSettled.outcome.url));
    return firstSettled.outcome.url;
  }

  const eventUrl = await redirectPromise;
  if (eventUrl && __DEV__) console.log("[auth] event.url:", sanitizeAuthUrl(eventUrl));
  return eventUrl;
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

  if (syncRes.ok && whoamiRes.ok) {
    await registerPushTokenOnceForSession();
  }
}

function syncWebSessionAndAuditInBackground(session: { access_token: string; refresh_token: string }) {
  void syncWebSessionAndAudit(session).catch((error) => {
    if (__DEV__) {
      console.log("[auth][post-login-sync][warn]", String(error));
    }
  });
}


export async function signInWithApple() {
  const redirectTo = Linking.createURL("callback", { scheme: "clubandplayer" });

  if (__DEV__) {
    console.log("[auth] redirectTo:", redirectTo);
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
    console.log("[auth] oauth url:", sanitizeAuthUrl(data.url));
  }

  const finalUrl = await resolveOAuthRedirectUrl(data.url, redirectTo);

  if (!finalUrl) {
    throw new Error("Apple login non completato (URL di ritorno mancante)");
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

  syncWebSessionAndAuditInBackground({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
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

  const finalUrl = await resolveOAuthRedirectUrl(data.url, redirectTo);

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

  syncWebSessionAndAuditInBackground({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}
