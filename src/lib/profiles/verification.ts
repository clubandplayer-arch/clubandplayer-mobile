import type { SupabaseClient } from "@supabase/supabase-js";

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  try {
    return String(value);
  } catch {
    return null;
  }
}

export async function fetchClubVerificationMap(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (!profileIds.length) return map;

  const { data, error } = await supabase
    .from("club_verification_requests")
    .select("profile_id")
    .in("profile_id", profileIds)
    .eq("status", "approved")
    .in("payment_status", ["paid", "waived"])
    .gt("verified_until", new Date().toISOString());

  if (error || !Array.isArray(data)) return map;

  for (const row of data) {
    const profileId = asString((row as any)?.profile_id);
    if (profileId) {
      map.set(profileId, true);
    }
  }

  return map;
}
