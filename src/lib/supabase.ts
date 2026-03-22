import "react-native-url-polyfill/auto";
import { AuthApiError, createClient } from "@supabase/supabase-js";
import { secureStoreAdapter } from "./supabaseStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;


function isInvalidRefreshTokenError(error: unknown) {
  if (error instanceof AuthApiError) {
    return error.message.toLowerCase().includes("invalid refresh token");
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("invalid refresh token");
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

      console.log("[Supabase][DEV] sessionPresent", Boolean(sessionData.session));
      console.log("[Supabase][DEV] userId", userData.user?.id ?? null);
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: "local" });
        console.log("[Supabase][DEV] cleared stale refresh token during bootstrap");
        return;
      }
      console.log("[Supabase][DEV] bootstrap auth check failed", error);
    }
  })();
}
