import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export type Profile = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  sport: string | null;
  role: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  account_type: string | null;
  type: string | null;
  verified_until: string | null;
  certified: boolean | null;
  certification_status: string | null;
  is_verified: boolean | null;
};

const PROFILE_SELECT = "*";

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(v)) return true;
    if (["false", "0", "no", "n"].includes(v)) return false;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  try {
    return String(value);
  } catch {
    return null;
  }
}

function normalizeProfile(row: any): Profile | null {
  const id = asString(row?.id);
  if (!id) return null;
  return {
    id,
    user_id: asString(row?.user_id),
    full_name: asString(row?.full_name),
    display_name: asString(row?.display_name),
    avatar_url: asString(row?.avatar_url),
    bio: asString(row?.bio),
    sport: asString(row?.sport),
    role: asString(row?.role),
    city: asString(row?.city),
    province: asString(row?.province),
    region: asString(row?.region),
    country: asString(row?.country),
    account_type: asString(row?.account_type),
    type: asString(row?.type),
    verified_until: asString(row?.verified_until),
    certified: asBoolean(row?.certified),
    certification_status: asString(row?.certification_status),
    is_verified: asBoolean(row?.is_verified),
  };
}

export async function resolveProfileByAuthorId(
  authorId: string,
  client: SupabaseClient = supabase,
): Promise<Profile | null> {
  const result = await resolveProfileByAuthorIdDetailed(authorId, client);
  return result.profile;
}

export async function resolveProfileByAuthorIdDetailed(
  authorId: string,
  client: SupabaseClient = supabase,
): Promise<{ profile: Profile | null; error: string | null }> {
  if (!authorId) return { profile: null, error: null };

  try {
    const { data: byUserId, error: userError } = await client
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("user_id", authorId)
      .maybeSingle();

    if (userError) {
      return { profile: null, error: userError.message || String(userError) };
    }

    if (byUserId) {
      return { profile: normalizeProfile(byUserId), error: null };
    }

    const { data: byProfileId, error: profileError } = await client
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", authorId)
      .maybeSingle();

    if (profileError) {
      return { profile: null, error: profileError.message || String(profileError) };
    }

    return { profile: normalizeProfile(byProfileId), error: null };
  } catch (error) {
    return { profile: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function resolveProfilesByAuthorIds(
  authorIds: string[],
  client: SupabaseClient = supabase,
): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  const ids = Array.from(new Set(authorIds.filter(Boolean)));
  if (!ids.length) return map;

  const [byUserId, byProfileId] = await Promise.all([
    client.from("profiles").select(PROFILE_SELECT).in("user_id", ids),
    client.from("profiles").select(PROFILE_SELECT).in("id", ids),
  ]);

  const push = (row: any) => {
    const normalized = normalizeProfile(row);
    if (!normalized) return;
    map.set(normalized.id, normalized);
    if (normalized.user_id) {
      map.set(normalized.user_id, normalized);
    }
  };

  if (!byUserId.error && Array.isArray(byUserId.data)) byUserId.data.forEach(push);
  if (!byProfileId.error && Array.isArray(byProfileId.data)) byProfileId.data.forEach(push);

  return map;
}
