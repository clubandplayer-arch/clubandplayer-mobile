import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "./api";
import { getExpoPushTokenSafely } from "./pushNotifications";
import { supabase } from "./supabase";

type RegisterPushTokenPayload = {
  token: string;
  platform: string;
  deviceId?: string;
};

function getOptionalDeviceId(): string | undefined {
  const candidate =
    (Constants as { installationId?: unknown }).installationId ??
    (Constants as { sessionId?: unknown }).sessionId ??
    null;

  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export async function registerPushToken(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
      return;
    }

    const token = await getExpoPushTokenSafely();
    if (!token) return;

    const deviceId = getOptionalDeviceId();
    const payload: RegisterPushTokenPayload = {
      token,
      platform: Platform.OS,
      ...(deviceId ? { deviceId } : {}),
    };

    const response = await apiFetch<{ ok?: boolean }>("/api/push-tokens", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (__DEV__ && !response.ok) {
      console.log("[push][register][warn]", {
        status: response.status,
        errorText: response.errorText ?? null,
      });
    }
  } catch (error) {
    if (__DEV__) {
      console.log("[push][register][error]", String(error));
    }
  }
}
