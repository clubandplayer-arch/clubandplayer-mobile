import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { CrashBoundary } from "../src/components/CrashBoundary";
import { supabase } from "../src/lib/supabase";
import { fetchProfileMe, fetchWhoami, type ProfileMe, type WhoamiResponse } from "../src/lib/api";
import {
  getAuthBootstrapState,
  getDashboardOnboardingSeen,
  getGuestOnboardingSeen,
  subscribeDashboardOnboardingSeen,
  subscribeGuestOnboardingSeen,
} from "../src/lib/authFlow";
import { theme } from "../src/theme";

function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <ActivityIndicator />
      {message ? <Text style={{ marginTop: 12, color: theme.colors.muted, textAlign: "center" }}>{message}</Text> : null}
    </View>
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const [fontsLoaded] = useFonts({ Righteous: require("../assets/fonts/Righteous-Regular.ttf") });
  const [session, setSession] = useState<Session | null>(null);
  const [guestOnboardingSeen, setGuestOnboardingSeen] = useState<boolean | null>(null);
  const [dashboardOnboardingSeen, setDashboardOnboardingSeen] = useState<boolean>(false);
  const [whoami, setWhoami] = useState<WhoamiResponse | null>(null);
  const [profile, setProfile] = useState<ProfileMe | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const lastTargetRef = useRef<string | null>(null);
  const sessionKey = session?.access_token ?? session?.user?.id ?? "guest";

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const [{ data }, seen] = await Promise.all([supabase.auth.getSession(), getGuestOnboardingSeen()]);
        if (!mounted) return;

        if (__DEV__) {
          console.log("[rootLayout] init", {
            sessionPresent: Boolean(data.session),
            userId: data.session?.user?.id ?? null,
            guestOnboardingSeen: seen,
          });
        }

        setSession(data.session ?? null);
        setGuestOnboardingSeen(seen);
      } catch (error: any) {
        if (!mounted) return;
        setSession(null);
        setGuestOnboardingSeen(true);
        setBootstrapError(error?.message ?? "Bootstrap init failed");
        if (__DEV__) {
          console.log("[rootLayout] init error", error?.message ?? error);
        }
      } finally {
        if (mounted) setBootstrapped(true);
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, next) => {
      if (__DEV__) {
        console.log("[rootLayout] onAuthStateChange", {
          event,
          pathname,
          sessionPresent: Boolean(next),
          userId: next?.user?.id ?? null,
        });
      }

      setSession(next);
      setBootstrapError(null);
      lastTargetRef.current = null;

      if (!next?.user?.id) {
        setWhoami(null);
        setProfile(null);
        setDashboardOnboardingSeen(false);
        setBootstrapError(null);
        setSessionResolved(true);
        return;
      }

      setSessionResolved(false);
    });

    const unsubGuest = subscribeGuestOnboardingSeen((seen) => {
      if (__DEV__) {
        console.log("[rootLayout] guest onboarding changed", { seen });
      }
      setGuestOnboardingSeen(seen);
      lastTargetRef.current = null;
    });

    const unsubDashboard = subscribeDashboardOnboardingSeen((userId, seen) => {
      if (__DEV__) {
        console.log("[rootLayout] dashboard onboarding changed", { userId, seen, currentUserId: session?.user?.id ?? null });
      }
      if (userId === session?.user?.id) {
        setDashboardOnboardingSeen(seen);
        lastTargetRef.current = null;
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      unsubGuest();
      unsubDashboard();
    };
  }, [pathname, sessionKey]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[rootLayout] pathname", { pathname, sessionPresent: Boolean(session), userId: session?.user?.id ?? null });
    }
  }, [pathname, session, session?.user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadSessionState = async () => {
      if (!session?.user?.id) {
        if (__DEV__) {
          console.log("[rootLayout] loadSessionState: no session, resolving immediately", {
            pathname,
            sessionPresent: false,
          });
        }
        setWhoami(null);
        setProfile(null);
        setDashboardOnboardingSeen(false);
        setBootstrapError(null);
        setSessionResolved(true);
        return;
      }

      setSessionResolved(false);
      setBootstrapError(null);

      try {
        if (__DEV__) {
          console.log("[rootLayout] loadSessionState:start", {
            userId: session.user.id,
            pathname,
          });
        }

        const [whoamiResponse, profileResponse, dashboardSeen] = await Promise.all([
          withTimeout(fetchWhoami(), 8000, "fetchWhoami"),
          withTimeout(fetchProfileMe(), 8000, "fetchProfileMe"),
          withTimeout(getDashboardOnboardingSeen(session.user.id), 3000, "getDashboardOnboardingSeen"),
        ]);

        if (cancelled) return;

        if (__DEV__) {
          console.log("[rootLayout] loadSessionState:responses", {
            whoamiOk: whoamiResponse.ok,
            whoamiRole: whoamiResponse.ok ? whoamiResponse.data?.role ?? null : null,
            profileOk: profileResponse.ok,
            profileAccountType: profileResponse.ok ? profileResponse.data?.account_type ?? null : null,
            dashboardSeen,
          });
        }

        setWhoami(whoamiResponse.ok ? whoamiResponse.data ?? null : null);
        setProfile(profileResponse.ok ? profileResponse.data ?? null : null);
        setDashboardOnboardingSeen(dashboardSeen);

        if (!whoamiResponse.ok || !profileResponse.ok) {
          setBootstrapError(whoamiResponse.errorText ?? profileResponse.errorText ?? "Bootstrap API failure");
        }
      } catch (error: any) {
        if (cancelled) return;
        setWhoami(null);
        setProfile(null);
        setDashboardOnboardingSeen(false);
        setBootstrapError(error?.message ?? "Bootstrap failure");
        if (__DEV__) {
          console.log("[rootLayout] loadSessionState:error", error?.message ?? error);
        }
      } finally {
        if (!cancelled) {
          setSessionResolved(true);
          if (__DEV__) {
            console.log("[rootLayout] loadSessionState:done", {
              userId: session.user.id,
              bootstrapError,
            });
          }
        }
      }
    };

    void loadSessionState();
    return () => {
      cancelled = true;
    };
  }, [pathname, sessionKey]);

  const redirectTarget = useMemo(() => {
    if (!bootstrapped || guestOnboardingSeen === null || !sessionResolved) {
      if (__DEV__) {
        console.log("[rootLayout] redirect deferred", {
          bootstrapped,
          guestOnboardingSeen,
          sessionResolved,
          pathname,
        });
      }
      return null;
    }

    const guestOnboardingRoute = "/onboarding";
    const isGuestWelcome = pathname === guestOnboardingRoute;
    const isAuthRoute = pathname === "/callback" || pathname === "/login" || pathname === "/signup";
    const isChooseRoleRoute = pathname === "/onboarding/choose-role";
    const isDashboardOnboardingRoute = pathname === "/onboarding";
    const isPlayerProfileRoute = pathname === "/player/profile";
    const isClubProfileRoute = pathname === "/club/profile";

    if (!session) {
      const guestTarget = !guestOnboardingSeen ? guestOnboardingRoute : !isAuthRoute ? "/login" : null;
      if (__DEV__) {
        console.log("[rootLayout] redirect decision guest", {
          pathname,
          segments,
          guestOnboardingRoute,
          isGuestWelcome,
          guestOnboardingSeen,
          target: guestTarget,
          expectedPathname: guestTarget,
        });
      }
      return guestTarget;
    }

    if (bootstrapError) {
      const fallbackTarget = isAuthRoute ? null : "/login";
      if (__DEV__) {
        console.log("[rootLayout] redirect decision bootstrap fallback", {
          pathname,
          userId: session.user.id,
          bootstrapError,
          target: fallbackTarget,
          expectedPathname: fallbackTarget,
        });
      }
      return fallbackTarget;
    }

    const state = getAuthBootstrapState({ whoami, profile, dashboardOnboardingSeen });

    let target: string | null = null;
    if (state.shouldChooseRole && !isChooseRoleRoute) target = "/onboarding/choose-role";
    else if (!state.shouldChooseRole && isChooseRoleRoute) target = state.accountType === "club" ? "/club/profile" : "/player/profile";
    else if (state.shouldCompleteAthleteProfile && !isPlayerProfileRoute) target = "/player/profile";
    else if (state.accountType === "club" && !state.shouldShowLoggedInOnboarding && isAuthRoute) target = "/club/profile";
    else if (state.accountType === "athlete" && !state.shouldCompleteAthleteProfile && !state.shouldShowLoggedInOnboarding && isAuthRoute) target = "/feed";
    else if (state.shouldShowLoggedInOnboarding && !isDashboardOnboardingRoute) target = "/onboarding";
    else if (!state.shouldShowLoggedInOnboarding && isDashboardOnboardingRoute) target = state.accountType === "club" ? "/club/profile" : "/feed";
    else if (state.accountType === "club" && isPlayerProfileRoute) target = "/club/profile";
    else if (state.accountType === "athlete" && isClubProfileRoute) target = state.shouldCompleteAthleteProfile ? "/player/profile" : "/feed";

    if (__DEV__) {
      console.log("[rootLayout] redirect decision authed", {
        pathname,
        userId: session.user.id,
        target,
        expectedPathname: target,
        state,
      });
    }

    return target;
  }, [bootstrapped, bootstrapError, dashboardOnboardingSeen, guestOnboardingSeen, pathname, profile, segments, session, sessionResolved, whoami]);

  useEffect(() => {
    if (!redirectTarget) {
      lastTargetRef.current = null;
      return;
    }
    if (lastTargetRef.current === redirectTarget) {
      if (__DEV__) {
        console.log("[rootLayout] skip duplicate redirect", { redirectTarget, pathname });
      }
      return;
    }
    lastTargetRef.current = redirectTarget;
    if (__DEV__) {
      console.log("[rootLayout] router.replace", { from: pathname, to: redirectTarget, expectedPathname: redirectTarget });
    }
    router.replace(redirectTarget as any);
  }, [pathname, redirectTarget, router]);

  if (!fontsLoaded || !bootstrapped || guestOnboardingSeen === null) {
    return <LoadingScreen message="Bootstrap auth in corso…" />;
  }

  if (!sessionResolved) {
    return <LoadingScreen message={session ? "Verifico sessione e profilo…" : "Verifico stato accesso…"} />;
  }

  return (
    <CrashBoundary>
      <Stack screenOptions={{ headerTitleStyle: { fontFamily: theme.fonts.brand, color: theme.colors.primary }, headerTintColor: theme.colors.primary, headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/choose-role" options={{ headerShown: true, title: "Scegli ruolo" }} />
        <Stack.Screen name="(dashboard)/onboarding" options={{ headerShown: true, title: "Onboarding" }} />
        <Stack.Screen name="posts/[id]" options={{ headerShown: true, title: "Post" }} />
        <Stack.Screen name="opportunities/new" options={{ headerShown: true, title: "Crea opportunità" }} />
        <Stack.Screen name="opportunities/[id]" options={{ headerShown: true, title: "Opportunità" }} />
        <Stack.Screen name="opportunities/[id]/edit" options={{ headerShown: true, title: "Modifica opportunità" }} />
        <Stack.Screen name="clubs/[id]" options={{ headerShown: true, title: "Club" }} />
        <Stack.Screen name="players/[id]" options={{ headerShown: true, title: "Player" }} />
        <Stack.Screen name="club/profile" options={{ headerShown: true, title: "Profilo Club" }} />
        <Stack.Screen name="player/profile" options={{ headerShown: true, title: "Profilo" }} />
        <Stack.Screen name="applications/index" options={{ headerShown: false }} />
        <Stack.Screen name="my/applications" options={{ headerShown: true, title: "Le mie candidature" }} />
        <Stack.Screen name="club/applications" options={{ headerShown: true, title: "Candidature ricevute" }} />
        <Stack.Screen name="opportunities/[id]/applications" options={{ headerShown: true, title: "Candidati" }} />
      </Stack>
    </CrashBoundary>
  );
}
