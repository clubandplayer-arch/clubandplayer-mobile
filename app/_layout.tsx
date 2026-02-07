import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";
import {
  getOnboardingSeen,
  subscribeOnboardingSeen,
} from "../src/lib/onboarding";
import { setCrashLog } from "../src/lib/crashlog";
import { CrashBoundary } from "../src/components/CrashBoundary";

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);

  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [{ data }, seen] = await Promise.all([
        supabase.auth.getSession(),
        getOnboardingSeen(),
      ]);

      if (!isMounted) return;

      setSession(data.session ?? null);
      setOnboardingSeen(seen);
      setIsReady(true);
    };

    load();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        lastTargetRef.current = null;
      }
    );

    const unsubscribeOnboarding = subscribeOnboardingSeen((seen) => {
      setOnboardingSeen(seen);
      lastTargetRef.current = null;
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      unsubscribeOnboarding();
    };
  }, []);

  useEffect(() => {
    if (!isReady || onboardingSeen === null) return;

    const currentGroup = segments[0]; // "(tabs)" | "(auth)" | "(onboarding)" | undefined
    const inTabs = currentGroup === "(tabs)";
    const inCallback = pathname === "/callback"; // expo-router strips groups in pathname

    let target: string | null = null;

    if (session) {
      if (!inTabs) target = "/(tabs)/feed";
    } else {
      if (inCallback) {
        target = null;
      } else if (!onboardingSeen) {
        target = "/(onboarding)";
      } else {
        target = "/(auth)/login";
      }
    }

    if (!target) {
      lastTargetRef.current = null;
      return;
    }

    // Prevent loops / repeated replaces
    if (lastTargetRef.current === target) return;

    // If we're already in the correct group, avoid over-navigating
    if (session && inTabs) return;
    if (!session && !inCallback) {
      const inAuth = currentGroup === "(auth)";
      const inOnboarding = currentGroup === "(onboarding)";
      if ((target === "/(auth)/login" && inAuth) || (target === "/(onboarding)" && inOnboarding)) {
        return;
      }
    }

    lastTargetRef.current = target;
    router.replace(target);
  }, [isReady, onboardingSeen, pathname, router, segments, session]);

  if (!isReady || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: any }).ErrorUtils;
    const defaultHandler = errorUtils?.getGlobalHandler?.();
    type UnhandledRejectionEvent = { reason?: unknown };

    if (errorUtils?.setGlobalHandler) {
      errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        void setCrashLog({
          message: error?.message || "Unknown error",
          stack: error?.stack ?? null,
          name: error?.name ?? null,
        });
        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }

    const previousUnhandled = (globalThis as typeof globalThis & {
      onunhandledrejection?: ((event: UnhandledRejectionEvent) => void) | null;
    }).onunhandledrejection;

    (globalThis as typeof globalThis & {
      onunhandledrejection?: ((event: UnhandledRejectionEvent) => void) | null;
    }).onunhandledrejection = (event) => {
      const reason = event?.reason;
      const error =
        reason instanceof Error ? reason : new Error(String(reason ?? "Unknown rejection"));
      void setCrashLog({
        message: error.message || "Unhandled rejection",
        stack: error.stack ?? null,
        name: error.name ?? null,
      });
      if (previousUnhandled) {
        previousUnhandled(event);
      }
    };

    return () => {
      if (errorUtils?.setGlobalHandler && defaultHandler) {
        errorUtils.setGlobalHandler(defaultHandler);
      }
      (globalThis as typeof globalThis & {
        onunhandledrejection?: ((event: UnhandledRejectionEvent) => void) | null;
      }).onunhandledrejection = previousUnhandled ?? null;
    };
  }, []);

  return (
    <CrashBoundary>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </CrashBoundary>
  );
}
