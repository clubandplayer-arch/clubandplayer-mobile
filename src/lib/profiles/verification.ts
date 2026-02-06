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
  clubIds: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (!clubIds.length) return map;

  const { data, error } = await supabase
    .from("club_verification_requests_view")
    .select("club_id,is_verified")
    .in("club_id", clubIds);

  if (error || !Array.isArray(data)) return map;

  for (const row of data) {
    const clubId = asString((row as any)?.club_id);
    if (clubId) {
      map.set(clubId, Boolean((row as any)?.is_verified));
    }
  }

  return map;
}
