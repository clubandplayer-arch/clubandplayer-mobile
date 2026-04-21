import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { fetchProfileMe, syncSession } from "../src/lib/api";
import { getOnboardingSeen } from "../src/lib/onboarding";
import { supabase } from "../src/lib/supabase";
import { theme } from "../src/theme";

type BootstrapState =
  | { kind: "auth-loading" }
  | { kind: "no-session"; onboardingSeen: boolean }
  | { kind: "profile-loading"; session: Session }
  | { kind: "profile-fetch-failed"; session: Session; message: string }
  | { kind: "missing-role"; session: Session }
  | { kind: "club"; session: Session }
  | { kind: "athlete"; session: Session }
  | { kind: "fan"; session: Session };

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}

function getRouteForNoSession(onboardingSeen: boolean) {
  return onboardingSeen ? "/(auth)/login" : "/(onboarding)";
}

export default function Index() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<BootstrapState>({ kind: "auth-loading" });
  const lastTargetRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "auth-loading" });

    const [{ data: sessionData }, onboardingSeen] = await Promise.all([
      supabase.auth.getSession(),
      getOnboardingSeen(),
    ]);
    if (__DEV__) {
      console.log("[auth-gate][index:load:getSession]", {
        sessionPresent: Boolean(sessionData.session),
        userId: sessionData.session?.user?.id ?? null,
        onboardingSeen,
      });
    }

    const session = sessionData.session ?? null;
    if (!session) {
      setState({ kind: "no-session", onboardingSeen });
      return;
    }

    setState({ kind: "profile-loading", session });

    const syncResponse = await syncSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (!syncResponse.ok) {
      setState({
        kind: "profile-fetch-failed",
        session,
        message: syncResponse.errorText ?? `SYNC HTTP ${syncResponse.status}`,
      });
      return;
    }

    const response = await fetchProfileMe();
    if (!response.ok) {
      setState({
        kind: "profile-fetch-failed",
        session,
        message: response.errorText ?? `HTTP ${response.status}`,
      });
      return;
    }

    const accountTypeRaw = response.data?.account_type;
    const accountType =
      typeof accountTypeRaw === "string" ? accountTypeRaw.toLowerCase().trim() : null;

    if (accountType === "club") {
      setState({ kind: "club", session });
      return;
    }

    if (accountType === "athlete") {
      setState({ kind: "athlete", session });
      return;
    }

    if (accountType === "fan") {
      setState({ kind: "fan", session });
      return;
    }

    setState({ kind: "missing-role", session });
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    void load();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (__DEV__) {
        console.log("[auth-gate][index:onAuthStateChange]", {
          event,
          sessionPresent: Boolean(session),
          userId: session?.user?.id ?? null,
        });
      }
      if (pathname !== "/") return;
      void load();
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [load, pathname]);

  const redirectTarget = useMemo(() => {
    if (pathname !== "/") return null;

    switch (state.kind) {
      case "no-session":
        return getRouteForNoSession(state.onboardingSeen);
      case "missing-role":
        return "/(onboarding)/choose-role";
      case "club":
        return "/(tabs)/feed";
      case "athlete":
        return "/(tabs)/feed";
      case "fan":
        return "/(tabs)/feed";
      default:
        return null;
    }
  }, [pathname, state]);

  useEffect(() => {
    if (!redirectTarget) {
      lastTargetRef.current = null;
      return;
    }

    if (lastTargetRef.current === redirectTarget) return;
    lastTargetRef.current = redirectTarget;
    router.replace(redirectTarget as any);
  }, [redirectTarget, router]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[auth-gate][index:state]", {
      pathname,
      stateKind: state.kind,
      redirectTarget,
      showingLoading: state.kind === "auth-loading" || state.kind === "profile-loading",
    });
  }, [pathname, redirectTarget, state.kind]);

  if (state.kind === "auth-loading" || state.kind === "profile-loading") {
    return <LoadingScreen />;
  }

  if (state.kind === "profile-fetch-failed") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          gap: 12,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.colors.text,
            textAlign: "center",
          }}
        >
          Profilo non disponibile
        </Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center", lineHeight: 22 }}>
          Il profilo non è stato caricato correttamente. Questo errore non viene trattato come
          utente senza ruolo.
        </Text>
        <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{state.message}</Text>
        <Pressable
          onPress={() => {
            void load();
          }}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: theme.colors.background,
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return <LoadingScreen />;
}
