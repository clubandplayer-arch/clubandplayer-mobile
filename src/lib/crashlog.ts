import AsyncStorage from "@react-native-async-storage/async-storage";

const CRASH_LOG_KEY = "cp_last_crash";

export type CrashLog = {
  message: string;
  stack?: string | null;
  name?: string | null;
  time: string;
};

export async function setCrashLog(input: {
  message: string;
  stack?: string | null;
  name?: string | null;
  time?: string;
}): Promise<void> {
  const payload: CrashLog = {
    message: input.message,
    stack: input.stack ?? null,
    name: input.name ?? null,
    time: input.time ?? new Date().toISOString(),
  };

  await AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify(payload));
}

export async function getCrashLog(): Promise<CrashLog | null> {
  const raw = await AsyncStorage.getItem(CRASH_LOG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CrashLog;
  } catch {
    return null;
  }
}

export async function clearCrashLog(): Promise<void> {
  await AsyncStorage.removeItem(CRASH_LOG_KEY);
}
