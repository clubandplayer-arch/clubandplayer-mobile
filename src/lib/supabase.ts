import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { secureStoreAdapter } from "./supabaseStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

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
    const { data: sessionData } = await supabase.auth.getSession();
    const { data: userData } = await supabase.auth.getUser();

    console.log("[Supabase][DEV] sessionPresent", Boolean(sessionData.session));
    console.log("[Supabase][DEV] userId", userData.user?.id ?? null);
  })();
}
