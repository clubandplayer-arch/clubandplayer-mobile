import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

function devLog(message: string, data?: unknown) {
  if (!__DEV__) return;
  if (typeof data === "undefined") {
    console.log(`[push] ${message}`);
    return;
  }
  console.log(`[push] ${message}`, data);
}

export function arePushNotificationsSupported(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export async function getPushPermissionsStatus(): Promise<Notifications.PermissionStatus | null> {
  try {
    if (!arePushNotificationsSupported()) return null;

    const settings = await Notifications.getPermissionsAsync();
    return settings.status;
  } catch (error) {
    devLog("getPermissionsAsync failed", String(error));
    return null;
  }
}

export async function requestPushPermissions(): Promise<Notifications.PermissionStatus | null> {
  try {
    if (!arePushNotificationsSupported()) return null;

    const current = await Notifications.getPermissionsAsync();
    if (current.status === "granted") return current.status;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.status;
  } catch (error) {
    devLog("requestPermissionsAsync failed", String(error));
    return null;
  }
}

function getExpoProjectId(): string | null {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return null;
  }

  return projectId;
}

export async function getExpoPushTokenSafely(): Promise<string | null> {
  try {
    if (!arePushNotificationsSupported()) {
      devLog("push not supported on this platform");
      return null;
    }

    const status = await requestPushPermissions();
    if (status !== "granted") {
      devLog("push permission not granted", { status });
      return null;
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
      devLog("missing Expo projectId (eas)");
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const value = token?.data;

    if (typeof value !== "string" || value.trim().length === 0) {
      devLog("empty Expo push token returned");
      return null;
    }

    return value;
  } catch (error) {
    devLog("getExpoPushTokenSafely failed", String(error));
    return null;
  }
}
