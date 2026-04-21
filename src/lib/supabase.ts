import "react-native-url-polyfill/auto";
import { AuthApiError, createClient } from "@supabase/supabase-js";
import { secureStoreAdapter } from "./supabaseStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function isInvalidRefreshTokenError(error: unknown) {
  if (error instanceof AuthApiError) {
    return error.message.toLowerCase().includes("invalid refresh token");
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("invalid refresh token");
}

function getMissingEnvMessage() {
  const missing: string[] = [];

  if (!supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  return [
    "[Supabase] Missing required Expo public environment variables.",
    `Missing: ${missing.join(", ") || "unknown"}`,
    "Create a .env file in the project root with:",
    "EXPO_PUBLIC_SUPABASE_URL=...",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY=...",
  ].join("\n");
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(getMissingEnvMessage());
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (__DEV__) {
  void (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();

      console.log("[Supabase][DEV] urlLoaded", Boolean(supabaseUrl));
      console.log("[Supabase][DEV] anonKeyLoaded", Boolean(supabaseAnonKey));
      console.log("[Supabase][DEV] sessionPresent", Boolean(sessionData.session));
      console.log("[Supabase][DEV] userId", userData.user?.id ?? null);
      console.log("[Supabase][DEV] bootstrapSessionMeta", {
        hasAccessToken: Boolean(sessionData.session?.access_token),
        hasRefreshToken: Boolean(sessionData.session?.refresh_token),
        expiresAt: sessionData.session?.expires_at ?? null,
      });
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: "local" });
        console.log("[Supabase][DEV] cleared stale refresh token during bootstrap");
        return;
      }
      console.log("[Supabase][DEV] bootstrap auth check failed", error);
    }
  })();

  const { data: bootstrapAuthSub } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("[Supabase][DEV] onAuthStateChange", {
      event,
      sessionPresent: Boolean(session),
      userId: session?.user?.id ?? null,
      hasAccessToken: Boolean(session?.access_token),
      hasRefreshToken: Boolean(session?.refresh_token),
      expiresAt: session?.expires_at ?? null,
    });
  });

  // Keep subscription alive for runtime diagnostics in DEV.
  void bootstrapAuthSub;
}
