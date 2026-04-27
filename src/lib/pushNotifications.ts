import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { useEffect, useRef } from "react";
import { disablePushToken, registerPushToken } from "./api";

const STORAGE_DEVICE_ID_KEY = "push:device-id";
const STORAGE_LAST_TOKEN_KEY = "push:last-token";
const STORAGE_LAST_REGISTER_AT_KEY = "push:last-register-at";
const REGISTER_DEBOUNCE_MS = 4_000;
const REGISTER_RETRY_DELAYS_MS = [1_000, 2_500, 5_000] as const;

function isExpoPushToken(value: string): boolean {
  const v = value.trim();
  return /^Expo(nent)?PushToken\[[^\]]+\]$/i.test(v);
}

function tokenFingerprint(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "n/a";
  return trimmed.slice(-6);
}

async function getStableDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_DEVICE_ID_KEY);
  if (existing && existing.trim().length > 0) return existing;
  const generated = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(STORAGE_DEVICE_ID_KEY, generated);
  return generated;
}

async function withRetry(task: () => Promise<boolean>): Promise<boolean> {
  if (await task()) return true;
  for (const delay of REGISTER_RETRY_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (await task()) return true;
  }
  return false;
}

export function usePushNotificationsSync(userId: string | null) {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastAttemptRef = useRef<number>(0);
  const tokenListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    const runRegisterFlow = async (reason: "login" | "foreground" | "token_refresh") => {
      if (!active) return;
      const now = Date.now();
      if (now - lastAttemptRef.current < REGISTER_DEBOUNCE_MS) return;
      lastAttemptRef.current = now;

      const deviceId = await getStableDeviceId();
      const permission = await Notifications.getPermissionsAsync();
      let finalStatus = permission.status;
      if (finalStatus !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }

      if (finalStatus !== "granted") {
        await withRetry(async () => {
          const response = await disablePushToken({ device_id: deviceId });
          return response.ok;
        });
        console.log("[push][permission-denied]", { userId, deviceId });
        return;
      }

      const tokenResult = await Notifications.getExpoPushTokenAsync();
      const token = String(tokenResult.data ?? "").trim();
      if (!isExpoPushToken(token)) {
        console.log("[push][invalid-token]", { userId, deviceId, tokenTail: tokenFingerprint(token) });
        return;
      }

      const platform = Platform.OS === "ios" ? "ios" : "android";
      const tokenTail = tokenFingerprint(token);
      const previousToken = (await AsyncStorage.getItem(STORAGE_LAST_TOKEN_KEY)) ?? "";
      const unchanged = previousToken.trim() === token;

      const ok = await withRetry(async () => {
        const response = await registerPushToken({
          token,
          platform,
          device_id: deviceId,
        });
        return response.ok;
      });

      if (ok) {
        await AsyncStorage.multiSet([
          [STORAGE_LAST_TOKEN_KEY, token],
          [STORAGE_LAST_REGISTER_AT_KEY, String(Date.now())],
        ]);
      }

      console.log("[push][register]", {
        userId,
        deviceId,
        tokenTail,
        reason,
        unchanged,
        ok,
      });
    };

    void runRegisterFlow("login");

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      if (prevState.match(/inactive|background/) && nextState === "active") {
        void runRegisterFlow("foreground");
      }
    });

    tokenListenerRef.current = Notifications.addPushTokenListener((event) => {
      if (!active) return;
      const token = String(event?.data ?? "").trim();
      if (!isExpoPushToken(token)) return;
      void runRegisterFlow("token_refresh");
    });

    return () => {
      active = false;
      appStateSub.remove();
      tokenListenerRef.current?.remove();
      tokenListenerRef.current = null;
    };
  }, [userId]);
}

export async function disablePushForCurrentDevice(params: { userId?: string | null; token?: string | null } = {}) {
  const deviceId = await getStableDeviceId();
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const ok = await withRetry(async () => {
    const response = token
      ? await disablePushToken({ token, device_id: deviceId })
      : await disablePushToken({ device_id: deviceId });
    return response.ok;
  });

  console.log("[push][disable]", {
    userId: params.userId ?? null,
    deviceId,
    tokenTail: tokenFingerprint(token),
    ok,
  });
}
